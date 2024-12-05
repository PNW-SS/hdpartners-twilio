
exports.handler = async function (context, event, callback) {
    const supabase = require('@supabase/supabase-js').createClient(
      context.SUPABASE_URL,
      context.SUPABASE_API_KEY
    );
  
    const { CallSid, Caller, To } = event
  
    const client = context.getTwilioClient();
    let twiml = new Twilio.twiml.VoiceResponse();
  
    const operatorId = parseClientString(Caller);
    const customerCallSid = CallSid
  
    console.log('Outbound Handler event ', event)
  
    let callerName = 'Unknown'
    let fromNumber = To
  
    if (To !== 'queue') { // Create outbound dial
  
      const dial = twiml.dial({
        action: `https://hd-partners-5655.twil.io/outbound_action?operatorId=${encodeURIComponent(operatorId)}&customerCallSid=${customerCallSid}`,
        callerId: context.TWILIO_NUMBER,
      })
  
      try {
        // Determine caller name
        const { data: clientData, error: clientError } = await supabase
          .from('clients')
          .select('name')
          .eq('phone', fromNumber);
  
        if (clientError) {
          throw clientError;
        }
  
        if (clientData.length > 0) {
          callerName = clientData[0].name;
        } else {
          const phoneNumber = await client.lookups.v2.phoneNumbers(fromNumber)
            .fetch({ fields: 'caller_name' });
          callerName = phoneNumber.callerName?.caller_name || callerName;
        }
  
      } catch (error) {
        console.error("Error determining caller name:", error);
      }
  
      dial.number({
        statusCallbackEvent: 'ringing answered completed',
        statusCallback: `https://hd-partners-5655.twil.io/outbound_callback?operatorId=${encodeURIComponent(
          JSON.stringify(operatorId)
        )}&customerCallSid=${encodeURIComponent(customerCallSid)}&fromNumber=${encodeURIComponent(fromNumber)}&callerName=${encodeURIComponent(callerName)}`,
        statusCallbackMethod: 'POST'
      }, To);
  
    } else { // Connect to a queued caller
  
      const dial = twiml.dial({
        action: `https://hd-partners-5655.twil.io/outbound_action?operatorId=${encodeURIComponent(operatorId)}`,
        callerId: context.TWILIO_NUMBER,
        timeout: 2
      })
  
      twiml.say('Caller hung up')
  
      // TODO: Test case where someone calls in on operator after they dial into dequeue on client, but before the dequeue callback is executed
  
      dial.queue({
        url: `https://hd-partners-5655.twil.io/dequeue_callback?operatorId=${encodeURIComponent(operatorId)}`
      }, 'main');
    }
  
    const { data: reserveData, error: reserveError } = await supabase.rpc(
      'outbound_assign_operator',
      {
        operator_id: operatorId,
        customer_call_sid: customerCallSid,
        customer_caller_name: callerName,
        customer_from_number: fromNumber,
        customer_call_status: 'Initiated'
      }
    );
  
    if (reserveError) {
      console.error('Error assigning operator:', reserveError);
      const detailedError = JSON.stringify(
        reserveError,
        Object.getOwnPropertyNames(reserveError)
      );
      return callback(detailedError);
    }
  
    if (reserveData[0].operator_busy || reserveData[0].call_already_ended) {
      console.log('Cannot proceed with call: busy')
      return callback(null)
    }
  
    return callback(null, twiml);
  };
  
  function parseClientString(str) {
    const match = str.match(/^client:(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  }