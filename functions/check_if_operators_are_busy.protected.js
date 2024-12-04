exports.handler = async function (context, event, callback) {
    const client = context.getTwilioClient();
    let availability = 'available';
    let operatorsToCall = [];
  
    try {
      const availableOperators = JSON.parse(event.availableOperators);
      const participantList = JSON.parse(event.participantList);
  
      // Get calls for each status separately
      const queuedCalls = await client.calls.list({ status: 'queued' });
      const ringingCalls = await client.calls.list({ status: 'ringing' });
      const inProgressCalls = await client.calls.list({ status: 'in-progress' });
  
      // Combine the calls from all statuses
      const calls = [...queuedCalls, ...ringingCalls, ...inProgressCalls];
  
      // Extract the "to" and "from" phone numbers from the calls
      const callNumbers = calls.flatMap(call => [call.to, call.from]);
  
      // Filter out operators who are already in the calls list or participant list
      operatorsToCall = availableOperators.filter(
        operator =>
          !callNumbers.includes(operator.employees.phone) &&
          !participantList.includes(operator.id.toString())
      );
  
  
      if (operatorsToCall.length === 0) {
        console.log('No operators available to call');
        availability = 'unavailable';
      }
    } catch (error) {
      const detailedError = JSON.stringify(error, Object.getOwnPropertyNames(error))
      return callback(detailedError);
    }
  
    console.log('Operators to call:', operatorsToCall);
  
    const operatorsStr = JSON.stringify(operatorsToCall);
    callback(null, { availability: availability, operatorsToCall: operatorsStr });
  };