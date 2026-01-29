#!/usr/bin/env node

/**
 * Test script to document actual API responses from Synthetic.new
 * This helps verify and update TypeScript interfaces
 */

const API_KEY = process.env.SYNTHETIC_TEST_API_KEY || "syn_067d71519de9f74130907cf10a286897";

async function testApiCall(url, name) {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`Testing: ${name}`);
  console.log(`URL: ${url}`);
  console.log("=".repeat(60));

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log("Error response:", errorText);
      return null;
    }

    const data = await response.json();
    console.log("\nFull Response:");
    console.log(JSON.stringify(data, null, 2));

    // Analyze structure
    console.log("\n" + "-".repeat(40));
    console.log("Structure Analysis:");
    console.log("-".repeat(40));

    if (Array.isArray(data)) {
      console.log(`Response is an array with ${data.length} items`);
      if (data.length > 0) {
        console.log("\nFirst item keys:", Object.keys(data[0]));
      }
    } else if (typeof data === "object" && data !== null) {
      console.log("Response is an object");
      console.log("Top-level keys:", Object.keys(data));

      if (data.data && Array.isArray(data.data)) {
        console.log(`\ndata field is an array with ${data.data.length} items`);
        if (data.data.length > 0) {
          console.log("First item keys:", Object.keys(data.data[0]));
        }
      }

      if (data.subscription) {
        console.log("\nsubscription field present:");
        console.log("Keys:", Object.keys(data.subscription));
      }

      if (data.toolQuotas && Array.isArray(data.toolQuotas)) {
        console.log(`\ntoolQuotas field is an array with ${data.toolQuotas.length} items`);
        if (data.toolQuotas.length > 0) {
          console.log("First item keys:", Object.keys(data.toolQuotas[0]));
        }
      }
    }

    return data;
  } catch (error) {
    console.error("Request failed:", error.message);
    return null;
  }
}

async function main() {
  console.log("Synthetic.new API Response Documentation");
  console.log("API Key:", API_KEY.substring(0, 10) + "...");

  // Test v2 quotas endpoint
  await testApiCall(
    "https://api.synthetic.new/v2/quotas",
    "v2 Quotas Endpoint"
  );

  // Test v1 models endpoint
  await testApiCall(
    "https://api.synthetic.new/v1/models",
    "v1 Models Endpoint"
  );

  console.log("\n" + "=".repeat(60));
  console.log("Testing complete!");
  console.log("=".repeat(60));
}

main().catch(console.error);