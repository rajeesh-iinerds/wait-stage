'use strict'

const jsonQuery = require('json-query');
var AWS = require('aws-sdk');

AWS.config.apiVersions = {
  cloudformation: '2010-05-15',
  // other service API versions
};

var cloudformation = new AWS.CloudFormation();
var codepipeline = new AWS.CodePipeline();
var apigateway = new AWS.APIGateway();

exports.handler = function(event, context, callback) {

    var jobId = event["CodePipeline.job"].id;
    // Retrieve the value of UserParameters from the Lambda action configuration in AWS CodePipeline, in this case a URL which will be
    // health checked by this function.
    var stackName = event["CodePipeline.job"].data.actionConfiguration.configuration.UserParameters; 
    //var stackName = event["CodePipeline.job"].data.inputArtifacts[0].name;

    // Retrieve the value of UserParameters from the Lambda action configuration in AWS CodePipeline, in this case a URL which will be
    // health checked by this function.
    // var stackParams = {
    //     StackName: stackName,
    //     TemplateStage: 'Processed'
    // };
    
    var stackParams = {
        StackName: stackName || '',
        TemplateStage: 'Processed'
    };

    var restApiIdVal;

    var putJobSuccess = function(message) {
      
        var cpParams = {
            jobId: jobId
        };

        console.log("Job Id: ", jobId);
        // console.log("Stack Name: ", stackName);
        codepipeline.putJobSuccessResult(cpParams, function(err, data) {
            if (err) {
                callback(err);
            }
            else {
                cloudformation.getTemplate(stackParams, function(err, data) {
                    if (err) { 
                        console.log(err, err.stack);
                    }
                    else {
                        console.log(data);
                        var templateBody = data.TemplateBody;
                        var jsonTemplate = JSON.parse(templateBody);
                        var restApiName = jsonTemplate.Resources.CCTApi.Properties.Name;
                        var apiListParams = {
                            limit: 20,   
                        };
                        
                        apigateway.getRestApis(apiListParams, function(err, data) {
                            if (err) {
                                //console.log(err, err.stack) 
                            }    
                            else {
                                //console.log(data); 
                                var currentApiData = jsonQuery('items[name=' + restApiName+ '].id', {
                                    data: data
                                }) 

                                restApiIdVal = currentApiData.value;
                                console.log("Rest API Id: ", restApiIdVal);
                                var apiStageParams = {
                                    restApiId: restApiIdVal /* required */
                                    //limit: 0,   
                                };

                                apigateway.getStages(apiStageParams, function(err, data) {
                                    console.log("Stages: ", data);
                                    if (err) {
                                        console.log(err, err.stack)
                                    }    
                                    // an error occurred
                                    else {   
                                
                                        //Stage stage info.
                                        var deploymentIdOfStage = jsonQuery('item[stageName=Stage].deploymentId', {
                                            data: data
                                        })
                                        var deploymentIdOfStageVal = deploymentIdOfStage.value;

                                        //Dev Stage info.
                                        var deploymentIdOfDev = jsonQuery('item[stageName=dev].deploymentId', {
                                            data: data
                                        })
                                        var deploymentIdOfDevVal = deploymentIdOfDev.value;

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

                                        

                                        // Define Stage Parameter list.    
                                        // The default stage "Stage" creaetd by the SAM needs to be deleted.
                                        // Two new stages need to be created as "staging" and "prod" respectively. 
                                        
                                        // Delete Param list of "Stage" stage.
                                        var deleteStageParams = {
                                            restApiId: restApiIdVal, /* required */
                                            stageName: 'Stage' /* required */
                                        };

                                        // Delete Param list of "Stage" stage.
                                        var deleteDevParams = {
                                            restApiId: restApiIdVal, /* required */
                                            stageName: 'dev' /* required */
                                        };    

                                        // Create Param list of "Staging" stage.
                                        var createStagingStageParams = {
                                            deploymentId: deploymentIdOfStageVal, /* required */
                                            restApiId: restApiIdVal, /* required */
                                            stageName: 'staging', /* required */
                                            variables: {
                                            'version': 'staging'
                                            }
                                        };

                                        // Create Param list of "Prod" stage.    
                                        var createProdStageParams = {
                                            deploymentId: deploymentIdOfStageVal, /* required */
                                            restApiId: restApiIdVal, /* required */
                                            stageName: 'prod', /* required */
                                            variables: {
                                            'version': 'prod'
                                            }
                                        };

                                        console.log("Staging Stage: ", deploymentIdOfStagingVal);
                                        // Create "staging" Stage.
                                        if (deploymentIdOfStagingVal === null) {
                                            apigateway.createStage(createStagingStageParams, function(err, data) {
                                                if (err) {
                                                    console.log(err, err.stack); // an error occurred
                                                }    
                                                else{
                                                    console.log(data);           // successful response 
                                                }   
                                            });
                                        }     

                                        if (deploymentIdOfDevVal != null) {
                                            apigateway.deleteStage(deleteDevParams, function(err, data) {
                                                if (err) {
                                                    console.log(err, err.stack); // an error occurred
                                                }    
                                                else{
                                                    console.log(data);           // successful response    
                                                }   
                                            }); 
                                        }

                                        console.log("Prod Stage: ", deploymentIdOfProdVal);
                                        // Create "prod" Stage.
                                        if (deploymentIdOfProdVal === null) {
                                            apigateway.createStage(createProdStageParams, function(err, data) {
                                                if (err) {
                                                    console.log(err, err.stack); // an error occurred
                                                }    
                                                else{
                                                    console.log(data);           // successful response 
                                                }   
                                            });
                                        }    

                                        // Delete the default stage "Stage" created by the build file.
                                        // A wrong and error stuff created by the SAM template.
                                        // We don't require it.
                                        if (deploymentIdOfStageVal != null) {
                                            apigateway.deleteStage(deleteStageParams, function(err, data) {
                                                if (err) {
                                                    console.log(err, err.stack); // an error occurred
                                                }    
                                                else{
                                                    console.log(data);           // successful response    
                                                }   
                                            }); 
                                        }
                                       
                                    }    
                                // console.log("Stage Message: " + util.inspect(stagesStagePresent.value, {depth: null})); 
                                });  
                            }    
                        });
                    }
                });
                callback(null, message);
            }    
        });    
    }    

    // Notify AWS CodePipeline of a failed job
    var putJobFailure = function(message) {
        var params = {
            jobId: jobId,
            failureDetails: {
                message: JSON.stringify(message),
                type: 'JobFailed',
                externalExecutionId: context.invokeid
            }
        };
        codepipeline.putJobFailureResult(params, function(err, data) {
            context.fail(message);      
        });
    };

    // Validate the URL passed in UserParameters
    if(!stackName) {
        putJobFailure('The UserParameters field must contain the Stack Name!');  
        return;
    }

    putJobSuccess('Success');
};