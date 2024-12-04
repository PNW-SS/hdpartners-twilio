
exports.handler = async function (context, event, callback) {
    const supabase = require('@supabase/supabase-js').createClient(
      context.SUPABASE_URL_STAGING,
      context.SUPABASE_API_KEY_STAGING
    );
  
    const { CallStatus, CallSid } = event;
  
    const endTime = new Date().toISOString();
  
    console.log('App call status change', event)
  
    if (CallStatus === 'completed' || CallStatus === 'no-answer' || CallStatus === 'busy') {
  
      if (CallStatus === 'busy') {
        console.log("Busy call caught")
      }
      
      // Call the RPC function to run end call logic
      const { error } = await supabase.rpc(
        'app_on_call_complete',
        {
          customer_from_number: 'Loading',
          customer_caller_name: 'Loading',
          customer_call_sid: CallSid,
          customer_end_time: endTime,
          customer_call_status: 'Complete', // Temporary field if call_status_change triggers before call is inserted
          customer_direction: 'outbound'
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
  
    return callback(null);
  }