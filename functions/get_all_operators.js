const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (context, event, callback) {
  const supabaseUrl = context.SUPABASE_URL_STAGING;
  const supabaseKey = context.SUPABASE_API_KEY_STAGING;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data, error } = await supabase
      .from('call_operators')
      .select('id, employees(phone)');

    if (error) {
      throw error;
    }

    let caller = 'client'; // Default caller type
    let id;
    data.forEach(operator => {
      if (operator.employees.phone === event.from) {
        caller = 'operator'; // Change caller type if condition is met
        id = operator.id;
      }
    });

    callback(null, { caller, id });
    
  } catch (error) {
    const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
    
    callback(detailedError);
  }
};
