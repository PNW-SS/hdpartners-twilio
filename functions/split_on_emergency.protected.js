exports.handler = function (context, event, callback) {
    const supabase = require('@supabase/supabase-js').createClient(
        context.SUPABASE_URL,
        context.SUPABASE_API_KEY
    );
    const twiml = new Twilio.twiml.VoiceResponse();
    const { Digits } = event

    try {
        // Redirect to operator
        if (Digits === '1') {

        // Redirect to voicemail
        } else if (Digits === '2') {
            twiml.redirect(`${context.TWILIO_SERVER_URL}/voicemail_entry`);
        
        // No input
        } else {
            twiml.hangup();
        }

    } catch (error) {
        const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
        twiml.dial(context.FALLBACK_NUMBER);
        return callback(detailedError, twiml);
    }

    return callback(null, twiml);
};