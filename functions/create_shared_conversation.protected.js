const { createClient } = require('@supabase/supabase-js');
const { Expo } = require('expo-server-sdk')

exports.handler = async function (context, event, callback) {
  const client = context.getTwilioClient();
  const conversationsSid = event.ConversationSid;
  const serviceSid = event.ChatServiceSid;
  const friendlyName = "Development Contact";
  const incomingNumber = event.Author;
  const incomingMessage = event.Body;
  const supabaseUrl = context.SUPABASE_URL;
  const supabaseKey = context.SUPABASE_API_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    let updateParams = {
      friendlyName: friendlyName
    };

    let attributes = {
      lastMessage: incomingMessage ? incomingMessage : "Attachment"
    };

    if (incomingNumber !== 'shared_user_identity') {
      attributes.name = incomingNumber;
      attributes.phone = incomingNumber;

      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('phone', incomingNumber)

        if (error) {
          throw error;
        }

        if (data.length > 0) {
          attributes.name = data[0].name;
        }

      } catch (error) {
        console.log("Error getting contact information for conversation or did not find contact:", error);
      }

      updateParams.attributes = JSON.stringify(attributes);

      try {
        const { data, error } = await supabase
          .from('call_operators')
          .select(`*,
                    employees(
                        id,
                        expo_push_token
                    )
                `)
          .eq('is_available', true)

        if (error) {
          throw error;
        }

        console.log("attributes:", attributes);

        const formattedName = formatPhoneNumber(attributes.name)

        data.forEach(operator => {
          sendNotification(operator.employees.expo_push_token, formattedName, attributes.lastMessage)
        });

      } catch (error) {
        console.error("Error sending notification to available operators:", error);
      }
    }

    // Update the conversation's friendly name and attributes (if necessary)
    await client.conversations.v1.services(serviceSid).conversations(conversationsSid).update(updateParams);

    // Fetch the list of participants in the conversation
    const participants = await client.conversations.v1.services(serviceSid).conversations(conversationsSid).participants.list();

    // Check if shared_user_identity is already a participant
    const isParticipant = participants.find(
      participant => participant.identity === 'shared_user_identity'
    );

    if (!isParticipant) {
      // If shared_user_identity is not a participant, add them
      const participant = await client.conversations.v1.services(serviceSid).conversations(conversationsSid).participants.create({
        identity: 'shared_user_identity'
      });

      client.conversations.v1.participantConversations
        .list({
          identity: 'shared_user_identity',
          limit: 150
        })
        .then(participantConversations => {
          // Sort the participantConversations array in ascending order based on conversationDateUpdated
          const sortedParticipantConversations = participantConversations.sort((a, b) =>
            new Date(a.conversationDateUpdated) - new Date(b.conversationDateUpdated)
          );

          // Calculate the number of conversations to remove the participant from
          const conversationsToRemove = sortedParticipantConversations.length - 99;

          if (conversationsToRemove <= 0) {
            console.log('shared_user_identity is already in 99 or fewer conversations');
            return;
          }

          // Remove 'shared_user_identity' from the oldest conversations
          const conversationsToRemoveParticipant = sortedParticipantConversations.slice(0, conversationsToRemove);

          // Create an array of promises to remove the participant from each conversation
          const removeParticipantPromises = conversationsToRemoveParticipant.map(pc =>
            client.conversations.v1
              .services(serviceSid)
              .conversations(pc.conversationSid)
              .participants('shared_user_identity')
              .remove()
          );

          // Wait for all the promises to resolve
          return Promise.all(removeParticipantPromises);
        })
        .then(() => {
          console.log(`Removed shared_user_identity from the oldest conversations. Remaining conversations: 99`);
        })
        .catch(err => console.error(err));
    }

    callback(null, "Success");
  } catch (err) {
    console.log(err);
    callback(err);
  }
};

async function sendNotification(somePushToken, title, body) {
  // Create a new Expo SDK client
  // optionally providing an access token if you have enabled push security
  // let expo = new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN });
  let expo = new Expo();

  const somePushTokens = [somePushToken] // An array of the push tokens you want to send the notification to

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
      title: title,
      body: body,
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
}

// Later, after the Expo push notification service has delivered the
// notifications to Apple or Google (usually quickly, but allow the service
// up to 30 minutes when under load), a "receipt" for each notification is
// created. The receipts will be available for at least a day; stale receipts
// are deleted.
//
// The ID of each receipt is sent back in the response "ticket" for each
// notification. In summary, sending a notification produces a ticket, which
// contains a receipt ID you later use to get the receipt.
//
// The receipts may contain error codes to which you must respond. In
// particular, Apple or Google may block apps that continue to send
// notifications to devices that have blocked notifications or have uninstalled
// your app. Expo does not control this policy and sends back the feedback from
// Apple and Google so you can handle it appropriately.
async function checkStatus(tickets) {
  let receiptIds = [];
  for (let ticket of tickets) {
    // NOTE: Not all tickets have IDs; for example, tickets for notifications
    // that could not be enqueued will have error information and no receipt ID.
    if (ticket.id) {
      receiptIds.push(ticket.id);
    }
  }

  let receiptIdChunks = expo.chunkPushNotificationReceiptIds(receiptIds);
  (async () => {
    // Like sending notifications, there are different strategies you could use
    // to retrieve batches of receipts from the Expo service.
    for (let chunk of receiptIdChunks) {
      try {
        let receipts = await expo.getPushNotificationReceiptsAsync(chunk);
        console.log(receipts);

        // The receipts specify whether Apple or Google successfully received the
        // notification and information about an error, if one occurred.
        for (let receiptId in receipts) {
          let { status, message, details } = receipts[receiptId];
          if (status === 'ok') {
            continue;
          } else if (status === 'error') {
            console.error(
              `There was an error sending a notification: ${message}`
            );
            if (details && details.error) {
              // The error codes are listed in the Expo documentation:
              // https://docs.expo.io/push-notifications/sending-notifications/#individual-errors
              // You must handle the errors appropriately.
              console.error(`The error code is ${details.error}`);
            }
          }
        }
      } catch (error) {
        console.error(error);
      }
    }
  })();
}

function formatPhoneNumber(phoneNumber) {
  // Ensure the input is a string and remove any non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');

  // Check if we have at least 10 digits to format properly
  if (digits.length >= 10) {
    // Extract the last 10 digits (standard US phone number length)
    const match = digits.slice(-10).match(/^(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      // Format and return the phone number
      return `(${match[1]}) ${match[2]}-${match[3]}`;
    }
  }

  // If input is invalid or too short, just return the original input
  return phoneNumber;
} 