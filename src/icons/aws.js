const config = require('../trntxtconfig');
const AWS = require('aws-sdk');

AWS.config.update({
  region: config.awsRegion,
  accessKeyId: config.awsAccessKeyId,
  secretAccessKey: config.awsSecretAccessKey
});

const s3 = new AWS.S3({apiVersion: '2006-03-01'});
const sqs = new AWS.SQS({apiVersion: '2012-11-05'});

function isConfigured() {
  return (
    config.awsRegion &&
    config.awsAccessKeyId &&
    config.awsSecretAccessKey &&
    config.iconBucketName &&
    config.iconQueueUrl
  );
}

if (!isConfigured()) {
  console.log('AWS is not properly configured. Preemptive app icon generation disabled.');
}

function getObject(key, callback) {
  if (isConfigured()) {
    const params = {
      Bucket: config.iconBucketName,
      Key: key
    }
    s3.getObject(params, callback);
  } else {
    callback('aws is not configured.');
  }
}

function objectExists(key, callback) {
  if (!isConfigured()) return false;
  const params = {
    Bucket: config.iconBucketName,
    Key: key
  }
  s3.headObject(params, function(err, data) {
    if (err) callback(false);
    else callback(true);
  })
}

function putObject(key, data, callback) {
  if (isConfigured()){
    const params = {
      Body: data,
      Bucket: config.iconBucketName,
      Key: key
    };
    console.log(`putting object ${key}`);
    s3.putObject(params, callback);
  } else {
    callback('aws is not configured.');
  }
}

/**
 * @param {Object} message a Query or a Task
 */
function sendMessage(message) {
  if (isConfigured()) {
    const params = {
      MessageBody: message.toJson(),
      QueueUrl: config.iconQueueUrl
    }
    sqs.sendMessage(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else {
        console.log(params.MessageBody);
        console.log(data);           // successful response
      }
    });
  }
}

module.exports = {
  isConfigured,
  getObject,
  objectExists,
  putObject,
  sendMessage
}