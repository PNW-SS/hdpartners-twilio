exports.handler = (context, event, callback) => {
    // Create a new voice response object
    const twiml = new Twilio.twiml.VoiceResponse();
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
  
    // Check if the business is open or closed
    if (isOpen) {
      businessStatus = 'open';
    } else {
      businessStatus = 'closed';
    }
  
    // Use the callback to pass parameters to the next widget
    // The businessStatus can be used in the next widget to determine the flow based on the business status
    callback(null, {
      businessStatus: businessStatus
    });
  };
  