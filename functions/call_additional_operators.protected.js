const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (context, event, callback) {
  const supabaseUrl = context.SUPABASE_URL_STAGING;
  const supabaseKey = context.SUPABASE_API_KEY_STAGING;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const client = context.getTwilioClient();
  let operatorsToCall = JSON.parse(decodeURIComponent(event.operatorsToCall));
  const currentlyCalling = operatorsToCall.shift();
  const customerCallSid = event.customerCallSid;

  const twimlForCurrentCall = new Twilio.twiml.VoiceResponse();
  twimlForCurrentCall.hangup();

  let callerName = 'unknown';

  try {
    const { data, error } = await supabase
      .from('calls')
      .select('call_sid, caller_name')
      .eq('call_sid', customerCallSid)
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

  checkIfQueueEmpty(context, client)
    .then((queueEmpty) => {
      if (queueEmpty) {
        console.log("Queue is empty, not making secondary call");
        callback(null, twimlForCurrentCall);
      } else {

        const twiml = new Twilio.twiml.VoiceResponse();
        const gather = twiml.gather({
          numDigits: 1,
          action: `https://hd-partners-5655.twil.io/add_agent_or_voicemail?currentlyCallingId=${currentlyCalling.id}&callSid=${customerCallSid}`,
          method: 'POST',
          timeout: 5,
        });

        gather.say(`Incoming call from ${callerName}`);

        const redirectUrl = operatorsToCall.length > 0
          ? `https://hd-partners-5655.twil.io/call_additional_operators?customerCallSid=${customerCallSid}&operatorsToCall=${encodeURIComponent(JSON.stringify(operatorsToCall))}`
          : `https://hd-partners-5655.twil.io/nobody_picked_up?customerCallSid=${customerCallSid}`;
        twiml.redirect({ method: 'POST' }, redirectUrl);

        client.calls
          .create({
            to: currentlyCalling.employees.phone,
            from: context.TWILIO_NUMBER_STAGING,
            twiml: twiml.toString(),
          })
          .then(call => {
            console.log("Making backupcall:", call.sid);
          })
          .catch(error => {
            console.error("Error making call", error)
          })
          .finally(() => {
            callback(null, twimlForCurrentCall);
          });
      }
    })
    .catch((error) => {
      const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
      callback(detailedError);
    });
};

function checkIfQueueEmpty(context, client) {
  return new Promise((resolve, reject) => {
    const queueName = context.QUEUE_NAME;
    client.queues.list({ friendlyName: queueName, limit: 1 })
      .then(queues => {
        if (queues.length > 0) {
          const queueSid = queues[0].sid;
          client.queues(queueSid).fetch()
            .then(queue => {
              const currentSize = queue.currentSize;
              resolve(currentSize === 0);
            })
            .catch(error => {
              console.error('Error fetching queue size:', error);
              reject(error);
            });
        } else {
          console.log('No queue found with that friendly name.');
          resolve(true);
        }
      })
      .catch(error => {
        console.error('Error fetching queue:', error);
        reject(error);
      });
  });
}