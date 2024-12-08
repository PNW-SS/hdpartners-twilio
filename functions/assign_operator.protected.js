// assign_operator

exports.handler = async function (context, event, callback) {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      context.SUPABASE_URL,
      context.SUPABASE_API_KEY
    );
    const twiml = new Twilio.twiml.VoiceResponse();
    const { customerCallSid, fromNumber } = event;
  
    let callerName;
    const callStatus = 'Hunting'
    
    console.log('Assign_Operator triggered')
  
    try {
      callerName = JSON.parse(event.callerName);
    } catch (error) {
      // caller name is empty
    }
  
    // Initialize the excludeOperatorIds array
    let excludeOperatorIds = event.excludeOperatorIds
      ? JSON.parse(event.excludeOperatorIds)
      : [];
  
    // Call the RPC function to assign an operator
    const { data, error } = await supabase.rpc(
      'assign_operator',
      {
        exclude_ids: excludeOperatorIds,
        customer_call_sid: customerCallSid,
        customer_caller_name: callerName,
        customer_from_number: fromNumber,
        customer_call_status: callStatus
      }
    );
  
    if (error) {
      console.error('Error assigning operator:', error);
      const detailedError = JSON.stringify(
        error,
        Object.getOwnPropertyNames(error)
      );
      return callback(detailedError);
    }
  
    if (data && data[0].id) {
  
      if (data[0].call_already_ended) { // Call already ended
        return callback(null, 'Caller hung up before executing')
      }
  
      const operator = data[0];
      excludeOperatorIds.push(operator.id);
  
      const dial = twiml.dial({
        callerId: context.TWILIO_NUMBER,
        timeout: 20,
        action: `${context.TWILIO_SERVER_URL}/assign_operator_action?excludeOperatorIds=${encodeURIComponent(
          JSON.stringify(excludeOperatorIds)
        )}&operatorId=${encodeURIComponent(
          operator.id
        )}&customerCallSid=${encodeURIComponent(customerCallSid)}&fromNumber=${encodeURIComponent(fromNumber)}&callerName=${encodeURIComponent(callerName)}`,
        method: 'POST',
        record: 'record-from-answer-dual',
        recordingStatusCallback: `${context.TWILIO_SERVER_URL}/recording_callback`
      });
      const client = dial.client(
        {
          statusCallbackEvent: 'initiated answered completed',
          statusCallback: `${context.TWILIO_SERVER_URL}/assign_operator_callback?operatorId=${encodeURIComponent(
            JSON.stringify(operator.id)
          )}&customerCallSid=${encodeURIComponent(customerCallSid)}&fromNumber=${encodeURIComponent(fromNumber)}&callerName=${encodeURIComponent(callerName)}`,
          statusCallbackMethod: 'POST',
        }, operator.id
      );
  
      client.parameter({
          name: 'caller_name',
          value: callerName
      });
  
    } else {
      twiml.enqueue(
        {
          action: `${context.TWILIO_SERVER_URL}/queue_action`,
          method: 'POST',
          waitUrl:
            `${context.TWILIO_SERVER_URL}/queue_wait?customerCallSid=${encodeURIComponent(customerCallSid)}&fromNumber=${encodeURIComponent(fromNumber)}&callerName=${encodeURIComponent(callerName)}`
        },
        'main'
      );
    }
  
    return callback(null, twiml);
  };
  