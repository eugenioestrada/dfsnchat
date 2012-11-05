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

var timeout = 300000;

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

var BuddyStore = (function () {
    function BuddyStore() {
        this.buddiesById = [];
        this.buddiesByName = [];
    }
    BuddyStore.prototype.add = function (id, name, timestamp) {
        this.removeName(name);
        var buddy = new Buddy(id, name, timestamp);
        this.buddiesById[id] = buddy;
        this.buddiesByName[name] = buddy;
    };
    BuddyStore.prototype.containsId = function (id) {
        return this.buddiesById[id] != null;
    };
    BuddyStore.prototype.containsName = function (name) {
        return this.buddiesByName[name] != null;
    };
    BuddyStore.prototype.getById = function (id) {
        return this.buddiesById[id];
    };
    BuddyStore.prototype.getByName = function (name) {
        return this.buddiesByName[name];
    };
    BuddyStore.prototype.getAll = function () {
        var buddies = new Array();
        for(var id in this.buddiesById) {
        	var buddy = this.getById(id);
        	var time = (new Date()).getTime() - buddy.timestamp;
        	if (time > timeout) {
        		this.removeId(id);
        	}
    		else {
    			buddies.push(buddy);
    		}
        }
        return buddies;
    };
    BuddyStore.prototype.removeId = function (id) {
        if(this.containsId(id)) {
            var buddy = this.getById(id);
            delete this.buddiesByName[buddy.name];
            delete this.buddiesById[id];
        }
    };
    BuddyStore.prototype.removeName = function (name) {
        if(this.containsName(name)) {
            var buddy = this.getByName(name);
            delete this.buddiesById[buddy.id];
            delete this.buddiesByName[name];
        }
    };
    return BuddyStore;
})();

var Buddy = (function () {
    function Buddy(id, name, timestamp) {
        this.id = id;
        this.name = name;
        this.timestamp = timestamp;
    }
    return Buddy;
})();

var buddies = new BuddyStore();

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
					if (buddies.containsId(bodyJson.userId)) {
						var buddy = buddies.getById(bodyJson.userId);
						buddy.timestamp = (new Date()).getTime();
					}

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
			if (req.url.startsWith(GetBuddiesAction)) {
				if (req.method == 'POST') {
					var bodyJson = qs.parse(body);
					if (buddies.containsId(bodyJson.userId)) {
						var buddy = buddies.getById(bodyJson.userId);
						buddy.timestamp = (new Date()).getTime();
					}
			  		res.write(JSON.stringify(buddies.getAll()));
			  		res.end();
		  		}
		  		else {
		  				res.writeHead(403);
	  					res.end("Método no permitido");
		  		}
			}
			if (req.url.startsWith(SendMessageAction)) {
				if (req.method == 'POST') {
					var bodyJson = qs.parse(body);
					if (typeof bodyJson.message === "undefined") {
						res.writeHead(404);
						res.end("Debe escribir un mensaje");
					}
					else {
						if (buddies.containsId(bodyJson.userId)) {
							var buddy = buddies.getById(bodyJson.userId);
							var time = (new Date()).getTime() - buddy.timestamp;
							if (time < timeout) {
								buddy.timestamp = (new Date()).getTime();
								messages.push({ message : bodyJson.message, name: buddy.name, timestamp: (new Date()).getTime()});
								res.writeHead(200);
					  			res.end("OK!");	
				  			}
				  			else {
				  				res.writeHead(500);
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
						res.writeHead(404);
						res.end("Debe escribir un nombre");
					}
					else {
						var name = bodyJson.name;
						var timestamp = (new Date()).getTime();
						var id = name + timestamp.toString();
						if (buddies.containsName(name)) {
							var buddy = buddies.getByName(name);
							var time = timestamp - buddy.timestamp;
							if (time > timeout) {
								buddies.add(id, name, timestamp);
				  				res.write(JSON.stringify({ id: id }));
				  				res.end();
							}
							else {
								res.writeHead(500);
				  				res.end("Ese usuario ya está registrado");
							}
						}
						else {
							buddies.add(id, name, timestamp);
			  				res.write(JSON.stringify({ id: id }));
			  				res.end();
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
						if (buddies.containsId(bodyJson.userId)) {
							var buddy = buddies.getById(bodyJson.userId);
							buddy.timestamp = (new Date()).getTime();
			  				res.write(JSON.stringify({ id: buddy.id }));
			  				res.end();
						}
						else {
							res.writeHead(500);
			  				res.end("Ese usuario no existe");
						}
			  		}
				}
				else {
					res.writeHead(501);
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
