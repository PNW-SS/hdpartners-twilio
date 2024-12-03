const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (context, event, callback) {
  const { callSid, fromNumber, callStatus, callerName } = event;
  const supabaseUrl = context.SUPABASE_URL_STAGING;
  const supabaseKey = context.SUPABASE_API_KEY_STAGING;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const endTime = new Date().toISOString();
  
  try {
    // Insert call log into Supabase
    const { data, error } = await supabase
      .from('calls')
      .insert({
        call_sid: callSid,
        from_number: fromNumber,
        call_status: callStatus,
        caller_name: callerName,
        end_time: endTime
      });

    if (error) {
      throw error;
    }

    callback(null, {
      statusCode: 200,
      body: JSON.stringify(data),
    });

  } catch (error) {
    const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
    callback(detailedError);
  }
};