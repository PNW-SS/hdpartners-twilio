exports.handler = async function (context, event, callback) {
    const supabase = require('@supabase/supabase-js').createClient(
      context.SUPABASE_URL,
      context.SUPABASE_API_KEY
    );
  
    const { CallStatus, customerCallSid, callerName, fromNumber } = event;
    const operatorId = JSON.parse(event.operatorId);
    const direction = 'outbound'
  
    let error;
    
    switch (CallStatus) {
      // case 'initiated':
      //   // RPC function here for outbound call
      //   const { data, error: initiatingError } = await supabase.rpc(
      //     'outbound_assign_operator',
      //     {
      //       operator_id: operatorId,
      //       customer_call_sid: customerCallSid,
      //       customer_caller_name: callerName,
      //       customer_from_number: fromNumber,
      //       customer_call_status: 'Initiated'
      //     }
      //   );
  
      //   console.log('initiated on outbound callback')
  
      //   error = initiatingError
  
      case 'ringing': {
        const { error: ringingError } = await supabase
          .from('calls')
          // .upsert(
          //   {
          //     call_sid: customerCallSid,
          //     call_status: 'Ringing',
          //     from_number: fromNumber,
          //     caller_name: callerName,
          //     direction: direction
          //   }, {
          //   onConflict: 'call_sid'
          // })
          .update(
            {
              call_status: 'Ringing',
              from_number: fromNumber,
              caller_name: callerName,
              direction: direction
            })
          .eq('call_sid', customerCallSid)
        error = ringingError;
        break;
      }
  
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