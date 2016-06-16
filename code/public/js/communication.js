(
  function(){
    
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
  }
)();
