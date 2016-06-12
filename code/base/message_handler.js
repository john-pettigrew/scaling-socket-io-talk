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

    function socketMessage(msg){
      console.log('New message: ', msg);
      io.emit('message', msg)
    }
  }
}
