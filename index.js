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

    //var eventObj = JSON.parse(event);
    console.log("Got from StepFunction: " + event.input.apiId);

    //Retrieve the CodePipeline ID 

    /**
     * Retrieve the value of UserParameters from the Lambda action configuration in AWS CodePipeline, in this case a URL which will be
     * health checked by this function.
     */
    //var stackName = event["CodePipeline.job"].data.actionConfiguration.configuration.UserParameters; 

    // Define the Cloudformation stack parameters. The processed CF template need to be used.     
    var stackParams = {
        StackName: 'CICD-Test-Node-CFStackName',
        TemplateStage: 'Processed'
    };

    // REST Api Id of the deployed API.
    var restApiIdVal = 'dimwfyr6n5';

    var apiStageParams = {
        restApiId: restApiIdVal /* required */
        //limit: 0,   
    };

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
            
            //Check for the Stage creation.
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