const { createClient } = require('@supabase/supabase-js');
// V2 APPROVED (NOTE)
exports.handler = async function (context, event, callback) {
  const { CallSid } = event;

  // Get the voicemail recording URL from the event object
  const recordingUrl = event.RecordingUrl;

  // Create a Supabase client instance
  const supabaseUrl = context.SUPABASE_URL;
  const supabaseKey = context.SUPABASE_API_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Prepare the authorization header for fetching the recording
  const authToken = Buffer.from(context.ACCOUNT_SID + ':' + context.AUTH_TOKEN).toString('base64');
  const authHeader = { Authorization: `Basic ${authToken}` };

  const endTime = new Date().toISOString();

  try {
    // Fetch the voicemail recording file from the URL with authorization
    const response = await fetch(recordingUrl, { headers: authHeader });
    const fileData = await response.arrayBuffer();

    // Generate a unique filename for the voicemail recording
    const filename = `${CallSid}.wav`; // Added file extension for clarity

    // Upload the voicemail file to Supabase storage
    const { data, error } = await supabase.storage
      .from('voicemails')
      .upload(filename, fileData, {
        contentType: 'audio/wav', // Set content type for audio files
      });

    if (error) {
      throw error
    }

    console.log('Voicemail uploaded successfully:', data);

    return callback(null);
  } catch (error) {
    const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))

    return callback(detailedError);
  }
};