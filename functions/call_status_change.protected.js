// call_status_change

exports.handler = async function (context, event, callback) {
    const supabase = require('@supabase/supabase-js').createClient(
      context.SUPABASE_URL_STAGING,
      context.SUPABASE_API_KEY_STAGING
    );
  
    const { CallStatus, CallSid, From } = event;
  
    const fromNumber = From
    const callerName = 'Unknown'
    const endTime = new Date().toISOString();
  
    console.log('Call status change: ', event)
    
    if (CallStatus === 'completed' || CallStatus === 'no-answer') {
      
      // Call the RPC function to run end call logic
      const { error } = await supabase.rpc(
        'on_call_complete',
        {
          customer_call_sid: CallSid,
          customer_end_time: endTime,
          customer_call_status: 'Complete', // Temporary field if call_status_change triggers before call is inserted
          customer_caller_name: callerName,
          customer_from_number: fromNumber,
          // TODO: Might need to add direction here, direction is based on whether 'From' includes "client:"
        }
      )
  
      if (error) {
        console.error('Error running complete call logic:', error);
        const detailedError = JSON.stringify(
          error,
          Object.getOwnPropertyNames(error)
        );
        return callback(detailedError);
      }
    }
  
    // TODO: Send push notification to available operators if the call was missed, voicemail was left, or callback was requested
  
    return callback(null);
  }