var http = require('http'),
    url = require('url'),
    path = require('path'),
    fs = require('fs'),
    qs = require('querystring'),
    Enumerable = require('linq'),
    crypto = require('crypto');

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
var CheckUserAction = "/CheckUser";
var GetBuddiesAction = "/GetBuddies";

var messages = [ { message: "Bienvenidos al Chat de Difoosion", timestamp: (new Date).getTime(), name: "Servidor" } ];
var buddies = [ ];
var buddiesById = [ ];

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
				if (req.method == 'POST') {
					var bodyJson = qs.parse(body);
					var buddy = buddiesById[bodyJson.userId];
					if (typeof buddy === "undefined") {
						res.writeHead(403);
				  		res.end("Método no permitido");	
					}
					else {
						var time = (new Date()).getTime() - buddy.timestamp;
						if (time < 600000) {
							buddy.timestamp = (new Date()).getTime();
							res.writeHead(200, { 'Content-Type': 'application/json' }); 
							var newMessages = [];
							var timestamp = bodyJson.timestamp;
							Enumerable.From(messages).Where(function(msg) { return msg.timestamp > timestamp; }).Select().ForEach(function (msg)
							{
							    newMessages.push(msg);
							});
					  		res.write(JSON.stringify({ timestamp: (new Date()).getTime(), messages: newMessages }));
					  		res.end();
					  	}
			  			else {
			  				res.writeHead(403);
		  					res.end("Método no permitido");
			  			}
					}
				}
			}
			if (req.url.startsWith(GetBuddiesAction)) {
				if (req.method == 'POST') {
					var bodyJson = qs.parse(body);
					var buddy = buddiesById[bodyJson.userId];
					if (typeof buddy === "undefined") {
						res.writeHead(403);
				  		res.end("Método no permitido");	
					}
					else {
						var time = (new Date()).getTime() - buddy.timestamp;
						if (time < 600000) {
							buddy.timestamp = (new Date()).getTime();
							var friends = [];
							for (key in buddies)
							{
								var buddy = buddies[key];
								var time = ((new Date()).getTime() - buddy.timestamp);
								if (time < 600000) {
									friends.push({ name : buddy.name });	
								}
							}

					  		res.write(JSON.stringify(friends));
					  		res.end();
				  		}
			  			else {
			  				res.writeHead(403);
		  					res.end("Método no permitido");
			  			}
					}
				}
			}
			if (req.url.startsWith(SendMessageAction)) {
				if (req.method == 'POST') {
					var bodyJson = qs.parse(body);
					if (typeof bodyJson.message === "undefined") {
						res.writeHead(403);
						res.end("Debe escribir un mensaje");
					}
					else {
						var buddy = buddiesById[bodyJson.userId];
						if (typeof buddy === "undefined") {

						}
						else {
							var time = (new Date()).getTime() - buddy.timestamp;
							if (time < 600000) {
								buddy.timestamp = (new Date()).getTime();
								messages.push({ message : bodyJson.message, name: buddy.name, timestamp: (new Date()).getTime()});
								res.writeHead(200);
					  			res.end("OK!");	
				  			}
				  			else {
				  				res.writeHead(403);
			  					res.end("Método no permitido");
				  			}
						}
			  		}
				}
				else {
					res.writeHead(403);
			  		res.end("Método no permitido");		
				}
			}
			if (req.url.startsWith(RegisterAction)) {
				if (req.method == 'POST') {
					var bodyJson = qs.parse(body);
					if (typeof bodyJson.name === "undefined") {
						res.writeHead(403);
						res.end("Debe escribir un nombre");
					}
					else {
						if (typeof buddies[bodyJson.name] === "undefined") {
							var user = { name : bodyJson.name, timestamp: (new Date()).getTime() };
							var generated = user.name + user.timestamp.toString();
							user.id = generated;
						    buddies[user.name] = user;
						    buddiesById[user.id] = user;
			  				res.write(JSON.stringify({ id: user.id }));
			  				res.end();
						}
						else {
							var time = (new Date()).getTime() - buddies[bodyJson.name].timestamp;
							if (time > 600000) {
								var user = { name : bodyJson.name, timestamp: (new Date()).getTime() };
								var generated = user.name + user.timestamp.toString();
								user.id = generated;
							    buddies[user.name] = user;
							    buddiesById[user.id] = user;
				  				res.write(JSON.stringify({ id: user.id }));
				  				res.end();
							}
							else {
								res.writeHead(403);
				  				res.end("Ese usuario ya está registrado");
							}
						}
			  		}
				}
				else {
					res.writeHead(403);
			  		res.end("Método no permitido");		
				}
			}
			else if (req.url.startsWith(CheckUserAction)) {
				if (req.method == 'POST') {
					var bodyJson = qs.parse(body);
					if (typeof bodyJson.name === "undefined" || typeof bodyJson.userId === "undefined" ) {
						res.writeHead(403);
						res.end("Petición no válida");
					}
					else {
						var buddy = buddiesById[bodyJson.userId];
						if (typeof buddy === "undefined") {
							res.writeHead(403);
			  				res.end("Ese usuario ya está registrado");
						}
						else if (buddy == buddies[bodyJson.name] ) {
							buddy.timestamp = (new Date()).getTime();
			  				res.write(JSON.stringify({ id: buddy.id }));
			  				res.end();
						}
						else {
							res.writeHead(403);
			  				res.end("Ese usuario ya está registrado");
						}
			  		}
				}
				else {
					res.writeHead(403);
			  		res.end("Método no permitido");		
				}
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
