module.exports = function (mongoose) {
  return {
    hit: mongoose.Schema({
      agent: Object,
      url: String,
      fromStation: Object,
      toStation: Object,
      date: { type: Date, default: Date.now }
    })
  };
}
