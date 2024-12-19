const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (context, event, callback) {
    const { CallSid, From } = event;
    const supabaseUrl = context.SUPABASE_URL;
    const supabaseKey = context.SUPABASE_API_KEY;
    const isWeezies = context.SECONDARY_NUMBERS.split(',').includes(event.ForwardedFrom);
    const supabase = createClient(supabaseUrl, supabaseKey);

    const twiml = new Twilio.twiml.VoiceResponse();
    const client = context.getTwilioClient();

    const callStatus = 'Voicemail';
    const endTime = new Date().toISOString();
    try {
        // Get caller name
        let callerName = 'Unknown';

        const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('name')
            .eq('phone', From);

        if (clientError) {
            throw clientError;
        }

        if (clientData.length > 0) {
            callerName = clientData[0].name;
        } else {
            const phoneNumber = await client.lookups.v2.phoneNumbers(From)
                .fetch({ fields: 'caller_name' });
            callerName = phoneNumber.callerName?.caller_name ? ('Maybe: ' + phoneNumber.callerName?.caller_name) : callerName;
        }

        let companyName = 'Ben\'s Plumbing';

        if (isWeezies) {
            callerName += ' (Wezee)';
            companyName = 'Wezee Plumbing';
        }

        const { error } = await supabase
            .from('calls')
            .upsert({
                call_sid: CallSid,
                from_number: From,
                call_status: callStatus,
                caller_name: callerName,
                end_time: endTime
            }, { onConflict: ['call_sid'] });

        if (error) {
            throw error;
        }

        // TODO: Fix messaging service
        await client.messages.create({
            body: "Thank you for calling " + companyName + ". Sorry we missed your call. We will get back to you as soon as possible!", // TODO: Maybe in future add client name for personalization
            from: context.TWILIO_NUMBER,
            to: From
        });

    } catch (error) {
        console.error('Error:', error);
        const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
        twiml.dial(context.FALLBACK_NUMBER);
        return callback(detailedError, twiml);
    }

    twiml.hangup();

    return callback(null, twiml);
};