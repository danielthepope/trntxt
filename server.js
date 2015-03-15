var http = require('http');
var port = process.env.PORT || 1337;

http.createServer(function(req, res) {
	res.writeHead(200, { 'Content-Type': 'text/plain' });
	res.end('One day this will be a really swish train times website that will work over GPRS.\n');
}).listen(port);
