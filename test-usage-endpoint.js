/**
 * Test script to call Synthetic.new API usage endpoint
 * This script is for development/testing purposes only
 */

// Load environment variables
require('dotenv').config();

const API_KEY = process.env.SYNTHETIC_TEST_API_KEY;
const API_ENDPOINT = 'https://api.synthetic.new/v2/quotas';

if (!API_KEY) {
  console.error('Error: SYNTHETIC_TEST_API_KEY not found in .env file');
  process.exit(1);
}

async function testUsageEndpoint() {
  console.log('Testing Synthetic.new API Usage Endpoint...\n');
  console.log(`Endpoint: ${API_ENDPOINT}`);
  console.log(`API Key: ${API_KEY.substring(0, 10)}...${API_KEY.substring(API_KEY.length - 4)}\n`);

  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`);
    }

    const data = await response.json();

    console.log('\n=== FULL PAYLOAD STRUCTURE ===\n');
    console.log(JSON.stringify(data, null, 2));

    console.log('\n=== ANALYSIS ===\n');

    // Analyze top-level fields
    console.log('Top-level fields:');
    Object.keys(data).forEach(key => {
      const value = data[key];
      const type = typeof value;
      const isArray = Array.isArray(value);
      console.log(`  - ${key}: ${type}${isArray ? '[]' : ''}`);
    });

    // Check for tools usage (freeToolCalls - first 500/2500 tool calls per day are free)
    if (data.tools) {
      console.log('\nTools usage detected:');
      console.log(JSON.stringify(data.tools, null, 2));
    }

    // Check for search usage
    if (data.search) {
      console.log('\nSearch usage detected:');
      console.log(JSON.stringify(data.search, null, 2));
    }

    // Check for other usage types
    const knownFields = ['limit', 'requests', 'remaining', 'percentage_used', 'renews_at', 'tools', 'search'];
    const otherFields = Object.keys(data).filter(key => !knownFields.includes(key));
    if (otherFields.length > 0) {
      console.log('\nOther usage fields:');
      otherFields.forEach(field => {
        console.log(`  - ${field}:`, JSON.stringify(data[field], null, 2));
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testUsageEndpoint();
