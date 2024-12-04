const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (context, event, callback) {
  const callSid = event.customerCallSid;
  const queueName = context.QUEUE_NAME;
  const client = new Twilio(context.ACCOUNT_SID, context.AUTH_TOKEN);
  const supabaseUrl = context.SUPABASE_URL_STAGING;
  const supabaseKey = context.SUPABASE_API_KEY_STAGING;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const isActive = await checkCallerCallIsActive(client, callSid);

    if (!isActive) {
      console.log("Caller left before sending warning")
      callback(null)
    }

    const queues = await client.queues.list({
      friendlyName: queueName,
      limit: 1,
    });

    if (queues.length > 0) {
      const queueSid = queues[0].sid;
      await checkQueueSize(client, queueSid, callback, supabase, context, callSid);
    } else {
      console.log('No queue found with that friendly name.');
      callback(null, 'No queue found.');
    }
  } catch (error) {
    const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
    callback(detailedError);
  }
};

async function checkQueueSize(client, queueSid, callback, supabase, context, callSid) {
  try {
    const queue = await client.queues(queueSid).fetch();
    const currentSize = queue.currentSize;

    if (currentSize > 0) {
      const { data, error } = await supabase
        .from('call_operators')
        .select('id, employees(phone)')
        .eq('is_available', true);

      if (error) {
        throw error;
      }

      // Get caller name

      const { data: callData, error: callError } = await supabase
        .from('calls')
        .select('*')
        .eq('call_sid', callSid)
        .single();

      if (callError) {
        throw callError;
      }

      const callerName = callData.caller_name ? callData.caller_name : "Unknown"

      const sendTextPromises = data.map(operator => {
        const phoneNumber = operator.employees.phone;
        return client.messages.create({
          body: 'Warning: ' + callerName + ' is left unhandled in the queue. Call in to connect.',
          from: context.TWILIO_NUMBER_STAGING,
          to: phoneNumber,
        });
      });

      await Promise.all(sendTextPromises);
      console.log('Queued client warning sent successfully');
      callback(null);
    } else {
      console.log('Queue is empty. Not sending text.');
      callback(null);
    }
  } catch (error) {
    const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
    callback(detailedError);
  }
}

async function checkCallerCallIsActive(client, callSid) {
  const queuedCalls = await client.calls.list({ status: 'queued' });
  const ringingCalls = await client.calls.list({ status: 'ringing' });
  const inProgressCalls = await client.calls.list({ status: 'in-progress' });

  const calls = [...queuedCalls, ...ringingCalls, ...inProgressCalls];

  const callNumbers = calls.map(call => call.sid);

  if (callNumbers.includes(callSid)) {
    return true;
  } else {
    return false;
  }
}
