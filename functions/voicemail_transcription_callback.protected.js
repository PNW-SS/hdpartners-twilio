const { createClient } = require('@supabase/supabase-js');
// V2 APPROVED (NOTE)
exports.handler = async function (context, event, callback) {

  // Create a Supabase client instance
  const supabaseUrl = context.SUPABASE_URL;
  const supabaseKey = context.SUPABASE_API_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Information from event
  const callSid = event.CallSid;
  const transcriptionText = event.TranscriptionText;

  try {
    // Update the table row with the new transcription text
    const { data, error } = await supabase
      .from('calls')
      .update({ transcription: transcriptionText })
      .match({ call_sid: callSid });

    if (error) {
      throw error
    }

    console.log('Transcription updated successfully')

    return callback(null);

  } catch (error) {

    const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))

    return callback(detailedError);
  }
};