

exports.handler = function (context, event, callback) {
    const twiml = new Twilio.twiml.VoiceResponse();
    const callSid = event.callSid;
    const currentlyCallingId = event.currentlyCallingId;
      
    if (event.Digits === '1') {
      console.log('Sending to voicemail');
      twiml.redirect({
        method: 'POST'
      }, `${context.TWILIO_SERVER_URL}/dequeue_to_voicemail?callSid=${callSid}`);
    } else {
      console.log('Connecting call to operator');
      const dial = twiml.dial();
      dial.conference({
        beep: true,
        startConferenceOnEnter: true,
        endConferenceOnExit: true,
        statusCallback: `${context.TWILIO_SERVER_URL}/dequeue_to_conference?clientCallSid=${callSid}`,
        statusCallbackMethod: 'GET',
        statusCallbackEvent: ['join', 'leave']
      }, currentlyCallingId);
    }
  
    callback(null, twiml);
  };
  