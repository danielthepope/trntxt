module.exports = {
  // National Rail API key
  apiKey: process.env.APIKEY,
  port: process.env.PORT || 3000,

  // Optional
  awsRegion: process.env.AWS_DEFAULT_REGION,
  awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID,
  awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  iconBucketName: process.env.TRNTXT_ICON_BUCKET,
  iconQueueUrl: process.env.TRNTXT_ICON_QUEUE,
  sumoUrl: process.env.SUMO_URL
};
