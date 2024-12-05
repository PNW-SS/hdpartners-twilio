
exports.handler = async function(context, event, callback) {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    context.SUPABASE_URL,
    context.SUPABASE_API_KEY
  );	

  const { CallSid, operatorId } = event

  console.log('dequeue_callback event: ', event)

  const { error } = await supabase
    .from('calls')
    .update({ call_status: 'In-progress', operator: operatorId })
    .eq('call_sid', CallSid)


  if (error) {
    console.error('Error updating dequeued call status:', error);
    const detailedError = JSON.stringify(
      error,
      Object.getOwnPropertyNames(error)
    );
    return callback(detailedError);
  }

  // Two parties about to be connected
  return callback(null);
};