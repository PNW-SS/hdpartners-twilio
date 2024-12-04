
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (context, event, callback) {
  const conferenceName = event.FriendlyName;
  const conferenceSid = event.ConferenceSid;
  const statusCallbackEvent = event.StatusCallbackEvent;
  const reasonParticipantLeft = event.ReasonParticipantLeft
  const reasonConferenceEnded = event.ReasonConferenceEnded;
  const endConferenceOnExit = event.EndConferenceOnExit
  const supabaseUrl = context.SUPABASE_URL_STAGING;
  const supabaseKey = context.SUPABASE_API_KEY_STAGING;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const client = context.getTwilioClient();

  if (reasonConferenceEnded == 'participant-with-end-conference-on-exit-left' || statusCallbackEvent === 'conference-end') {
    const endTime = new Date().toISOString();

    try {
      const { data, error } = await supabase
        .from('calls')
        .update({ end_time: endTime, conference_sid: conferenceSid })
        .or('and(operator.eq.' + conferenceName + ',end_time.is.null),conference_sid.eq.' + conferenceSid)
        .select()
        .single();

      if (error) {
        throw error;
      }

      await client.calls(data.call_sid).update({ status: "completed" });

      console.log('Conference end time logged successfully');
    } catch (error) {
      const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
      return callback(detailedError);
    }
  }

  if (reasonParticipantLeft === 'participant_hung_up' && endConferenceOnExit === 'false') {

    try {
      const { data, error } = await supabase
        .from('calls')
        .update({ additional_participant_number: null, additional_participant_sid: null })
        .eq('operator', conferenceName) // Temp reference to conference
        .is('end_time', null);

      if (error) {
        throw error;
      }

      console.log('Conference additional participant logged successfully');
    } catch (error) {
      const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
      return callback(detailedError);
    }
  }

  if (statusCallbackEvent === 'conference-start') {

    try {
      const { data, error } = await supabase
        .from('calls')
        .update({ conference_sid: conferenceSid })
        .eq('conference_sid', conferenceName) // Temp reference to conference
        .is('end_time', null);

      if (error) {
        throw error;
      }

      console.log('Conference start logged successfully');
    } catch (error) {
      const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
      return callback(detailedError);
    }
  }

  return callback(null);
};