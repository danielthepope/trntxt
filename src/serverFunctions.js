exports.getDeviceFromAgent = function(agentString) {
	var output = 'other';
	if (agentString.indexOf('Android') !== -1) output = 'android';
	else if (agentString.indexOf('iPhone OS') !== -1) output = 'ios';
	else if (agentString.indexOf('iPad') !== -1) output = 'ios';
	else if (agentString.indexOf('MSIE') !== -1) output = 'ie';
	else if (agentString.indexOf('Edge') !== -1) output = 'edge';
	else if (agentString.indexOf('Chrome') !== -1) output = 'android';
	else if (agentString.indexOf('rv:') !== -1) output = 'ie';
	console.log('Optimising output for ' + output + '\n');
	return output;
}