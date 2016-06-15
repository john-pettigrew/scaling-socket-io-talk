module.exports = messageHandler;

function messageHandler(io){
  console.log('handler');
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
      io.emit('message', {text: text, date: new Date()})
    }
  }
}
