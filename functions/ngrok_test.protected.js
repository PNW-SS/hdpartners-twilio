
exports.handler = function(context, event, callback) {
  
    let twiml = new Twilio.twiml.VoiceResponse();
    twiml.say('Test dev push keys');
  
    return callback(null, twiml);
  };