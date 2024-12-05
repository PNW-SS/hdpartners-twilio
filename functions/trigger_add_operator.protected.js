const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (context, event, callback) {
  const supabaseUrl = context.SUPABASE_URL;
  const supabaseKey = context.SUPABASE_API_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const client = context.getTwilioClient();
  const { callSid, callStatus, fromNumber } = event;
  
  let operatorsToCall = JSON.parse(event.operatorsToCall).sort((a, b) => a.priority - b.priority);
  const currentlyCalling = operatorsToCall.shift();

  let callerName = null;

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
      callerName = phoneNumber.callerName?.caller_name || 'unknown';
    }

    console.log("Caller Name:", callerName);

  } catch (error) {
    console.error("Error determining caller name:", error);
    callerName = 'unknown';
  }

  try {

    const callerIsOnTheLine = await checkCallerCallIsActive(client, callSid);

    if (!callerIsOnTheLine) {
      console.log('Caller hung up before triggering add operator')
      callback(null, 'Caller hung up before triggering add operator')
      return;
    }

    if (!currentlyCalling) {
      await sendUnhandledCallerWarning(client, supabase, context);
    } else {
      const twiml = new Twilio.twiml.VoiceResponse();

      const gather = twiml.gather({
        numDigits: 1,
        action: `https://hd-partners-5655.twil.io/add_agent_or_voicemail?currentlyCallingId=${currentlyCalling.id}&callSid=${callSid}`,
        method: 'POST',
        timeout: 5,
      });

      gather.say(`Incoming call from ${callerName}`);

      const redirectUrl = operatorsToCall.length > 0
        ? `https://hd-partners-5655.twil.io/call_additional_operators?operatorsToCall=${encodeURIComponent(JSON.stringify(operatorsToCall))}&customerCallSid=${callSid}`
        : `https://hd-partners-5655.twil.io/nobody_picked_up?customerCallSid=${callSid}`;

      twiml.redirect({
        method: 'POST'
      }, redirectUrl);

      await client.calls.create({
        to: currentlyCalling.employees.phone,
        from: context.TWILIO_NUMBER,
        twiml: twiml.toString(),
      });
    }

    // Log the call after everything else has executed successfully
    const { error } = await supabase
      .from('calls')
      .insert({
        call_sid: callSid,
        from_number: fromNumber,
        call_status: callStatus,
        caller_name: callerName
      });

    if (error) {
      throw error;
    }

    console.log("Call logged successfully");
    callback(null, 'Operation completed and call logged successfully.');

  } catch (error) {
    const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
    callback(detailedError);
  }
};

async function sendUnhandledCallerWarning(client, supabase, context) {
  const { data, error } = await supabase
    .from('call_operators')
    .select('id, employees(phone)')
    .eq('is_available', true);

  if (error) {
    throw error;
  }

  const sendTextPromises = data.map(operator => {
    const phoneNumber = operator.employees.phone;
    return client.messages.create({
      body: 'Warning: There is an unhandled client in the queue',
      from: context.TWILIO_NUMBER,
      to: phoneNumber,
    });
  });

  await Promise.all(sendTextPromises);
  console.log('Queued client warning sent successfully');
}

async function checkCallerCallIsActive(client, callSid) {
    const queuedCalls = await client.calls.list({ status: 'queued' });
    const ringingCalls = await client.calls.list({ status: 'ringing' });
    const inProgressCalls = await client.calls.list({ status: 'in-progress' });

    const calls = [...queuedCalls, ...ringingCalls, ...inProgressCalls];
    const callNumbers = calls.map(call => call.sid);

    return callNumbers.includes(callSid);
}