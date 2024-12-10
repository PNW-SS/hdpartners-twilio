exports.handler = async function (context, event, callback) {

    const { From } = event;
    const client = context.getTwilioClient()

    try {
        await client.messages.create({
            body: "Thank you for calling Ben's plumbing. Sorry we missed your call. We will get back to you as soon as possible!", // TODO: Maybe in future add client name for personalization
            from: context.TWILIO_PHONE_NUMBER,
            to: From
        });

    } catch (error) {
        const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
        twiml.dial(fallBackNumber);
        return callback(detailedError, twiml);
    }

    return callback(null, twiml);
};