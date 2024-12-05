const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (context, event, callback) {
  const client = context.getTwilioClient();

  try {
    // Parse the media array from the event object
    const mediaArray = JSON.parse(event.Media);

    // Create a Supabase client instance
    const supabaseUrl = context.SUPABASE_URL;
    const supabaseKey = context.SUPABASE_API_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Process each media file
    for (const media of mediaArray) {
      const mediaSid = media.Sid;

      // Fetch the media file using the media SID
      const mediaInstance = await client.messages.media(mediaSid).fetch();

      // Get the media URL and content type
      const mediaUrl = mediaInstance.uri;
      const contentType = mediaInstance.contentType;

      // Fetch the media file from the URL
      const response = await fetch(mediaUrl);
      const fileData = await response.arrayBuffer();

      // Generate a unique filename for the media file
      const filename = `${mediaSid}.${contentType.split('/')[1]}`;

      // Upload the media file to Supabase storage
      const { data, error } = await supabase.storage
        .from('media')
        .upload(filename, fileData, {
          contentType: contentType,
        });

      if (error) {
        console.error('Error uploading media:', error);
        throw error

      } else {
        console.log('Media uploaded successfully:', data);
      }
    }

  } catch (error) {
    const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))

    callback(detailedError);
  }

  callback(null);
};
