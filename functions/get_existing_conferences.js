exports.handler = function (context, event, callback) {
    const client = context.getTwilioClient();
  
    // Fetch existing conferences
    let participantList = [];
    
    client.conferences.list({ status: 'in-progress' })
      .then(async (conferences) => {
        if (conferences.length > 0) {
          // Iterate over each conference
          for (const conference of conferences) {
            participantList.push(conference.friendlyName)
          }
        }
  
        const resp = JSON.stringify(participantList)
        callback(null, { resp });
  
      })
      .catch(err => {
        const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
        callback(detailedError);
      });
  };