[Socket.io](http://socket.io) is extremely powerful when it comes to communicating between the browser and a server in real-time. However, the problem of scaling quickly arises with the situations of very high numbers of clients or the need to implement load balancing. This problem can be easily and effectively addressed with [RabbitMQ](https://www.rabbitmq.com). This method also allows for a very extendable architecture when the project's goals inevitably grow and/or change. We will go over some quick basics for these tools as well as extend an existing chat application to use RabbitMQ and multiple node processes. The demo application is available on [my Github page](https://github.com/john-pettigrew/scaling-socket-io-talk).

## Socket.io
[Socket.io](http://socket.io) is a library that implements the websocket protocol. Websockets are meant for two way communication and are often used between a server and a web browser. This is a sharp contrast to the standard way a browser communicates with a server. Typically, a web browser makes requests over 'http' or 'https' and the server responds. When you type in "https://google.com" there is a server that receives your browser's request and does its best to send back a document. Data (such as JSON) can be sent over AJAX requests. This requires the web browser to ask for the information. If the browser needs to wait for new information, it has to poll and ask the server for the updated information every X number of seconds.

With websockets however, communication is free to take place between a web browser and a server. This means that the server can push information to the web browser and vice versa. This type of communication is great for chat apps, simple games, and real time dashboards.

## RabbitMQ
[RabbitMQ](https://www.rabbitmq.com) is a message queue. There are many models for building applications that use RabbitMQ. Just take a look at [their tutorials](https://www.rabbitmq.com/getstarted.html) for some samples. For example, you might use the worker model for a web application that has some long running task like resizing an image. The RabbitMQ server can even implement acknowledgments to make sure the resize completes even if the worker process crashes mid way through completing. It can simply route the job to another worker. However, I won't be covering acknowledgments in this post.

In this post, our chat application will use a publish and subscribe model. We will use it to send to and listen for messages from our chat application. Our chat servers will not need to know about each other. They will only need to know the IP address of RabbitMQ. RabbitMQ also offers a nice web UI and allows for clustering if our application ever requires it. Our application acts as a "producer" when it sends messages to RabbitMQ. These messages are sent to an exchange. This exchange routes messages to queues and then our application acts as a "consumer" and reads them.

producer -> exchange -> queue -> consumer

## Our Base
For this demo, I have created a small chat application to extend to using RabbitMQ. It is available on [my Github page](https://github.com/john-pettigrew/scaling-socket-io-talk). Currently, it uses Express JS as a server to serve our chat page and Socket.io for our messaging. Socket.io will actually handle the work of getting our browser connected via websockets. Let's take a look at the "[message_handler.js](https://github.com/john-pettigrew/scaling-socket-io-talk/blob/master/code/message_handler.js)" file.
```js
io.on('connection', websocketConnect);

function websocketConnect(socket){

  console.log('New connection')

  socket.on('disconnect', socketDisconnect);
  socket.on('message', socketMessage);

  function socketDisconnect(e){
    console.log('Disconnect ', e);
  }

  function socketMessage(text){
    var message =  {text: text, date: new Date()};
    io.emit('message', message)
  }
}
```
Here we are telling Socket.io to wait for connections. Once connected, we wait for a disconnect or a message from a socket. Once a message is received, we simply emit the message out to all listening clients.

[Our client code](https://github.com/john-pettigrew/scaling-socket-io-talk/blob/master/code/public/js/communication.js) is also very simple.
```js
var messageInput = '#chat-input';
var messageSubmit = '#chat-send';
var messageList = '#chat-list';

var socket = io();

//messages to server
$(messageSubmit).click(function(){

  var msg = $(messageInput).val();
  if(!msg){
    return;
  }

  sendMessage(msg);
  $(messageInput).val('');
});

//messages from server
socket.on('message', displayMessage);

function sendMessage(msg){
  socket.emit('message', msg)
}

function displayMessage(msg){
  $(messageList).append(getMessageHTML(msg))
}

function getMessageHTML(msg){
  return '<li class="chat-message"><strong>' + msg.text + '</strong>&nbsp;<i class=\"msg-date\">'+ moment(new Date(msg.date)).format('MMMM Do YYYY, h:mm:ss a') + '</i>' +  '</li>'
}
```
I use a small amount of jQuery to listen for the user to submit a chat message and to add new messages from the server to the page.
Note: I am not doing any input sanitization for the demo app.

## Extending with RabbitMQ
We can start setting up this application to scale by creating a file to handle talking to RabbitMQ for us (["rabbitMQ_messaging.js"](https://github.com/john-pettigrew/scaling-socket-io-talk/blob/master/code/rabbitMQ_messaging.js)).

```js
var amqp = require('amqplib/callback_api');

module.exports = rabbitMQMessages;

function rabbitMQMessages(address, callback){
  //connect to RabbitMQ
  amqp.connect(address, function amqpConnectCallback(err, conn){
    if(err){
      return callback(err);  
    }
```
Here we start by importing an amqp library to communicate with RabbitMQ. Then we export our function that will setup our connection to RabbitMQ.

Next, we create a channel. This is what we talk to RabbitMQ through.

```js
//create a channel
conn.createChannel(function(err, ch){
  if(err){
    return callback(err);  
  }
```

From here, we need to assert our exchange. Our exchange is what our application will send our chat messages to in RabbitMQ. We chose the 'fanout' method to tell rabbitMQ that we want our message delivered to several clients.

```js
ch.assertExchange('messages', 'fanout', {durable: false});

  //setup a queue for receiving messages
  ch.assertQueue('', {exclusive: true}, function(err, q){
    if(err){
      return callback(err);  
    }
    ch.bindQueue(q.queue, 'messages', '');
```

We use "assertQueue" with an empty string to define a temporary queue as described [here](). Finally, we bind our queue and our exchange. This tells the exchange to send our chat messages to this queue. Now we can start sending and receiving messages.

```js
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
```

We create an "options" object that will contain our functions for sending and receiving messages. Using this method, we can replace the "onMessageReceived" function to do something more useful later.

Now that we have built this file, lets modify our "message_handler.js" file to use RabbitMQ.
```js
var rabbitMQHandler = require('./rabbitMQ_messaging');

...

rabbitMQHandler('amqp://localhost', function(err, options){

  if(err){
    throw err;  
  }
```
We start by importing our file and passing in our address string for our message queue. Next, we replace the "onMessageReceived" function.

```js
options.onMessageReceived = onMessageReceived;

...

function onMessageReceived(message){

  io.emit('message', message)
}

```

Since this function is now sending to clients, we need our application to send messages to RabbitMQ.

```js
function socketMessage(text){
  var message =  {text: text, date: new Date()};
  // io.emit('message', message)
  options.emitMessage(message);
}
```

## Adding More Servers
Now, lets test adding a few node servers. We can see that our applications are talking to each other by starting a few on different ports. My demo application is reading a "NODE_PORT" environment variable to know which port to run on.
```bash
#run each of these in a different terminal
NODE_PORT=3000 node app.js
...
NODE_PORT=3001 node app.js
...
NODE_PORT=3002 node app.js
```
![final working application](https://raw.githubusercontent.com/john-pettigrew/scaling-socket-io-talk/master/blog/images/final_app.png)

## Recap
 For smaller applications, scaling in the way that we have discussed may not be necessary. The chat application could be further extended if logging or some other service was required by letting other node applications subscribe to these events in RabbitMQ. We went over some of the basics of RabbitMQ with Socket.io and applied them to a chat application to help it scale. If you thought this was awesome, please share it!

Until next time,

John
