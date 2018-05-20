module.exports = {
  // National Rail API key
  apiKey: process.env.APIKEY,
  port: process.env.PORT || 3000,

  // Optional
  sumoUrl: process.env.SUMO_URL,
  mashapeProxySecret: process.env.MASHAPE_PROXY_SECRET
};
