const { createClient } = require('@supabase/supabase-js');
exports.handler = async function (context, event, callback) {
    const client = new Twilio(context.ACCOUNT_SID, context.AUTH_TOKEN);
    const conferenceName = event.FriendlyName;
    const callSid = event.CallSid;
    const clientCallSid = event.clientCallSid;
    const conferenceSid = event.ConferenceSid;
    const sequenceNumber = event.SequenceNumber;
    const statusCallbackEvent = event.StatusCallbackEvent;
    const reasonParticipantLeft = event.ReasonParticipantLeft;
    const queueName = context.QUEUE_NAME;

    try {
        if ((statusCallbackEvent === 'participant-leave' && reasonParticipantLeft === 'moderator_ended_conference') || statusCallbackEvent === 'conference-end') {
            await logEndOfConference(conferenceName, context, callback, callSid)
        } else if (sequenceNumber !== '1') {
            callback(null, 'Ignoring callback');
        } else {
            if (clientCallSid) {
                const isActive = await checkCallerCallIsActive(client, clientCallSid);
                if (!isActive) {
                    await client.calls(callSid).update({ status: 'completed' });
                    console.log("Caller left before connecting to agent");
                    callback(null, "Caller left the call");
                    return;
                }
            }

            const queueSid = await fetchQueueSid(client, queueName);
            if (queueSid) {
                await checkQueueSizeAndDequeue(client, queueSid, callback, conferenceName, callSid, context, conferenceSid);
            } else {
                console.log('No queue found with that friendly name.');
                callback(null, 'No queue found.');
            }
        }
    } catch (error) {
        const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
        callback(detailedError);
    }
};

async function fetchQueueSid(client, queueName) {
    try {
        const queues = await client.queues.list({ friendlyName: queueName, limit: 1 });
        return queues.length > 0 ? queues[0].sid : null;
    } catch (error) {
        console.error('Error fetching queue:', error);
        throw error;
    }
}

async function checkQueueSizeAndDequeue(client, queueSid, callback, conferenceName, callSid, context, conferenceSid) {
    try {
        const queue = await client.queues(queueSid).fetch();
        const currentSize = queue.currentSize;
        if (currentSize > 0) {
            await dequeueFromQueue(client, queueSid, callback, conferenceName, context, conferenceSid);
        } else {
            console.log('Queue is empty. Announcing "No more callers in queue".');
            await announceNoMoreCallers(client, callSid, callback);
        }
    } catch (error) {
        const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
        callback(detailedError);
    }
}

async function dequeueFromQueue(client, queueSid, callback, conferenceName, context, conferenceSid) {
    try {
        const member = await client.queues(queueSid).members('Front').update({
            url: `https://handler.twilio.com/twiml/EHf700802b84babc970e47194930ab2195?conferenceName=${conferenceName}`,
            method: 'GET'
        });
        console.log('Member dequeued and sent to conference:', member.callSid);
        await logStartOfConference(member.callSid, conferenceName, context, conferenceSid);
        callback(null, 'Member dequeued.');
    } catch (error) {
        const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
        callback(detailedError);
    }
}

async function announceNoMoreCallers(client, callSid, callback) {
    try {
        await client.calls(callSid).update({
            twiml: '<Response><Say>No more callers in the queue</Say></Response>'
        });
        console.log('Announced "No more callers in queue" in the conference.');
        callback(null, 'Announcement made.');
    } catch (error) {
        console.error('Error announcing conference:', error);
        await reportError(context, callSid, 'Dequeue_to_conference failed to announcing conference error');
        callback(error);
    }
}

async function logStartOfConference(callSid, conferenceName, context, conferenceSid) {
    const supabase = createClient(context.SUPABASE_URL_STAGING, context.SUPABASE_API_KEY_STAGING);
    try {
        const { error } = await supabase.from('calls').update({
            call_status: 'dequeued',
            operator: conferenceName,
            conference_sid: conferenceSid,
            end_time: null,
            additional_participant_number: null,
            additional_participant_sid: null
        }).eq('call_sid', callSid);

        if (error) throw error;
        console.log('Call updated successfully: marked as dequeued and conference details added');
    } catch (error) {
        console.error('Error updating call status and conference details:', error);
    }
}

async function logEndOfConference(conferenceName, context, callback, callSid) {
    const supabase = createClient(context.SUPABASE_URL_STAGING, context.SUPABASE_API_KEY_STAGING);
    const endTime = new Date().toISOString();
    try {
        const { error } = await supabase.from('calls').update({ end_time: endTime }).eq('operator', conferenceName).is('end_time', null);
        if (error) throw error;
        console.log('Conference end time logged successfully');
        callback(null, "Conference end time logged successfully")
    } catch (error) {
        console.error('Error updating end of conference:', error);
    }
}

async function checkCallerCallIsActive(client, callSid) {
    try {
        const [queuedCalls, ringingCalls, inProgressCalls] = await Promise.all([
            client.calls.list({ status: 'queued' }),
            client.calls.list({ status: 'ringing' }),
            client.calls.list({ status: 'in-progress' })
        ]);

        const callNumbers = [...queuedCalls, ...ringingCalls, ...inProgressCalls].map(call => call.sid);
        return callNumbers.includes(callSid);
    } catch (error) {
        console.error('Error checking call status:', error);
        throw error;
    }
}
