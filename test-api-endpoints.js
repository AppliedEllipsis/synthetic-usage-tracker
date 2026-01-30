/**
 * API Endpoint Testing Script
 * Tests various Synthetic.new API endpoints with the test key
 */

const API_KEY = 'syn_067d71519de9f74130907cf10a286897';
const BASE_URL = 'https://api.synthetic.new';

// Endpoints to test
const endpoints = [
  { method: 'GET', path: '/v2/quotas', description: 'Quota endpoint (v2)' },
  { method: 'GET', path: '/openai/v1/models', description: 'Models endpoint (OpenAI-compatible)' },
  { method: 'GET', path: '/v2/models', description: 'Models endpoint (v2)' },
  { method: 'GET', path: '/v1/models', description: 'Models endpoint (v1)' },
  { method: 'GET', path: '/v2/chat/completions', description: 'Chat completions (v2)' },
  { method: 'GET', path: '/v1/chat/completions', description: 'Chat completions (v1)' },
  { method: 'POST', path: '/v2/chat/completions', description: 'Chat completions POST (v2)', body: { model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: 'test' }] } },
  { method: 'POST', path: '/v1/chat/completions', description: 'Chat completions POST (v1)', body: { model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: 'test' }] } },
];

async function testEndpoint(endpoint) {
  const url = `${BASE_URL}${endpoint.path}`;
  const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Content-Type': 'application/json',
  };

  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${endpoint.description}`);
  console.log(`${'='.repeat(80)}`);
  console.log(`Method: ${endpoint.method}`);
  console.log(`URL: ${url}`);
  console.log(`Headers: Authorization: Bearer syn_***, Content-Type: application/json`);

  try {
    const options = {
      method: endpoint.method,
      headers,
    };

    if (endpoint.body) {
      options.body = JSON.stringify(endpoint.body);
      console.log(`Body: ${JSON.stringify(endpoint.body)}`);
    }

    const startTime = Date.now();
    const response = await fetch(url, options);
    const endTime = Date.now();
    const duration = endTime - startTime;

    console.log(`\nStatus Code: ${response.status} ${response.statusText}`);
    console.log(`Duration: ${duration}ms`);

    const contentType = response.headers.get('content-type');
    console.log(`Content-Type: ${contentType || 'N/A'}`);

    let responseBody;
    try {
      const text = await response.text();
      responseBody = text;
      console.log(`\nResponse Body:`);
      console.log(text);
    } catch (error) {
      console.log(`\nResponse Body: Unable to read`);
    }

    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      duration,
      contentType,
      body: responseBody,
      error: null,
    };

  } catch (error) {
    console.log(`\nError: ${error.message}`);
    return {
      success: false,
      status: null,
      statusText: null,
      duration: null,
      contentType: null,
      body: null,
      error: error.message,
    };
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(80));
  console.log('SYNTHETIC.NEW API ENDPOINT TESTING');
  console.log('='.repeat(80));
  console.log(`API Key: syn_*** (masked)`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Test Date: ${new Date().toISOString()}`);
  console.log(`Total Endpoints to Test: ${endpoints.length}`);

  const results = [];

  for (const endpoint of endpoints) {
    const result = await testEndpoint(endpoint);
    results.push({
      ...endpoint,
      ...result,
    });

    // Small delay between requests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));

  let successCount = 0;
  let failureCount = 0;

  results.forEach((result, index) => {
    const status = result.success ? '✓' : '✗';
    console.log(`\n${status} ${index + 1}. ${result.description}`);
    console.log(`   Path: ${result.path}`);
    console.log(`   Method: ${result.method}`);
    if (result.status) {
      console.log(`   Status: ${result.status} ${result.statusText}`);
    }
    if (result.duration) {
      console.log(`   Duration: ${result.duration}ms`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }

    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }
  });

  console.log('\n' + '-'.repeat(80));
  console.log(`Total: ${results.length} | Success: ${successCount} | Failure: ${failureCount}`);
  console.log('='.repeat(80) + '\n');

  // Return results for potential programmatic use
  return results;
}

// Run the tests
runTests().then(results => {
  // Exit with appropriate code
  const allSuccess = results.every(r => r.success);
  process.exit(allSuccess ? 0 : 1);
}).catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
