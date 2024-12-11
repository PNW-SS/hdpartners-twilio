exports.handler = async function (context, event, callback) {
    const supabase = require('@supabase/supabase-js').createClient(
        context.SUPABASE_URL,
        context.SUPABASE_API_KEY
    );
    const twiml = new Twilio.twiml.VoiceResponse();
    const { Digits } = event

    console.log('directory:',`${context.TWILIO_SERVER_URL}/split_on_directory.js`);

    if (Digits === '1') {
        twiml.redirect(`${context.TWILIO_SERVER_URL}/check_any_available_operators`);
    } else {
        const gather = twiml.gather({
            input: 'dtmf',
            timeout: 10,
            numDigits: 1,
            action: `${context.TWILIO_SERVER_URL}/split_on_directory`,
            method: 'POST',
        })
        gather.play(`${context.TWILIO_SERVER_URL}/directory_options.mp3`);
    }

    return callback(null, twiml);
};