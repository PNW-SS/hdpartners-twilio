exports.handler = function (context, event, callback) {
    const twiml = new Twilio.twiml.VoiceResponse();

    try {
        twiml.record({
            action: `${context.TWILIO_SERVER_URL}/voicemail_action`,
            method: 'POST',
            maxLength: 300, // 5 minutes
            trim: 'trim-silence',
            playBeep: true,
            transcribe: true,
            transcribeCallback: `${context.TWILIO_SERVER_URL}/voicemail_transcription_callback`,
            recordingStatusCallback: `${context.TWILIO_SERVER_URL}/voicemail_recording_callback`,
            recordingStatusCallbackEvent: 'completed'
        });
    } catch (error) {
        const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
        twiml.dial(context.FALLBACK_NUMBER);
        return callback(detailedError, twiml);
    }

    return callback(null, twiml);
};