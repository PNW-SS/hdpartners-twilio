const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (context, event, callback) {
  const client = new Twilio(context.ACCOUNT_SID, context.AUTH_TOKEN);
  const supabaseUrl = context.SUPABASE_URL_STAGING;
  const supabaseKey = context.SUPABASE_API_KEY_STAGING;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let summary = 'Unable to generate summary'

  try {
    if (!event.transcript_sid) {
      throw 'No customer key found';
    }

    const operatorResults = await client.intelligence.v2.transcripts(event.transcript_sid)
      .operatorResults
      .list({ redacted: false });

    operatorResults.forEach(result => {
      if (result.textGenerationResults && result.textGenerationResults.result) {
        console.log(result.textGenerationResults.result);
        summary = result.textGenerationResults.result;
      }
    });

    const { data, error } = await supabase
      .from('calls')
      .update({ call_summary: summary })
      .eq('conference_sid', event.customer_key);

    if (error) {
      throw error;
    }

    return callback(null);

  } catch (error) {
    const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
    
    return callback(detailedError);
  }
};