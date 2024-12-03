
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (context, event, callback) {
  const supabaseUrl = context.SUPABASE_URL_STAGING;
  const supabaseKey = context.SUPABASE_API_KEY_STAGING;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const recordingSid = event.RecordingSid;
  const callSid = event.CallSid;

  try {
    const { data, error } = await supabase
      .from('calls')
      .update({ recording_sid: recordingSid})
      .eq('call_sid', callSid);

    if (error) {
      // does not show a helpful error
      throw error;
    }

    console.log("Recording logged successfully");

    return callback(null)

  } catch (error) {
    const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
    return callback(detailedError)
  }
}

// handle logic to delete old recordings