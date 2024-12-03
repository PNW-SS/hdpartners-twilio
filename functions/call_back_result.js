// call_back_result

exports.handler = async function (context, event, callback) {
    const supabase = require('@supabase/supabase-js').createClient(
        context.SUPABASE_URL_STAGING,
        context.SUPABASE_API_KEY_STAGING
    );
    const twiml = new Twilio.twiml.VoiceResponse();
    const { Digits, CallSid } = event

    if (Digits === '1') {
        // TODO: Send push notification to available operators that a callback was requested
        const { error } = await supabase
            .from('calls')
            .update({ call_status: 'Callback' })
            .eq('call_sid', CallSid)

        if (error) {
            console.error('Error logging call:', error);
        }

        twiml.play('https://ochre-antelope-4265.twil.io/assets/callback_confirmation.mp3')
        twiml.hangup();
    }
    
    return callback(null, twiml);
};