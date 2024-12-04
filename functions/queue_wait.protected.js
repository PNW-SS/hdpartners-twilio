
exports.handler = async function (context, event, callback) {
    const supabase = require('@supabase/supabase-js').createClient(
      context.SUPABASE_URL_STAGING,
      context.SUPABASE_API_KEY_STAGING
    );
  
    const { customerCallSid, fromNumber, callerName } = event
  
    if (customerCallSid && fromNumber && callerName ) {
      const { data, error } = await supabase
      .from('calls')
      .upsert({ call_sid: customerCallSid, from_number: fromNumber, caller_name: callerName, call_status: 'Enqueued' }, 
      { onConflict: 'call_sid'})
  
      if (error) {
        console.error('Error upserting call:', error);
      }
    }
  
    let twiml = new Twilio.twiml.VoiceResponse();
  
    const gather = twiml.gather({
      action: 'https://hd-partners-5655.twil.io/call_back_result',
      method: 'POST',
      timeout: 1,
      numDigits: 1,
    });
  
    gather.play(
      'https://ochre-antelope-4265.twil.io/assets/gather_compound.mp3'
    );
  
    return callback(null, twiml);
  };