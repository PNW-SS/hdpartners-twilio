const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (context, event, callback) {

  const supabaseUrl = context.SUPABASE_URL_STAGING
  const supabaseKey = context.SUPABASE_API_KEY_STAGING;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data, error } = await supabase
      .from('call_operators')
      .select('id, priority, employees(phone)')
      .eq('is_available', true)

    if (error) {
      throw error;
    }

    if (data.length == 0) {
      // Send push notification warning to all operators that someone needs to enable their availability for callers
      console.log('No operators with availibity set to true')
    }

    const resp = JSON.stringify(data)
    return callback(null, { resp })

  } catch (error) {
    const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
    return callback(detailedError);
  }
};