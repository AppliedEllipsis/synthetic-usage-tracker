/**
 * Test script to call Synthetic.new API models endpoint
 * This script is for development/testing purposes only
 */

// Load environment variables
require('dotenv').config();

const API_KEY = process.env.SYNTHETIC_TEST_API_KEY;
const API_ENDPOINT = 'https://api.synthetic.new/openai/v1/models';

if (!API_KEY) {
  console.error('Error: SYNTHETIC_TEST_API_KEY not found in .env file');
  process.exit(1);
}

async function testModelsEndpoint() {
  console.log('Testing Synthetic.new API Models Endpoint...\n');
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

    // Analyze models array if present
    if (data.data && Array.isArray(data.data)) {
      console.log(`\nNumber of models: ${data.data.length}`);
      
      console.log('\n=== MODELS LIST ===\n');
      data.data.forEach((model, index) => {
        console.log(`${index + 1}. ID: ${model.id}`);
        console.log(`   Object: ${model.object}`);
        console.log(`   Created: ${model.created}`);
        console.log(`   Owned by: ${model.owned_by}`);
        console.log('');
      });

      // Analyze model ID patterns
      console.log('\n=== MODEL ANALYSIS ===\n');
      
      const hfModels = data.data.filter(m => m.id.startsWith('hf:'));
      console.log(`Models with 'hf:' prefix: ${hfModels.length}`);
      
      if (hfModels.length > 0) {
        console.log('\nHugging Face Models:');
        hfModels.forEach((model, index) => {
          console.log(`  ${index + 1}. ${model.id}`);
        });
      }

      // Group by owner
      const byOwner = {};
      data.data.forEach(model => {
        if (!byOwner[model.owned_by]) {
          byOwner[model.owned_by] = [];
        }
        byOwner[model.owned_by].push(model.id);
      });

      console.log('\n=== MODELS BY OWNER ===\n');
      Object.entries(byOwner).forEach(([owner, models]) => {
        console.log(`${owner}: ${models.length} model(s)`);
        models.forEach(modelId => {
          console.log(`  - ${modelId}`);
        });
        console.log('');
      });

      // Check for patterns in model names
      console.log('\n=== MODEL NAME PATTERNS ===\n');
      const prefixes = {};
      data.data.forEach(model => {
        const parts = model.id.split('/');
        const prefix = parts[0];
        if (!prefixes[prefix]) {
          prefixes[prefix] = 0;
        }
        prefixes[prefix]++;
      });

      Object.entries(prefixes).sort((a, b) => b[1] - a[1]).forEach(([prefix, count]) => {
        console.log(`${prefix}: ${count} model(s)`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testModelsEndpoint();
