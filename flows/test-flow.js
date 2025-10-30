module.exports = async function(client) {
  // This flow doesn't actually use the browser - it just tests the CLI logic
  console.log('🧪 Test flow: Testing CLI without browser');
  
  const result = {
    message: 'Test flow executed successfully!',
    timestamp: new Date().toISOString(),
    clientType: client.constructor.name
  };
  
  return result;
};