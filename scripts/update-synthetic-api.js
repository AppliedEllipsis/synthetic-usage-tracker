#!/usr/bin/env node

/**
 * Diagnostic script for Synthetic.new API
 *
 * Purpose: Fetch and capture the current API response format to understand
 * the mana-based resource pool system that replaced the old quota-based system.
 *
 * Usage: node scripts/update-synthetic-api.js
 *
 * Design decision: This is a standalone diagnostic tool that:
 * - Reads API key from .env file (SYNTHETIC_API_KEY or similar variations)
 * - Makes a request to the Synthetic.new usage endpoint
 * - Captures full response details (status, headers, body)
 * - Saves response to scripts/last-api-response.json
 * - Outputs a summary to console for quick inspection
 *
 * Error handling: Graceful handling of missing .env, missing API key,
 * network errors, and non-2xx HTTP responses.
 */

const fs = require("fs");
const path = require("path");

/**
 * Parse .env file and return key-value pairs
 * Design decision: Manual parsing avoids external dependency on dotenv package,
 * making this script truly standalone and runnable without npm install.
 */
function parseEnvFile(filePath) {
  const envVars = {};

  if (!fs.existsSync(filePath)) {
    return envVars;
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    // Parse KEY=VALUE format
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.substring(0, separatorIndex).trim();
    let value = trimmed.substring(separatorIndex + 1).trim();

    // Remove quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    envVars[key] = value;
  }

  return envVars;
}

/**
 * Find API key from environment variables
 * Checks multiple common variable names for flexibility
 */
function findApiKey(envVars) {
  const possibleKeys = [
    "SYNTHETIC_API_KEY",
    "SYNTHETIC_APIKEY",
    "API_KEY",
    "SYNTHETIC_KEY",
    "SYNTHETIC_TOKEN",
    "APIKEY",
  ];

  for (const key of possibleKeys) {
    if (envVars[key]) {
      return { key: envVars[key], varName: key };
    }
  }

  return null;
}

/**
 * Make HTTP GET request using native Node.js https module
 * Design decision: Using native https avoids external dependencies,
 * ensuring the script works without npm install in any Node environment.
 */
function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https:") ? require("https") : require("http");

    const req = client.get(url, options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          statusMessage: res.statusMessage,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on("error", (error) => {
      reject(error);
    });

    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error("Request timeout after 30 seconds"));
    });
  });
}

/**
 * Format headers object for display
 */
function formatHeaders(headers) {
  const formatted = {};
  for (const [key, value] of Object.entries(headers)) {
    // Mask sensitive values in headers
    if (key.toLowerCase().includes("authorization") || key.toLowerCase().includes("cookie")) {
      formatted[key] = "[REDACTED]";
    } else {
      formatted[key] = value;
    }
  }
  return formatted;
}

/**
 * Get top-level keys from an object, with type information
 */
function getResponseStructure(obj) {
  if (typeof obj !== "object" || obj === null) {
    return { type: typeof obj, value: obj };
  }

  if (Array.isArray(obj)) {
    return {
      type: "array",
      length: obj.length,
      sample: obj.slice(0, 3).map((item) => getResponseStructure(item)),
    };
  }

  const structure = {};
  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (value === null) {
      structure[key] = "null";
    } else if (Array.isArray(value)) {
      structure[key] = `array[${value.length}]`;
    } else if (typeof value === "object") {
      structure[key] = "object";
    } else {
      structure[key] = `${typeof value} (${String(value).substring(0, 50)}${String(value).length > 50 ? "..." : ""})`;
    }
  }
  return structure;
}

/**
 * Print section header
 */
function printHeader(title) {
  console.log("\n" + "=".repeat(60));
  console.log(title);
  console.log("=".repeat(60));
}

/**
 * Main diagnostic function
 */
async function runDiagnostic() {
  const scriptDir = __dirname;
  const projectRoot = path.dirname(scriptDir);
  const envPath = path.join(projectRoot, ".env");
  const outputPath = path.join(scriptDir, "last-api-response.json");

  printHeader("Synthetic.new API Diagnostic Tool");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Working directory:", projectRoot);

  // Step 1: Read .env file
  printHeader("Step 1: Reading .env file");

  if (!fs.existsSync(envPath)) {
    console.error("❌ Error: .env file not found at:", envPath);
    console.error("\nPlease create a .env file with your API key:");
    console.error("  SYNTHETIC_API_KEY=your_api_key_here");
    process.exit(1);
  }

  console.log("✓ Found .env file at:", envPath);
  const envVars = parseEnvFile(envPath);
  console.log("  Parsed", Object.keys(envVars).length, "environment variables");

  // Step 2: Find API key
  printHeader("Step 2: Locating API Key");

  const apiKeyInfo = findApiKey(envVars);
  if (!apiKeyInfo) {
    console.error("❌ Error: No API key found in .env file");
    console.error("\nExpected one of these variables:");
    console.error("  - SYNTHETIC_API_KEY");
    console.error("  - SYNTHETIC_APIKEY");
    console.error("  - API_KEY");
    console.error("  - SYNTHETIC_KEY");
    console.error("  - SYNTHETIC_TOKEN");
    process.exit(1);
  }

  console.log("✓ Found API key in variable:", apiKeyInfo.varName);
  console.log("  Key format:", apiKeyInfo.key.startsWith("syn_") ? "Valid (starts with syn_)" : "Warning (should start with syn_)");
  console.log("  Key length:", apiKeyInfo.key.length, "characters");
  console.log("  Key preview:", apiKeyInfo.key.substring(0, 10) + "...");

  // Step 3: Make API request
  printHeader("Step 3: Making API Request");

  const apiUrl = "https://api.synthetic.new/v2/usage";
  console.log("Endpoint:", apiUrl);
  console.log("Method: GET");

  const requestOptions = {
    headers: {
      Authorization: `Bearer ${apiKeyInfo.key}`,
      "User-Agent": "SyntheticUsageTracker-Diagnostic/1.0",
      Accept: "application/json",
    },
  };

  console.log("\nRequest headers:");
  console.log(JSON.stringify(formatHeaders(requestOptions.headers), null, 2));

  let response;
  try {
    console.log("\nSending request...");
    response = await makeRequest(apiUrl, requestOptions);
    console.log("✓ Request completed");
  } catch (error) {
    console.error("❌ Request failed:", error.message);

    // Save error to output file
    const errorOutput = {
      timestamp: new Date().toISOString(),
      error: true,
      errorMessage: error.message,
      errorType: error.name,
      apiUrl,
      requestHeaders: formatHeaders(requestOptions.headers),
    };

    fs.writeFileSync(outputPath, JSON.stringify(errorOutput, null, 2));
    console.log("\nError details saved to:", outputPath);
    process.exit(1);
  }

  // Step 4: Process response
  printHeader("Step 4: Response Analysis");

  console.log("HTTP Status:", response.statusCode, response.statusMessage);
  console.log("\nResponse headers:");
  console.log(JSON.stringify(formatHeaders(response.headers), null, 2));

  // Parse JSON body
  let parsedBody;
  try {
    parsedBody = JSON.parse(response.body);
    console.log("\n✓ Response body parsed as JSON");
  } catch (parseError) {
    console.log("\n⚠ Response is not valid JSON");
    console.log("Raw body preview (first 500 chars):");
    console.log(response.body.substring(0, 500));

    parsedBody = { raw: response.body };
  }

  // Step 5: Analyze structure
  printHeader("Step 5: Response Structure");

  if (typeof parsedBody === "object" && parsedBody !== null) {
    if (Array.isArray(parsedBody)) {
      console.log("Response type: Array");
      console.log("Array length:", parsedBody.length);
      console.log("\nFirst 3 items structure:");
      console.log(JSON.stringify(getResponseStructure(parsedBody), null, 2));
    } else {
      console.log("Response type: Object");
      console.log("\nTop-level keys:");
      const keys = Object.keys(parsedBody);
      keys.forEach((key) => {
        const value = parsedBody[key];
        let typeStr;
        if (value === null) {
          typeStr = "null";
        } else if (Array.isArray(value)) {
          typeStr = `array[${value.length}]`;
        } else if (typeof value === "object") {
          typeStr = `object {${Object.keys(value).join(", ") || "empty"}}`;
        } else {
          const preview = String(value).substring(0, 50);
          typeStr = `${typeof value}: ${preview}${String(value).length > 50 ? "..." : ""}`;
        }
        console.log(`  - ${key}: ${typeStr}`);
      });

      console.log("\nDetailed structure:");
      console.log(JSON.stringify(getResponseStructure(parsedBody), null, 2));
    }
  } else {
    console.log("Response type:", typeof parsedBody);
    console.log("Value:", parsedBody);
  }

  // Step 6: Save to file
  printHeader("Step 6: Saving Response");

  const outputData = {
    timestamp: new Date().toISOString(),
    request: {
      url: apiUrl,
      method: "GET",
      headers: formatHeaders(requestOptions.headers),
    },
    response: {
      statusCode: response.statusCode,
      statusMessage: response.statusMessage,
      headers: formatHeaders(response.headers),
      body: parsedBody,
    },
    summary: {
      success: response.statusCode >= 200 && response.statusCode < 300,
      topLevelKeys: typeof parsedBody === "object" && !Array.isArray(parsedBody)
        ? Object.keys(parsedBody)
        : null,
      isArray: Array.isArray(parsedBody),
    },
  };

  try {
    fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
    console.log("✓ Response saved to:", outputPath);
  } catch (writeError) {
    console.error("❌ Failed to save response:", writeError.message);
    process.exit(1);
  }

  // Step 7: Summary
  printHeader("Summary");

  if (response.statusCode >= 200 && response.statusCode < 300) {
    console.log("Status: ✅ SUCCESS");
  } else if (response.statusCode >= 400 && response.statusCode < 500) {
    console.log("Status: ❌ CLIENT ERROR (check API key)");
  } else if (response.statusCode >= 500) {
    console.log("Status: ⚠️ SERVER ERROR (API may be down)");
  } else {
    console.log("Status: ⚠️ UNEXPECTED STATUS");
  }

  console.log("HTTP Status:", `${response.statusCode} ${response.statusMessage}`);
  console.log("Output file:", outputPath);

  if (outputData.summary.topLevelKeys) {
    console.log("Response keys:", outputData.summary.topLevelKeys.join(", "));
  }

  console.log("\n" + "=".repeat(60));
  console.log("Diagnostic complete!");
  console.log("=".repeat(60) + "\n");

  // Exit with appropriate code
  process.exit(response.statusCode >= 200 && response.statusCode < 300 ? 0 : 1);
}

// Run the diagnostic
runDiagnostic().catch((error) => {
  console.error("\n" + "=".repeat(60));
  console.error("UNEXPECTED ERROR");
  console.error("=".repeat(60));
  console.error(error);
  process.exit(1);
});
