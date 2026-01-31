/**
 * Comprehensive API Endpoint Testing Script
 * Tests all Synthetic.new API endpoints to verify payloads and usage
 */

require('dotenv').config();

const API_KEY = process.env.SYNTHETIC_API_KEY || process.env.SYNTHETIC_TEST_API_KEY;

if (!API_KEY) {
  console.error('❌ Error: No API key found in environment variables!');
  console.error('Please set SYNTHETIC_API_KEY or SYNTHETIC_TEST_API_KEY in your .env file.');
  console.error('Copy .env.example to .env and add your API key.');
  process.exit(1);
}

const BASE_URLS = {
  v2: 'https://api.synthetic.new/v2',
  openai_v1: 'https://api.synthetic.new/openai/v1',
};

const ENDPOINTS = [
  { url: '/quotas', base: 'v2', name: 'Quotas (v2)' },
  { url: '/models', base: 'v2', name: 'Models (v2)' },
  { url: '/models', base: 'openai_v1', name: 'Models (OpenAI v1)' },
];

async function fetchEndpoint(baseUrl, endpoint, apiKey) {
  const url = `${baseUrl}${endpoint}`;
  console.log(`\n========================================`);
  console.log(`Testing: ${endpoint}`);
  console.log(`Full URL: ${url}`);
  console.log(`========================================`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    const status = response.status;
    const contentType = response.headers.get('content-type');

    console.log(`Status: ${status}`);
    console.log(`Content-Type: ${contentType}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`Error Response: ${errorText}`);
      return { success: false, status, error: errorText };
    }

    const data = await response.json();
    console.log(`Response Preview:`);

    const jsonPreview = JSON.stringify(data, null, 2);
    if (jsonPreview.length > 2000) {
      console.log(jsonPreview.substring(0, 2000) + '\n...(truncated for readability)');
    } else {
      console.log(jsonPreview);
    }

    return { success: true, status, data, contentType };
  } catch (error) {
    console.error(`Request failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testChatCompletion() {
  const url = `${BASE_URLS.openai_v1}/chat/completions`;
  console.log(`\n========================================`);
  console.log(`Testing: /chat/completions (POST)`);
  console.log(`Full URL: ${url}`);
  console.log(`========================================`);

  const body = {
    model: 'hf:meta-llama/Llama-3.1-8B-Instruct',
    messages: [
      { role: 'user', content: 'Say "Hello, Synthetic!"' },
    ],
    max_tokens: 10,
  };

  console.log(`Request Body:`, JSON.stringify(body, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const status = response.status;
    const contentType = response.headers.get('content-type');

    console.log(`Status: ${status}`);
    console.log(`Content-Type: ${contentType}`);

    if (!response.ok) {
      const errorData = await response.json();
      console.log(`Error Response:`, JSON.stringify(errorData, null, 2));
      return { success: false, status, error: errorData };
    }

    const data = await response.json();
    console.log(`Success! Response Preview:`);
    console.log(JSON.stringify(data, null, 2));

    return { success: true, status, data, contentType };
  } catch (error) {
    console.error(`Request failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Synthetic.new API Endpoint Test Suite                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const results = [];

  for (const endpoint of ENDPOINTS) {
    const baseUrl = BASE_URLS[endpoint.base];
    const result = await fetchEndpoint(baseUrl, endpoint.url, API_KEY);
    results.push({ ...endpoint, ...result });
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  results.push({
    name: 'Chat Completions (POST)',
    url: '/chat/completions',
    base: 'openai_v1',
    ...(await testChatCompletion()),
  });

  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  SUMMARY                                                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  results.forEach(result => {
    const statusIcon = result.success ? '✓' : '✗';
    console.log(`${statusIcon} ${result.name}`);
    console.log(`  URL: ${BASE_URLS[result.base]}${result.url}`);
    console.log(`  Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    if (result.status) {
      console.log(`  HTTP Status: ${result.status}`);
    }
    if (!result.success) {
      console.log(`  Error: ${result.error || 'Unknown error'}`);
    }
    console.log();
  });

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  ENDPOINT PAYLOAD ANALYSIS                                ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  results.forEach(result => {
    if (result.success && result.data) {
      console.log(`\n📊 ${result.name}`);
      console.log(`Key fields identified:`);

      // Analyze and display key fields
      const analyzeObject = (obj, prefix = '') => {
        Object.keys(obj).forEach(key => {
          const value = obj[key];
          const fullKey = prefix ? `${prefix}.${key}` : key;

          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            console.log(`  • ${fullKey} (object)`);
            analyzeObject(value, fullKey);
          } else if (Array.isArray(value)) {
            if (value.length > 0 && typeof value[0] === 'object') {
              console.log(`  • ${fullKey} (array of ${value.length} items)`);
              if (value.length > 0) {
                console.log(`    Example item keys: ${Object.keys(value[0]).join(', ')}`);
              }
            } else {
              console.log(`  • ${fullKey} (array, ${value.length} items)`);
            }
          } else {
            console.log(`  • ${fullKey}: ${typeof value}`);
          }
        });
      };

      analyzeObject(result.data);
    }
  });

  console.log('\n\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  V1 vs V2 USAGE RECOMMENDATIONS                         ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  console.log(`
Based on the test results:

📌 v2 Endpoint (https://api.synthetic.new/v2):
   • /quotas - Use for fetching usage/quotas
   • /models - Synthetic native format models list

📌 OpenAI v1 Endpoint (https://api.synthetic.new/openai/v1):
   • /chat/completions - Use for chat completions (OpenAI compatible)
   • /completions - Use for text completions (OpenAI compatible)
   • /embeddings - Use for embeddings (OpenAI compatible)
   • /models - Use for models list (OpenAI compatible format)
   • /messages - Use for Anthropic-compatible messages
   • /messages/count_tokens - Use for token counting

🎯 Extension Recommendation:
   • Continue using /v2/quotas for usage tracking
   • Consider adding /v2/models for displaying available models
   • Future: Add chat/completions integration if needed
  `);
}

main().catch(console.error);
