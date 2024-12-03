// assign_operator_callback

exports.handler = async function (context, event, callback) {
    const supabase = require('@supabase/supabase-js').createClient(
      context.SUPABASE_URL_STAGING,
      context.SUPABASE_API_KEY_STAGING
    );
  
    const { CallStatus, customerCallSid, callerName, fromNumber } = event;
    const operatorId = JSON.parse(event.operatorId);
  
    let error;
  
    switch (CallStatus) {
      case 'initiated': {
        const { error: ringingError } = await supabase
          .from('calls')
          .upsert(
            {
              call_sid: customerCallSid,
              call_status: 'Ringing',
              operator: operatorId,
              from_number: fromNumber,
              caller_name: callerName,
            }, {
            onConflict: 'call_sid'
          })
        error = ringingError;
        break;
      }
      // Intiated is currently handling the ringing state as well but may need to seperate
      // case 'ringing': {
      //   const { error: ringingError } = await supabase
      //     .from('calls')
      //     .upsert(
      //       {
      //         call_sid: customerCallSid,
      //         call_status: 'Ringing',
      //         operator: operatorId,
      //         from_number: fromNumber,
      //         caller_name: callerName,
      //       }, {
      //       onConflict: 'call_sid'
      //     })
      //   error = ringingError;
      //   break;
      // }
  
      case 'in-progress': {
        const { error: answeredError } = await supabase
          .from('calls')
          .update({ call_status: 'In-progress', operator: operatorId })
          .eq('call_sid', customerCallSid);
        error = answeredError;
        break;
      }
  
      default:
        const { error: availablityError } = await supabase
          .from('call_operators')
          .update({ status: 'available', designated_call_sid: null })
          .eq('id', operatorId);
        error = availablityError
        break;
    }
  
    if (error) {
      console.error('Error logging call:', error);
      const detailedError = JSON.stringify(
        error,
        Object.getOwnPropertyNames(error)
      );
      return callback(detailedError);
    }
  
    return callback(null);
  };