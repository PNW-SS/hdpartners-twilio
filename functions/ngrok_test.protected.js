
exports.handler = function(context, event, callback) {
  
    let twiml = new Twilio.twiml.VoiceResponse();
    twiml.say('Ngrok works! 23 deploy test')
  
    return callback(null, twiml);
  };