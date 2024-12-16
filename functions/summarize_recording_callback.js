const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (context, event, callback) {
  const client = new Twilio(context.TWILIO_ACCOUNT_SID, context.TWILIO_AUTH_TOKEN);
  const supabaseUrl = context.SUPABASE_URL;
  const supabaseKey = context.SUPABASE_API_KEY;
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

    const { error } = await supabase
      .from('calls')
      .update({ call_summary: summary })
      .eq('call_sid', event.customer_key);

    if (error) {
      throw error;
    }

    return callback(null, '<Response></Response>');

  } catch (error) {
    console.error(error);
    const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
    return callback(detailedError);
  }
};