const { createClient } = require('@supabase/supabase-js');
const { Expo } = require('expo-server-sdk')

// TODO: add error handling logic
exports.handler = async function (context, event, callback) {
  const supabase = createClient(
    context.SUPABASE_URL,
    context.SUPABASE_API_KEY
  );
  const client = context.getTwilioClient()
  const twiml = new Twilio.twiml.VoiceResponse();

  const isWeezies = context.SECONDARY_NUMBERS.split(',').includes(event.ForwardedFrom);

  const { customerCallSid, fromNumber } = event;

  const callStatus = 'hunting'

  let callerName = 'Unknown';

  if (event.callerName) {
    try {
      callerName = JSON.parse(event.callerName);
    } catch (error) {
      // If callerName cannot be parsed
    }
  } else {
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
        .fetch({ fields: 'call_name' });
      callerName = phoneNumber.callerName?.call_name ? ('Maybe: ' + phoneNumber.callerName?.call_name) : callerName;
    }
  }

  if (isWeezies && !callerName.includes('Wezee')) {
    callerName += ' (Wezee)';
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
      customer_call_name: callerName,
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
      }, operator.id + ':' + context.TENANT_IDENTIFIER
    );

    client.parameter({
      name: 'call_name',
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

    await sendNotification(supabase, callerName);
  }

  return callback(null, twiml);
};


// Temp function to send push notification
async function sendNotification(supabase, callerName) {
  try {
    const { data: operatorsData, error: operatorsError } = await supabase
      .from('call_operators')
      .select(`
          *,
          employees(
            expo_push_token
          )
        `)
      .eq('is_available', 'true')

    if (operatorsError) {
      throw operatorsError;
    }

    let somePushTokens = operatorsData.map(operator => operator.employees.expo_push_token);

    // Create a new Expo SDK client
    // optionally providing an access token if you have enabled push security
    // let expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });
    let expo = new Expo();

    console.log(somePushTokens);

    // Create the messages that you want to send to clients
    let messages = [];
    for (let pushToken of somePushTokens) {
      // Each push token looks like ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]

      // Check that all your push tokens appear to be valid Expo push tokens
      if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Push token ${pushToken} is not a valid Expo push token`);
        continue;
      }

      // Construct a message (see https://docs.expo.io/push-notifications/sending-notifications/)
      messages.push({
        to: pushToken,
        sound: 'default',
        title: `${callerName} has been enqueued`,
        body: 'Please enter queue to handle the call',
        data: { withSome: 'data' },
      })
    }

    // The Expo push notification service accepts batches of notifications so
    // that you don't need to send 1000 requests to send 1000 notifications. We
    // recommend you batch your notifications to reduce the number of requests
    // and to compress them (notifications with similar content will get
    // compressed).
    let chunks = expo.chunkPushNotifications(messages);
    let tickets = [];
    (async () => {
      // Send the chunks to the Expo push notification service. There are
      // different strategies you could use. A simple one is to send one chunk at a
      // time, which nicely spreads the load out over time:
      for (let chunk of chunks) {
        try {
          let ticketChunk = await expo.sendPushNotificationsAsync(chunk);
          console.log(ticketChunk);
          tickets.push(...ticketChunk);
          // NOTE: If a ticket contains an error code in ticket.details.error, you
          // must handle it appropriately. The error codes are listed in the Expo
          // documentation:
          // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
        } catch (error) {
          console.error(error);
        }
      }
    })();
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}
