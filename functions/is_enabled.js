const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (context, event, callback) {
  const supabaseUrl = context.SUPABASE_URL_STAGING;
  const supabaseKey = context.SUPABASE_API_KEY_STAGING;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data, error } = await supabase
      .from('communications_config')
      .select(`*`)
      .eq('id', 1) // TODO: Change to tenant_id
      .single();

    if (error) {
      throw error;
    }

    const isCallCenterEnabled = data.is_enabled ? 'enabled' : 'disabled';

    console.log("Call center status: ", isCallCenterEnabled)

    const response = new Twilio.Response();
    response.appendHeader('Content-Type', 'application/json');
    response.setBody({ isCallCenterEnabled });
    
    callback(null, response);
    
  } catch (error) {
    const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
    callback(detailedError);
  }
};