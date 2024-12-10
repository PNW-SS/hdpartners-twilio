exports.handler = function (context, event, callback) {
    const supabase = require('@supabase/supabase-js').createClient(
        context.SUPABASE_URL,
        context.SUPABASE_API_KEY
    );
    const twiml = new Twilio.twiml.VoiceResponse();
    const { Digits, CallSid } = event

    // Redirect to operator
    if (Digits === '1') {
        
    // Redirect to voicemail
    } else if (Digits === '2') {
        twiml.redirect(`${context.TWILIO_SERVER_URL}/voicemail_entry`);
    } else {
        twiml.hangup();
    }
    
    return callback(null, twiml);
};