module.exports = {
  apiKey: process.env.APIKEY,
  port: process.env.PORT || 3000,
  dbString: process.env.CUSTOMCONNSTR_DBSTRING,
  sumoUrl: process.env.SUMO_URL
};
