var http = require('http'),
    url = require('url'),
    path = require('path'),
    fs = require('fs'),
    qs = require('querystring'),
    Enumerable = require('linq');

var mimeTypes = {
    "html": "text/html",
    "jpeg": "image/jpeg",
    "jpg": "image/jpeg",
    "png": "image/png",
    "js": "text/javascript",
    "css": "text/css"};

// Helpers

if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function (str){
    return this.slice(0, str.length) == str;
  };
}

if (typeof String.prototype.endsWith != 'function') {
  String.prototype.endsWith = function (str){
    return this.slice(-str.length) == str;
  };
}

// Actions

var HomeAction = "/";
var NewMessagesAction = "/NewMessages";
var SendMessageAction = "/SendMessage";
var RegisterAction = "/Register";

var messages = [ { message: "Bienvenidos al Chat de Difoosion", timestamp: (new Date).getTime() } ];
var buddies = [ ];

var requestListener = function (req, res) {
	var body = "";
	req.on("data", function(chunk){
		body += chunk;
	});

  	var uri = url.parse(req.url).pathname;
    var filename = path.join(process.cwd() + "\\static_files", uri);

    path.exists(filename, function(exists) {
        if ( filename.endsWith("\\") || !exists ) {
			if (req.url.startsWith(NewMessagesAction)) {
				res.writeHead(200, { 'Content-Type': 'application/json' }); 
				var newMessages = [];
				var timestamp = parseInt(req.url.substring(req.url.indexOf("=") + 1));
				Enumerable.From(messages).Where(function(msg) { return msg.timestamp > timestamp; }).Select().ForEach(function (msg)
				{
				    newMessages.push(msg);
				});
		  		res.write(JSON.stringify({ timestamp: (new Date()).getTime(), messages: newMessages }));
		  		res.end();
			}
			if (req.url.startsWith(SendMessageAction)) {
				if (req.method == 'POST') {
					var bodyJson = qs.parse(body);
				    messages.push({ message : bodyJson.message, timestamp: (new Date()).getTime()});
					res.writeHead(200);
			  		res.end("OK!");	
				}
				else {
					res.writeHead(403);
			  		res.end("Método no permitido");		
				}
			}
			if (req.url.startsWith(RegisterAction)) {
				res.writeHead(200);
		  		res.end("Register");	
			}
			else if (req.url == HomeAction) {
		        res.writeHead(200, mimeType);
		        var fileStream = fs.createReadStream(path.join(process.cwd() + "\\static_files", "index.html"));
		        fileStream.pipe(res);
			}
			else {
				res.writeHead(404);
				res.end("No encontrado.");
			}
        }
        else {
	        var mimeType = mimeTypes[path.extname(filename).split(".")[1]];
	        res.writeHead(200, mimeType);
	        var fileStream = fs.createReadStream(filename);
	        fileStream.pipe(res);
    	}
    });
};

var server = http.createServer(requestListener);

server.listen(process.env.PORT || 80, "0.0.0.0");
