/**
 * @author Rajeesh <rajeesh.k@iinerds.com>
 * @version: 0.2
 */

'use strict'

/**
 * Intiialize the required AWS API
 */
const jsonQuery = require('json-query');
var AWS = require('aws-sdk');
var apigateway = new AWS.APIGateway();

/**
 * Define AWS API version
 */
AWS.config.apiVersions = {
  cloudformation: '2010-05-15',
  // other service API versions
};

// Lambda handler starts here.
exports.handler = function(event, context, callback) {

    console.log(JSON.stringify(event));
    // API Id of the deployed API. Passed by the StepFunction!!
    var restApiIdVal = event.apiId;

    var apiStageParams = {
        restApiId: restApiIdVal /* required */
    };

    /** Get all the API list and Loop through the stages
     * Currently check only the "staging" and "prod" stages.
     * This need to be automated basd on the config values.
     */
    apigateway.getStages(apiStageParams, function(err, data) {
       // an error occurred
        if (err) {
            console.log(err, err.stack)
        }    
        
        else {   
            //Staging Stage info.    
            var deploymentIdOfStaging = jsonQuery('item[stageName=staging].deploymentId', {
                data: data
            })
            var deploymentIdOfStagingVal = deploymentIdOfStaging.value;

            //Production Stage info.
            var deploymentIdOfProd = jsonQuery('item[stageName=prod].deploymentId', {
                data: data
            })
            var deploymentIdOfProdVal = deploymentIdOfProd.value;

            /** 
             * Check for the Presence of Both the "staging" and "prod" stage.
             * The value in "body" is evaluted by the StepFunction: 
             * arn:aws:states:us-east-2:902849442700:stateMachine:WaitStage
             * Unless the both the "prod" and "staging" stages exists, this Lambda will be 
             * called by StepFunction in an infinite loop on an interval of 5 seconds.
             * Typically API stages takes maximum of 30 seconds to reflect the changes; 
             * so an around of maximum of SIX loop calls to this function.
             */
            if (deploymentIdOfProdVal && deploymentIdOfStagingVal) {
                callback(null, {
                    statusCode: '200',
                    body: 'success',
                    /** 
                    * This is a Hack. The SF Task requires the field to process for this Lambda.
                    * Need to study the InputPath, OutputPath and ResultPath properly 
                    * and pass between States.
                    */ 
                    apiId: restApiIdVal
                });
            }
            
            // Unless both "staging" and "prod" stages are present.
            callback(null, {
                statusCode: '200',
                body: 'failure',
                /** This is a Hack. The SF Task requires the field to process for this Lambda.
                 * Need to study the InputPath, OutputPath and ResultPath properly 
                 * and pass between States.
                 */ 
                apiId: restApiIdVal 
            });
        }
    });            
}