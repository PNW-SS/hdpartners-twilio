// callername should go to the calls_participants table (TODO)
exports.handler = async function (context, event, callback) {
  const supabase = require('@supabase/supabase-js').createClient(
    context.SUPABASE_URL,
    context.SUPABASE_API_KEY
  );

  const { customerCallSid, fromNumber, callerName } = event

  if (customerCallSid && fromNumber && callerName) {
    const { data, error } = await supabase
      .from('calls')
      .upsert({ call_sid: customerCallSid, from_number: fromNumber, call_name: callerName, call_status: 'enqueued' },
        { onConflict: 'call_sid' })

    if (error) {
      console.error('Error upserting call:', error);
    }
  }

  let twiml = new Twilio.twiml.VoiceResponse();

  const gather = twiml.gather({
    action: `${context.TWILIO_SERVER_URL}/call_back_result`,
    method: 'POST',
    timeout: 1,
    numDigits: 1,
  });

  gather.play(
    `${context.TWILIO_SERVER_URL}/gather_compound.mp3`
  );

  return callback(null, twiml);
};