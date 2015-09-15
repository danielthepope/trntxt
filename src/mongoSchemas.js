module.exports = function(mongoose) {
	return {
		hit: mongoose.Schema({
			agent: Object,
			url: String,
			date: { type: Date, default: Date.now }
		})
	};
}
