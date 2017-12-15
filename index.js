/**
 * @author Rajeesh <rajeesh.k@iinerds.com>
 * @version: 0.3
 */

'use strict'

const jsonQuery = require('json-query');
var AWS = require('aws-sdk');

/**
 * Define AWS API version
 */

AWS.config.apiVersions = {
  cloudformation: '2010-05-15',
  // other service API versions
};

var cloudformation = new AWS.CloudFormation();
var codepipeline = new AWS.CodePipeline();
var apigateway = new AWS.APIGateway();
var lammbda = new AWS.Lambda();

// Lambda handler start here.
exports.handler = function(event, context, callback) {

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
        if (err) {
            console.log(err, err.stack)
        }    
        // an error occurred
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
            
            /** Check for the Presence of Both the "staging" and "prod" stage.
             * The value is "body is evaluted by the "
             */

            if (deploymentIdOfProdVal && deploymentIdOfStagingVal) {
                    callback(null, {
                        statusCode: '200',
                        body: 'success',
                    });
            }
            
            callback(null, {
                        statusCode: '200',
                        body: 'failure',
            });
        }
    });            
}