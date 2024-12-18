const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (context, event, callback) {
  const supabase = createClient(context.SUPABASE_URL, context.SUPABASE_API_KEY);
  const { From } = event;

  const isWeezies = context.SECONDARY_NUMBERS.split(',').includes(event.ForwardedFrom);

  const twiml = new Twilio.twiml.VoiceResponse();

  // Check if call center is enabled
  try {
    const { data, error } = await supabase
      .from('communications_config')
      .select(`*`)
      .eq('id', 1) // TODO: Change to tenant_id
      .single();

    if (error) {
      throw error;
    }

    // If call center is not enabled, forward to fallback number
    if (!data.is_enabled) {
      twiml.dial(context.FALLBACK_NUMBER);
      return callback(null, twiml);
    }
      
    // Check if business is open

    // Grab the current date and time. Note that this is the local time where the
    // Function is being executed, not necessarily the time zone of business!
    const now = new Date();
    // Print the timezone of the instance that's running this code
    const functionTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  
    // Configure Intl.DateTimeFormat to return a date in the specified
    // time zone and in this format for parsing, for example: 'Monday, 18'
  
    const formatOptions = {
      hour: 'numeric',
      hour12: false,
      weekday: 'long',
      timeZone: 'America/Los_Angeles'
    };
  
    const formatter = new Intl.DateTimeFormat('en-US', formatOptions);
  
    // Get the current time and day of the week for your specific time zone
    const formattedDate = formatter.format(now).split(', ');
    const day = formattedDate[0]; // ex. 'Monday'
    const hour = Number(formattedDate[1]); // ex. 18
  
    // Since we're given days as strings, we can use Array.includes to check
    // against a list of days we want to consider the business closed
    const isWeekend = ['Saturday', 'Sunday'].includes(day);
  
    // Here the business is considered open M-F, 7am-6pm Pacific Time
    const isOpen = !isWeekend && hour >= 7 && hour < 18;  //18
  
    let gather;

    // If business is closed, gather for emergency or not
    if (!isOpen) {
      gather = twiml.gather({
        input: 'dtmf',
        timeout: 10,
        numDigits: 1,
        action: `${context.TWILIO_SERVER_URL}/split_on_emergency`,
        method: 'POST'
      })
      gather.play(`${context.TWILIO_SERVER_URL}/business_closed.mp3`);
      gather.play(`${context.TWILIO_SERVER_URL}/business_closed.mp3`); // Play twice for emphasis

    // If business is open, gather for operators or directory
    } else {
      gather = twiml.gather({
        input: 'dtmf',
        timeout: 10,
        numDigits: 1,
        action: `${context.TWILIO_SERVER_URL}/split_on_open`,
        method: 'POST'
      })

      if (isWeezies) {
        gather.say('Thank you for calling Weezies Plumbing. We recently joined forces with Bens Plumbing. Press 1 to reach Weezies Plumbing or press 2 for directory.');
        gather.say('Thank you for calling Weezies Plumbing. We recently joined forces with Bens Plumbing. Press 1 to reach Weezies Plumbing or press 2 for directory.'); // Play twice for emphasis
      } else {
        gather.play(`${context.TWILIO_SERVER_URL}/bens_or_dir.mp3`);
        gather.play(`${context.TWILIO_SERVER_URL}/bens_or_dir.mp3`); // Play twice for emphasis
      }
    }

    return callback(null, twiml);
    
  } catch (error) {
    const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
    twiml.dial(context.FALLBACK_NUMBER);
    return callback(detailedError, twiml);
  }
};