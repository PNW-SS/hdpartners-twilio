exports.handler = function(context, event, callback) {
  
    console.log('CONVERSATIONS TRIGGERED', event);

    callback('Conversations triggered');
  };