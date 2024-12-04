
exports.handler = function(context, event, callback) {
  
    let twiml = new Twilio.twiml.VoiceResponse();
    twiml.say('Ngrok works! 23')
  
    return callback(null, twiml);
  };