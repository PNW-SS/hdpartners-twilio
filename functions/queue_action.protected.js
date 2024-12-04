// queue_action

const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (context, event, callback) {

  const callSid = event.CallSid;
  const queueResult = event.QueueResult

  const supabaseUrl = context.SUPABASE_URL_STAGING;
  const supabaseKey = context.SUPABASE_API_KEY_STAGING;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const endTime = new Date().toISOString();

  let status = queueResult && ['hangup', 'system-error', 'queue-full', 'leave', 'error'].includes(queueResult)

  if (status) {
    try {
      const { error } = await supabase
        .from('calls')
        .update({ end_time: endTime })
        .eq('call_sid', callSid);

      if (error) {
        throw error
      }

      return callback(null);

    } catch (error) {
      const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
      return callback(detailedError);
    }
  } else {
    console.log('Call redirected out of the queue')
    return callback(null);
  }
}