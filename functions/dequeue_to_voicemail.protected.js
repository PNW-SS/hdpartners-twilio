const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (context, event, callback) {
  const callSid = event.callSid;
  const queueName = context.QUEUE_NAME;
  const supabaseUrl = context.SUPABASE_URL;
  const supabaseKey = context.SUPABASE_API_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const client = new Twilio(context.ACCOUNT_SID, context.AUTH_TOKEN);

  try {
    const isActive = await checkCallerCallIsActive(client, callSid);

    if (!isActive) {
      console.log("Caller left before sending to voicemail");
      callback(null, "Caller left the call");
      return; // Exit the function early
    }

    const queues = await client.queues.list({ friendlyName: queueName, limit: 1 });
    if (queues.length > 0) {
      const queueSid = queues[0].sid;
      const member = await client.queues(queueSid).members(callSid)
        .update({
          url: `https://handler.twilio.com/twiml/EH6b4a50fb94a86ef4f8c6d014d6dc51d4`,
          method: 'GET'
        });

      console.log('Member dequeued and sent to voicemail:', member.callSid);

      const { data, error } = await supabase
        .from('calls')
        .update({ call_status: 'voicemail' })
        .eq('call_sid', callSid);

      if (error) {
        console.log(error)
        throw error;
      }

      callback(null, 'Caller sent to voicemail');
    } else {
      callback('No queue found.');
    }
  } catch (error) {
    const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
    callback(detailedError);
  }
};

async function checkCallerCallIsActive(client, callSid) {
  const queuedCalls = await client.calls.list({ status: 'queued' });
  const ringingCalls = await client.calls.list({ status: 'ringing' });
  const inProgressCalls = await client.calls.list({ status: 'in-progress' });

  const calls = [...queuedCalls, ...ringingCalls, ...inProgressCalls];
  const callNumbers = calls.map(call => call.sid);

  return callNumbers.includes(callSid);
}
