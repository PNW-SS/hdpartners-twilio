const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (context, event, callback) {
  const supabaseUrl = context.SUPABASE_URL_STAGING;
  const supabaseKey = context.SUPABASE_API_KEY_STAGING;
  const supabase = createClient(supabaseUrl, supabaseKey);
  const client = context.getTwilioClient();
  const { fromNumber } = event;

  let callerName = 'Unknown';

    console.log('XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')

  try {
    // Determine caller name
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('name')
      .eq('phone', fromNumber);

    if (clientError) {
      throw clientError;
    }

    if (clientData.length > 0) {
      callerName = clientData[0].name;
    } else {
      const phoneNumber = await client.lookups.v2.phoneNumbers(fromNumber)
        .fetch({ fields: 'caller_name' });
      callerName = phoneNumber.callerName?.caller_name || callerName;
    }

    const resp = JSON.stringify(callerName)
    return callback(null, { resp })

  } catch (error) {
    console.error("Error determining caller name:", error);
    const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
    
    callback(detailedError);
  }
};
