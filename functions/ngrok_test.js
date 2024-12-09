exports.handler = function(context, event, callback) {
  
    console.log('CONVERSATIONS TRIGGERED', event);

    return (callback('Conversations triggered'));
  };