exports.handler = async function (context, event, callback) {
    const supabase = require('@supabase/supabase-js').createClient(
      context.SUPABASE_URL,
      context.SUPABASE_API_KEY
    );
  
    const twiml = new Twilio.twiml.VoiceResponse();
  
    const dialCallStatus = event.DialCallStatus; // 'completed', 'no-answer', 'busy', 'failed', etc.
    const customerCallSid = event.customerCallSid
    const dequeueResult = event.DequeueResult;
    const operatorId = event.operatorId;
  
    const endTime = new Date().toISOString();
    
    if (operatorId && (['no-answer', 'busy', 'failed', 'canceled'].includes(dialCallStatus))) { 
      let newStatus = 'available';
  
      // Update operator status in Supabase
      const { error: operatorError } = await supabase
        .from('call_operators')
        .update({ status: newStatus, designated_call_sid: null })
        .eq('id', operatorId);
  
      if (operatorError) {
        console.error('Error updating operator status:', operatorError);
        const detailedError = JSON.stringify(operatorError, Object.getOwnPropertyNames(operatorError))
        // TODO: redirect call to fallback
        return callback(detailedError);
      }
  
      const { error: callError } = await supabase
        .from('calls')
        .update({ call_status: 'Complete', end_time: endTime })
        .eq('call_sid', customerCallSid );
      
      if (callError) {
        console.error('Error updating operator status:', callError);
        const detailedError = JSON.stringify(callError, Object.getOwnPropertyNames(callError))
        // TODO: redirect call to fallback
        return callback(detailedError);
      }
      
    } else if (['queue-empty'].includes(dequeueResult)) {
      twiml.say('queue is empty')
    }
    
    return callback(null, twiml);
  };