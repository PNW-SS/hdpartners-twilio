exports.handler = async function (context, event, callback) {
    const supabase = require('@supabase/supabase-js').createClient(
        context.SUPABASE_URL,
        context.SUPABASE_API_KEY
    );
    const twiml = new Twilio.twiml.VoiceResponse();
    const { Digits, CallSid } = event

    if (Digits === '1') {
        twiml.say('You have selected the 1 option. Please hold while we connect you to an operator.');
    } else {
        twiml.say('You have selected the directory option. Please hold while we connect you to an operator.');
    }
    
    return callback(null, twiml);
};