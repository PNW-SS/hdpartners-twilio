
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (context, event, callback) {

  const callSid = event.CallSid;

  const supabaseUrl = context.SUPABASE_URL_STAGING;
  const supabaseKey = context.SUPABASE_API_KEY_STAGING;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const twiml = new Twilio.twiml.VoiceResponse();
  const client = new Twilio(context.ACCOUNT_SID, context.AUTH_TOKEN);

  console.log("Return to queue event:", event);

  twiml.redirect({
    method: 'POST'
  }, 'https://handler.twilio.com/twiml/EH4808a942a2edf6a4ac38e4d80581d881')

  console.log('Redirected back into queue:', callSid);

  const startTime = new Date().toISOString();

  const callerIsOnTheLine = await checkCallerCallIsActive(client, callSid);

  if (!callerIsOnTheLine) {
    console.log('Caller hung up before triggering add operator')
    callback(null, 'Caller hung up before triggering add operator')
    return;
  }

  try {
    const { data, error } = await supabase
      .from('calls')
      .update({ start_time: startTime, call_status: 'enqueued' })
      .eq('call_sid', callSid)

    if (error) {
      throw error
    }

    const operatorsToCall = await getAvailableOperatorToCall(supabase, client)
    await triggerCallOperators(operatorsToCall, supabase, twiml, client, callSid, context, callback, twiml)

  } catch (error) {
    const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
    callback(detailedError);
  }
};

async function triggerCallOperators(operatorsToCall, supabase, twiml, client, callSid, context, callback, clientTwiml) {
  const currentlyCalling = operatorsToCall.shift();

  if (!currentlyCalling) {
    console.log("On hold until next available agent becomes available");
    callback(null, "On hold until next available agent becomes available");
    return

  } else {

    let callerName = 'unknown';

    try {
      const { data, error } = await supabase
        .from('calls')
        .select('call_sid, caller_name')
        .eq('call_sid', callSid)
        .single();

      if (error) {
        throw error
      }

      if (data.caller_name) {
        callerName = data.caller_name;
      }

    } catch (error) {
      console.error("Error getting call information", error);
    }

    const twiml = new Twilio.twiml.VoiceResponse();

    const gather = twiml.gather({
      numDigits: 1,
      action: `https://hd-partners-5655.twil.io/add_agent_or_voicemail?currentlyCallingId=${currentlyCalling.id}&callSid=${callSid}`,
      method: 'POST',
      timeout: 5,
    });

    gather.say(`Incoming call from ${callerName}.`);

    const redirectUrl = operatorsToCall.length > 0
      ? `https://hd-partners-5655.twil.io/call_additional_operators?operatorsToCall=${encodeURIComponent(JSON.stringify(operatorsToCall))}&callSid=${callSid}`
      : `https://hd-partners-5655.twil.io/nobody_picked_up?callSid=${callSid}`; // URL to redirect if no more operators to call

    twiml.redirect({
      method: 'POST'
    }, redirectUrl);

    client.calls
      .create({
        to: currentlyCalling.employees.phone,
        from: context.TWILIO_NUMBER_STAGING,
        twiml: twiml.toString(),
      })
      .then(call => {
        return callback(null, clientTwiml)
      })
      .catch(error => {
        return callback(error, 'Error calling agent');
      });
  }
};

async function getAvailableOperatorToCall(supabase, client) {
  try {
    const { data: availableOperators, error } = await supabase
      .from('call_operators')
      .select('id, priority, employees(phone)')
      .eq('is_available', true);

    if (error) {
      throw error;
    }

    // Get calls for each status separately
    const queuedCalls = await client.calls.list({ status: 'queued' });
    const ringingCalls = await client.calls.list({ status: 'ringing' });
    const inProgressCalls = await client.calls.list({ status: 'in-progress' });

    // Combine the calls from all statuses
    const calls = [...queuedCalls, ...ringingCalls, ...inProgressCalls];

    // Extract the "to" and "from" phone numbers from the calls
    const callNumbers = calls.flatMap(call => [call.to, call.from]);

    // Filter out operators who are already in the calls list
    const operatorsToCall = availableOperators.filter(
      operator => !callNumbers.includes(operator.employees.phone)
    );

    operatorsToCall.sort((a, b) => a.priority - b.priority);

    return operatorsToCall;

  } catch (error) {
    console.error('Error:', error);
  }
}

async function checkCallerCallIsActive(client, callSid) {
    const queuedCalls = await client.calls.list({ status: 'queued' });
    const ringingCalls = await client.calls.list({ status: 'ringing' });
    const inProgressCalls = await client.calls.list({ status: 'in-progress' });

    const calls = [...queuedCalls, ...ringingCalls, ...inProgressCalls];
    const callNumbers = calls.map(call => call.sid);

    return callNumbers.includes(callSid);
}
