
const axios = require('axios');

exports.handler = async function(context, event, callback) {
  const discordWebhookUrl = context.DISCORD_WEBHOOK_URL;
  const developerSupportNumber = context.DEVELOPER_SUPPORT_NUMBER;
  const twilioNumber = context.TWILIO_NUMBER_STAGING;
  const payload = event.Payload;
  const errorSid = event.Sid;
  const env = "Twilio";

  // ignore short media and transcript length error

  const errorCode = JSON.parse(payload).error_code;

  if (errorCode === '95109' || errorCode === '13617') {
    console.log("ignore error")
    return callback(null)
  }

  const mobileMessage = {
    content: `Env: ${env}, ErrorSid: ${errorSid}`
  };

  const discordMessage = {
    content: `Env: ${env}, ErrorSid: ${errorSid}, Payload: ${payload}`
  };

  try {
    // Send SMS to developer support
    // const client = context.getTwilioClient()
    // await client.messages.create({
    //   body: mobileMessage.content,
    //   from: twilioNumber,
    //   to: developerSupportNumber
    // });
    // console.log('SMS sent successfully');

    // Send Discord webhook
    await axios.post(discordWebhookUrl, discordMessage);
    // console.log('Webhook sent successfully');

  } catch (error) {
    // console.log('Error reporting error:', error);
  }

  return callback(null);
  
};