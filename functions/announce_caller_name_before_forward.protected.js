
exports.handler = function(context, event, callback) {
    const callerName = event.callerName || 'Unknown'
  
      let twiml = new Twilio.twiml.VoiceResponse();
    twiml.say('Incoming forwarded call from ' + callerName) 
  
    return callback(null, twiml);
  };