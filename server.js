var http = require('http');
var requestListener = function (req, res) {
  res.writeHead(200);
  res.end('Hello, HTTP!\n');
};

var server = http.createServer(requestListener);

server.listen(process.env.PORT || 80, "0.0.0.0");
