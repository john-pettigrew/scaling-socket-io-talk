(
  function(){
    
    var messageInput = '#chat-input';
    var messageSubmit = '#chat-send';
    var messageList = '';

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
      console.log('will later send this message2:', msg);  
      socket.emit('message', msg)
    }

    function displayMessage(msg){
      console.log('will later display this message: ', msg)
    }
  }
)();
