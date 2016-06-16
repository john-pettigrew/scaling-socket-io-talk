var amqp = require('amqplib/callback_api');

module.exports = rabbitMQMessages;

function rabbitMQMessages(address, callback){
  //connect to RabbitMQ
  amqp.connect(address, function amqpConnectCallback(err, conn){
    if(err){
      return callback(err);  
    }
    
    //create a channel
    conn.createChannel(function(err, ch){
      if(err){
        return callback(err);  
      } 


      ch.assertExchange('messages', 'fanout', {durable: false});

      //setup a queue for receiving messages
      ch.assertQueue('', {exclusive: true}, function(err, q){
        if(err){
          return callback(err);  
        } 


        ch.bindQueue(q.queue, 'messages', '');

        var options = {
          emitMessage: emitMessage,
          onMessageReceived: onMessageReceived
        };

        //listen for messages
        ch.consume(q.queue, function(msg){
          options.onMessageReceived(JSON.parse(msg.content.toString())); 
        }, {noAck: true});

        callback(null, options);

        function emitMessage(message){

          ch.publish('messages', '', new Buffer(JSON.stringify(message))); 
        }

        function onMessageReceived(){
          console.log('Message received. Nothing to do.');  
        }
      });

      
    });
  });
}
