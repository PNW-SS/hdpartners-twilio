const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (context, event, callback) {

  const supabaseUrl = context.SUPABASE_URL
  const supabaseKey = context.SUPABASE_API_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const twiml = new Twilio.twiml.VoiceResponse();

  try {
    const { data, error } = await supabase
      .from('call_operators')
      .select('id, priority, employees(phone)')
      .eq('is_available', true)

    if (error) {
      throw error;
    }

    if (data.length == 0) {
      twiml.play(`${context.TWILIO_SERVER_URL}/no_availabilities_enabled.mp3`)
      twiml.redirect(`${context.TWILIO_SERVER_URL}/voicemail_entry`)
    } else {
      // Notify of recording disclaimer
      twiml.play(`${context.TWILIO_SERVER_URL}/recording_disclosure.mp3`)
      twiml.redirect(`${context.TWILIO_SERVER_URL}/assign_operator?fromNumber=${encodeURIComponent(event.From)}&customerCallSid=${event.CallSid}`) // We have to pass these parameters because next function runs recursively
    }

    return callback(null, twiml);

  } catch (error) {
    const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
    twiml.dial(context.FALLBACK_NUMBER);
    return callback(detailedError);
  }
};