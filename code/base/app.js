var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var messageHandler = require('./message_handler');
var config = require('./config');

//Serve static files
app.get('/', function(req, res){
  res.sendFile(__dirname+'/public/index.html');
});
app.use('/public', express.static('public'));

//Handle messaging
messageHandler(io);

http.listen(config.port, function(){
  console.log(`Server running on port ${config.port}`);
});
