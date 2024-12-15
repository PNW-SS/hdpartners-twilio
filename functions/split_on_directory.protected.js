exports.handler = async function (context, event, callback) {
    const twiml = new Twilio.twiml.VoiceResponse();
    const { Digits } = event

    console.log('Herererer')

    switch (Digits) {
        case '1':
            // Michelle
            twiml.dial('+14155551212');
            break;
        case '2':
            // Nick
            twiml.dial('+14155551213');
            break;
        case '3':
            // Doug
            twiml.dial('+14155551214');
            break;
        case '4':
            // Callie
            twiml.dial('+14155551215');
            break;
        case '5':
            // Chris
            twiml.dial('+14155551216');
            break;
        case '6':
            // Maksim
            twiml.dial('+12067080199');
            break;
        default:
            twiml.redirect(`${context.TWILIO_SERVER_URL}/check_any_available_operators`);
            break;
    }

    return callback(null, twiml);
};