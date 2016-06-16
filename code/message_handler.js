var rabbitMQHandler = require('./rabbitMQ_messaging');

module.exports = messageHandler;

function messageHandler(io){
  console.log('handler');
  rabbitMQHandler('amqp://localhost', function(err, options){
    
    if(err){
      throw err;  
    }

    options.onMessageReceived = onMessageReceived;

    io.on('connection', websocketConnect);

    function websocketConnect(socket){

      console.log('New connection')
      
      socket.on('disconnect', socketDisconnect);
      socket.on('message', socketMessage);

      function socketDisconnect(e){
        console.log('Disconnect ', e);
      }

      function socketMessage(text){
        console.log('New message: ', text);
        var message =  {text: text, date: new Date()};
        // io.emit('message', message)
        options.emitMessage(message);
      }
    }

    function onMessageReceived(message){
      console.log('message received 2', message);

      io.emit('message', message)
    }

  });
}
