# Synthetic.new API Models Endpoint Testing

**Test Date:** 2026-01-30  
**API Key:** syn_*** (masked)  
**Base URL:** https://api.synthetic.new

## Overview

This document documents the comprehensive testing of Synthetic.new API endpoints to identify the correct endpoints for fetching models. The testing was performed using a test API key to systematically evaluate various endpoint paths and HTTP methods.

## Test Results Summary

| Endpoint | Method | Status | Duration | Notes |
|----------|--------|--------|----------|-------|
| `/v2/quotas` | GET | ✅ 200 OK | 349ms | Returns empty object `{}` |
| `/openai/v1/models` | GET | ✅ 200 OK | 90ms | **WORKING** - Returns full models list |
| `/v2/models` | GET | ❌ 404 Not Found | 80ms | Route not found |
| `/v1/models` | GET | ✅ 200 OK | 82ms | **WORKING** - Returns full models list |
| `/v2/chat/completions` | GET | ❌ 404 Not Found | 78ms | Route not found |
| `/v1/chat/completions` | GET | ❌ 405 Method Not Allowed | 92ms | GET not supported |
| `/v2/chat/completions` | POST | ❌ 404 Not Found | 77ms | Route not found |
| `/v1/chat/completions` | POST | ❌ 400 Bad Request | 102ms | Model name requires `hf:` prefix |

**Total:** 8 endpoints tested  
**Success:** 3 endpoints  
**Failure:** 5 endpoints

---

## Detailed Test Results

### 1. Quota Endpoint (v2)

**Endpoint:** `/v2/quotas`  
**Method:** GET  
**Status:** 200 OK  
**Duration:** 349ms  
**Content-Type:** application/json

**Request Headers:**
```
Authorization: Bearer syn_***
Content-Type: application/json
```

**Response Body:**
```json
{}
```

**Notes:**
- The endpoint is accessible but returns an empty object
- This may indicate the quota endpoint requires different parameters or authentication
- Previous testing in Subtask 2 also showed this behavior
- The endpoint may be deprecated or require additional configuration

---

### 2. Models Endpoint (OpenAI-compatible)

**Endpoint:** `/openai/v1/models`  
**Method:** GET  
**Status:** 200 OK  
**Duration:** 90ms  
**Content-Type:** application/json

**Request Headers:**
```
Authorization: Bearer syn_***
Content-Type: application/json
```

**Response Body:**
```json
{
  "data": [
    {
      "provider": "synthetic",
      "always_on": true,
      "id": "hf:zai-org/GLM-4.7",
      "hugging_face_id": "zai-org/GLM-4.7",
      "name": "zai-org/GLM-4.7",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 202752,
      "max_output_length": 65536,
      "pricing": {
        "prompt": "$0.00000055",
        "completion": "$0.00000219",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.00000055",
        "input_cache_writes": "0"
      },
      "created": 1766361600,
      "quantization": "fp8",
      "supported_sampling_parameters": [
        "temperature",
        "top_k",
        "top_p",
        "repetition_penalty",
        "frequency_penalty",
        "presence_penalty",
        "stop",
        "seed"
      ],
      "supported_features": [
        "tools",
        "json_mode",
        "structured_outputs",
        "reasoning"
      ],
      "openrouter": {
        "slug": "z-ai/glm-4.7"
      },
      "datacenters": [
        {
          "country_code": "US"
        }
      ]
    },
    {
      "provider": "synthetic",
      "always_on": true,
      "id": "hf:MiniMaxAI/MiniMax-M2.1",
      "hugging_face_id": "MiniMaxAI/MiniMax-M2.1",
      "name": "MiniMaxAI/MiniMax-M2.1",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 196608,
      "max_output_length": 65536,
      "pricing": {
        "prompt": "$0.00000055",
        "completion": "$0.00000219",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.00000055",
        "input_cache_writes": "0"
      },
      "created": 1766707200,
      "quantization": "fp8",
      "supported_sampling_parameters": [
        "temperature",
        "top_k",
        "top_p",
        "repetition_penalty",
        "frequency_penalty",
        "presence_penalty",
        "stop",
        "seed"
      ],
      "supported_features": [
        "tools",
        "json_mode",
        "structured_outputs",
        "reasoning"
      ],
      "openrouter": {
        "slug": "minimax/minimax-m2.1"
      },
      "datacenters": [
        {
          "country_code": "US"
        }
      ]
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:meta-llama/Llama-3.3-70B-Instruct",
      "hugging_face_id": "meta-llama/Llama-3.3-70B-Instruct",
      "name": "meta-llama/Llama-3.3-70B-Instruct",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 131072,
      "pricing": {
        "prompt": "$0.0000009",
        "completion": "$0.0000009",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.0000009",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:deepseek-ai/DeepSeek-V3-0324",
      "hugging_face_id": "deepseek-ai/DeepSeek-V3-0324",
      "name": "deepseek-ai/DeepSeek-V3-0324",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 131072,
      "pricing": {
        "prompt": "$0.0000012",
        "completion": "$0.0000012",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.0000012",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:deepseek-ai/DeepSeek-R1-0528",
      "hugging_face_id": "deepseek-ai/DeepSeek-R1-0528",
      "name": "deepseek-ai/DeepSeek-R1-0528",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 131072,
      "pricing": {
        "prompt": "$0.000003",
        "completion": "$0.000008",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.000003",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:deepseek-ai/DeepSeek-V3.1",
      "hugging_face_id": "deepseek-ai/DeepSeek-V3.1",
      "name": "deepseek-ai/DeepSeek-V3.1",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 131072,
      "pricing": {
        "prompt": "$0.00000056",
        "completion": "$0.00000168",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.00000056",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:deepseek-ai/DeepSeek-V3.1-Terminus",
      "hugging_face_id": "deepseek-ai/DeepSeek-V3.1-Terminus",
      "name": "deepseek-ai/DeepSeek-V3.1-Terminus",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 131072,
      "pricing": {
        "prompt": "$0.0000012",
        "completion": "$0.0000012",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.0000012",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:deepseek-ai/DeepSeek-V3.2",
      "hugging_face_id": "deepseek-ai/DeepSeek-V3.2",
      "name": "deepseek-ai/DeepSeek-V3.2",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 162816,
      "pricing": {
        "prompt": "$0.00000056",
        "completion": "$0.00000168",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.00000056",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:Qwen/Qwen3-VL-235B-A22B-Instruct",
      "hugging_face_id": "Qwen/Qwen3-VL-235B-A22B-Instruct",
      "name": "Qwen/Qwen3-VL-235B-A22B-Instruct",
      "input_modalities": ["text", "image"],
      "output_modalities": ["text"],
      "context_length": 256000,
      "pricing": {
        "prompt": "$0.00000022",
        "completion": "$0.00000088",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.00000022",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:moonshotai/Kimi-K2-Instruct-0905",
      "hugging_face_id": "moonshotai/Kimi-K2-Instruct-0905",
      "name": "moonshotai/Kimi-K2-Instruct-0905",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 262144,
      "pricing": {
        "prompt": "$0.0000012",
        "completion": "$0.0000012",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.0000012",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:moonshotai/Kimi-K2-Thinking",
      "hugging_face_id": "moonshotai/Kimi-K2-Thinking",
      "name": "moonshotai/Kimi-K2-Thinking",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 262144,
      "pricing": {
        "prompt": "$0.0000006",
        "completion": "$0.0000025",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.0000006",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:openai/gpt-oss-120b",
      "hugging_face_id": "openai/gpt-oss-120b",
      "name": "openai/gpt-oss-120b",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 131072,
      "pricing": {
        "prompt": "$0.0000001",
        "completion": "$0.0000001",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.0000001",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:Qwen/Qwen3-Coder-480B-A35B-Instruct",
      "hugging_face_id": "Qwen/Qwen3-Coder-480B-A35B-Instruct",
      "name": "Qwen/Qwen3-Coder-480B-A35B-Instruct",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 262144,
      "pricing": {
        "prompt": "$0.00000045",
        "completion": "$0.0000018",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.00000045",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:Qwen/Qwen3-235B-A22B-Instruct-2507",
      "hugging_face_id": "Qwen/Qwen3-235B-A22B-Instruct-2507",
      "name": "Qwen/Qwen3-235B-A22B-Instruct-2507",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 262144,
      "pricing": {
        "prompt": "$0.00000022",
        "completion": "$0.00000088",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.00000022",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:zai-org/GLM-4.6",
      "hugging_face_id": "zai-org/GLM-4.6",
      "name": "zai-org/GLM-4.6",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 202752,
      "pricing": {
        "prompt": "$0.00000055",
        "completion": "$0.00000219",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.00000055",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:MiniMaxAI/MiniMax-M2",
      "hugging_face_id": "MiniMaxAI/MiniMax-M2",
      "name": "MiniMaxAI/MiniMax-M2",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 196608,
      "pricing": {
        "prompt": "$0.0000003",
        "completion": "$0.0000012",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.0000003",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:moonshotai/Kimi-K2.5",
      "hugging_face_id": "moonshotai/Kimi-K2.5",
      "name": "moonshotai/Kimi-K2.5",
      "input_modalities": ["text", "image"],
      "output_modalities": ["text"],
      "context_length": 262144,
      "pricing": {
        "prompt": "$0.0000012",
        "completion": "$0.0000012",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.0000012",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "together",
      "always_on": true,
      "id": "hf:deepseek-ai/DeepSeek-V3",
      "hugging_face_id": "deepseek-ai/DeepSeek-V3",
      "name": "deepseek-ai/DeepSeek-V3",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 131072,
      "pricing": {
        "prompt": "$0.00000125",
        "completion": "$0.00000125",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.00000125",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "together",
      "always_on": true,
      "id": "hf:Qwen/Qwen3-235B-A22B-Thinking-2507",
      "hugging_face_id": "Qwen/Qwen3-235B-A22B-Thinking-2507",
      "name": "Qwen/Qwen3-235B-A22B-Thinking-2507",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 262144,
      "pricing": {
        "prompt": "$0.00000065",
        "completion": "$0.000003",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.00000065",
        "input_cache_writes": "0"
      }
    }
  ]
}
```

**Notes:**
- **This endpoint is working correctly**
- Returns 18 models with detailed information
- Response format follows OpenAI-compatible structure
- Each model includes comprehensive metadata: provider, pricing, capabilities, context length, etc.
- Models use `hf:` prefix in their IDs (e.g., `hf:zai-org/GLM-4.7`)
- Response includes models from multiple providers: synthetic, fireworks, and together

---

### 3. Models Endpoint (v2)

**Endpoint:** `/v2/models`  
**Method:** GET  
**Status:** 404 Not Found  
**Duration:** 80ms  
**Content-Type:** application/json

**Request Headers:**
```
Authorization: Bearer syn_***
Content-Type: application/json
```

**Response Body:**
```json
{
  "error": "API route not found: '/v2/models'. (HINT: Is the URL spelled correctly?)"
}
```

**Notes:**
- Endpoint does not exist in v2 API
- The `/v2/` prefix appears to be reserved for other endpoints (like `/v2/quotas`)
- Models endpoint is not available in v2 API version

---

### 4. Models Endpoint (v1)

**Endpoint:** `/v1/models`  
**Method:** GET  
**Status:** 200 OK  
**Duration:** 82ms  
**Content-Type:** application/json

**Request Headers:**
```
Authorization: Bearer syn_***
Content-Type: application/json
```

**Response Body:**
```json
{
  "data": [
    {
      "provider": "synthetic",
      "always_on": true,
      "id": "hf:zai-org/GLM-4.7",
      "hugging_face_id": "zai-org/GLM-4.7",
      "name": "zai-org/GLM-4.7",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 202752,
      "max_output_length": 65536,
      "pricing": {
        "prompt": "$0.00000055",
        "completion": "$0.00000219",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.00000055",
        "input_cache_writes": "0"
      },
      "created": 1766361600,
      "quantization": "fp8",
      "supported_sampling_parameters": [
        "temperature",
        "top_k",
        "top_p",
        "repetition_penalty",
        "frequency_penalty",
        "presence_penalty",
        "stop",
        "seed"
      ],
      "supported_features": [
        "tools",
        "json_mode",
        "structured_outputs",
        "reasoning"
      ],
      "openrouter": {
        "slug": "z-ai/glm-4.7"
      },
      "datacenters": [
        {
          "country_code": "US"
        }
      ]
    },
    {
      "provider": "synthetic",
      "always_on": true,
      "id": "hf:MiniMaxAI/MiniMax-M2.1",
      "hugging_face_id": "MiniMaxAI/MiniMax-M2.1",
      "name": "MiniMaxAI/MiniMax-M2.1",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 196608,
      "max_output_length": 65536,
      "pricing": {
        "prompt": "$0.00000055",
        "completion": "$0.00000219",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.00000055",
        "input_cache_writes": "0"
      },
      "created": 1766707200,
      "quantization": "fp8",
      "supported_sampling_parameters": [
        "temperature",
        "top_k",
        "top_p",
        "repetition_penalty",
        "frequency_penalty",
        "presence_penalty",
        "stop",
        "seed"
      ],
      "supported_features": [
        "tools",
        "json_mode",
        "structured_outputs",
        "reasoning"
      ],
      "openrouter": {
        "slug": "minimax/minimax-m2.1"
      },
      "datacenters": [
        {
          "country_code": "US"
        }
      ]
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:meta-llama/Llama-3.3-70B-Instruct",
      "hugging_face_id": "meta-llama/Llama-3.3-70B-Instruct",
      "name": "meta-llama/Llama-3.3-70B-Instruct",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 131072,
      "pricing": {
        "prompt": "$0.0000009",
        "completion": "$0.0000009",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.0000009",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:deepseek-ai/DeepSeek-V3-0324",
      "hugging_face_id": "deepseek-ai/DeepSeek-V3-0324",
      "name": "deepseek-ai/DeepSeek-V3-0324",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 131072,
      "pricing": {
        "prompt": "$0.0000012",
        "completion": "$0.0000012",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.0000012",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:deepseek-ai/DeepSeek-R1-0528",
      "hugging_face_id": "deepseek-ai/DeepSeek-R1-0528",
      "name": "deepseek-ai/DeepSeek-R1-0528",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 131072,
      "pricing": {
        "prompt": "$0.000003",
        "completion": "$0.000008",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.000003",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:deepseek-ai/DeepSeek-V3.1",
      "hugging_face_id": "deepseek-ai/DeepSeek-V3.1",
      "name": "deepseek-ai/DeepSeek-V3.1",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 131072,
      "pricing": {
        "prompt": "$0.00000056",
        "completion": "$0.00000168",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.00000056",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:deepseek-ai/DeepSeek-V3.1-Terminus",
      "hugging_face_id": "deepseek-ai/DeepSeek-V3.1-Terminus",
      "name": "deepseek-ai/DeepSeek-V3.1-Terminus",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 131072,
      "pricing": {
        "prompt": "$0.0000012",
        "completion": "$0.0000012",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.0000012",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:deepseek-ai/DeepSeek-V3.2",
      "hugging_face_id": "deepseek-ai/DeepSeek-V3.2",
      "name": "deepseek-ai/DeepSeek-V3.2",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 162816,
      "pricing": {
        "prompt": "$0.00000056",
        "completion": "$0.00000168",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.00000056",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:Qwen/Qwen3-VL-235B-A22B-Instruct",
      "hugging_face_id": "Qwen/Qwen3-VL-235B-A22B-Instruct",
      "name": "Qwen/Qwen3-VL-235B-A22B-Instruct",
      "input_modalities": ["text", "image"],
      "output_modalities": ["text"],
      "context_length": 256000,
      "pricing": {
        "prompt": "$0.00000022",
        "completion": "$0.00000088",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.00000022",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:moonshotai/Kimi-K2-Instruct-0905",
      "hugging_face_id": "moonshotai/Kimi-K2-Instruct-0905",
      "name": "moonshotai/Kimi-K2-Instruct-0905",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 262144,
      "pricing": {
        "prompt": "$0.0000012",
        "completion": "$0.0000012",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.0000012",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:moonshotai/Kimi-K2-Thinking",
      "hugging_face_id": "moonshotai/Kimi-K2-Thinking",
      "name": "moonshotai/Kimi-K2-Thinking",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 262144,
      "pricing": {
        "prompt": "$0.0000006",
        "completion": "$0.0000025",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.0000006",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:openai/gpt-oss-120b",
      "hugging_face_id": "openai/gpt-oss-120b",
      "name": "openai/gpt-oss-120b",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 131072,
      "pricing": {
        "prompt": "$0.0000001",
        "completion": "$0.0000001",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.0000001",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:Qwen/Qwen3-Coder-480B-A35B-Instruct",
      "hugging_face_id": "Qwen/Qwen3-Coder-480B-A35B-Instruct",
      "name": "Qwen/Qwen3-Coder-480B-A35B-Instruct",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 262144,
      "pricing": {
        "prompt": "$0.00000045",
        "completion": "$0.0000018",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.00000045",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:Qwen/Qwen3-235B-A22B-Instruct-2507",
      "hugging_face_id": "Qwen/Qwen3-235B-A22B-Instruct-2507",
      "name": "Qwen/Qwen3-235B-A22B-Instruct-2507",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 262144,
      "pricing": {
        "prompt": "$0.00000022",
        "completion": "$0.00000088",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.00000022",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:zai-org/GLM-4.6",
      "hugging_face_id": "zai-org/GLM-4.6",
      "name": "zai-org/GLM-4.6",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 202752,
      "pricing": {
        "prompt": "$0.00000055",
        "completion": "$0.00000219",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.00000055",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:MiniMaxAI/MiniMax-M2",
      "hugging_face_id": "MiniMaxAI/MiniMax-M2",
      "name": "MiniMaxAI/MiniMax-M2",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 196608,
      "pricing": {
        "prompt": "$0.0000003",
        "completion": "$0.0000012",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.0000003",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "fireworks",
      "always_on": true,
      "id": "hf:moonshotai/Kimi-K2.5",
      "hugging_face_id": "moonshotai/Kimi-K2.5",
      "name": "moonshotai/Kimi-K2.5",
      "input_modalities": ["text", "image"],
      "output_modalities": ["text"],
      "context_length": 262144,
      "pricing": {
        "prompt": "$0.0000012",
        "completion": "$0.0000012",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.0000012",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "together",
      "always_on": true,
      "id": "hf:deepseek-ai/DeepSeek-V3",
      "hugging_face_id": "deepseek-ai/DeepSeek-V3",
      "name": "deepseek-ai/DeepSeek-V3",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 131072,
      "pricing": {
        "prompt": "$0.00000125",
        "completion": "$0.00000125",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.00000125",
        "input_cache_writes": "0"
      }
    },
    {
      "provider": "together",
      "always_on": true,
      "id": "hf:Qwen/Qwen3-235B-A22B-Thinking-2507",
      "hugging_face_id": "Qwen/Qwen3-235B-A22B-Thinking-2507",
      "name": "Qwen/Qwen3-235B-A22B-Thinking-2507",
      "input_modalities": ["text"],
      "output_modalities": ["text"],
      "context_length": 262144,
      "pricing": {
        "prompt": "$0.00000065",
        "completion": "$0.000003",
        "image": "0",
        "request": "0",
        "input_cache_reads": "$0.00000065",
        "input_cache_writes": "0"
      }
    }
  ]
}
```

**Notes:**
- **This endpoint is working correctly**
- Returns identical data to `/openai/v1/models`
- Same 18 models with detailed information
- Response format is consistent and reliable
- This is the standard v1 API endpoint for models

---

### 5. Chat Completions (v2) - GET

**Endpoint:** `/v2/chat/completions`  
**Method:** GET  
**Status:** 404 Not Found  
**Duration:** 78ms  
**Content-Type:** application/json

**Request Headers:**
```
Authorization: Bearer syn_***
Content-Type: application/json
```

**Response Body:**
```json
{
  "error": "API route not found: '/v2/chat/completions'. (HINT: Is the URL spelled correctly?)"
}
```

**Notes:**
- Endpoint does not exist in v2 API
- Chat completions are not available in v2 API version

---

### 6. Chat Completions (v1) - GET

**Endpoint:** `/v1/chat/completions`  
**Method:** GET  
**Status:** 405 Method Not Allowed  
**Duration:** 92ms  
**Content-Type:** N/A

**Request Headers:**
```
Authorization: Bearer syn_***
Content-Type: application/json
```

**Response Body:**
*(Empty)*

**Notes:**
- Endpoint exists but does not support GET method
- Chat completions likely require POST method only
- This is consistent with OpenAI API conventions

---

### 7. Chat Completions (v2) - POST

**Endpoint:** `/v2/chat/completions`  
**Method:** POST  
**Status:** 404 Not Found  
**Duration:** 77ms  
**Content-Type:** application/json

**Request Headers:**
```
Authorization: Bearer syn_***
Content-Type: application/json
```

**Request Body:**
```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "user",
      "content": "test"
    }
  ]
}
```

**Response Body:**
```json
{
  "error": "API route not found: '/v2/chat/completions'. (HINT: Is the URL spelled correctly?)"
}
```

**Notes:**
- Endpoint does not exist in v2 API
- Chat completions are not available in v2 API version

---

### 8. Chat Completions (v1) - POST

**Endpoint:** `/v1/chat/completions`  
**Method:** POST  
**Status:** 400 Bad Request  
**Duration:** 102ms  
**Content-Type:** application/json

**Request Headers:**
```
Authorization: Bearer syn_***
Content-Type: application/json
```

**Request Body:**
```json
{
  "model": "gpt-3.5-turbo",
  "messages": [
    {
      "role": "user",
      "content": "test"
    }
  ]
}
```

**Response Body:**
```json
{
  "error": "Your model name should start with an hf: prefix; for example: \"hf:gpt-3.5-turbo\""
}
```

**Notes:**
- Endpoint exists and accepts POST requests
- **Important:** Model names must use `hf:` prefix (e.g., `hf:deepseek-ai/DeepSeek-V3`)
- The test used an invalid model name (`gpt-3.5-turbo` without `hf:` prefix)
- A valid request would use a model ID from the models list, such as `hf:deepseek-ai/DeepSeek-V3`
- This endpoint is likely the correct one for chat completions, but requires proper model naming

---

## Analysis and Recommendations

### Working Endpoints

1. **`/openai/v1/models`** (GET) - ✅ Working
   - Returns 18 models with comprehensive metadata
   - OpenAI-compatible format
   - Fast response (90ms)

2. **`/v1/models`** (GET) - ✅ Working
   - Returns identical data to `/openai/v1/models`
   - Standard v1 API endpoint
   - Fast response (82ms)

3. **`/v2/quotas`** (GET) - ⚠️ Partially Working
   - Returns 200 OK but with empty object `{}`
   - May require additional parameters or configuration

### Non-Working Endpoints

1. **`/v2/models`** (GET) - ❌ Not Found
   - Does not exist in v2 API

2. **`/v2/chat/completions`** (GET/POST) - ❌ Not Found
   - Does not exist in v2 API

3. **`/v1/chat/completions`** (GET) - ❌ Method Not Allowed
   - Only supports POST method

4. **`/v1/chat/completions`** (POST) - ⚠️ Requires Correct Format
   - Exists but requires `hf:` prefix for model names
   - Test failed due to incorrect model format

### Key Findings

1. **Models Endpoint:** Both `/openai/v1/models` and `/v1/models` work correctly and return identical data
2. **No v2 Models:** The v2 API does not have a models endpoint
3. **Model Naming Convention:** All model IDs use `hf:` prefix (e.g., `hf:deepseek-ai/DeepSeek-V3`)
4. **Multiple Providers:** Models are available from synthetic, fireworks, and together providers
5. **Rich Metadata:** Each model includes detailed information about pricing, capabilities, context length, etc.

### Recommended Endpoint for Fetching Models

**Primary Recommendation:** Use `/openai/v1/models`

**Reasons:**
- OpenAI-compatible format, following industry standards
- Fast response time (90ms)
- Returns comprehensive model information
- Explicitly labeled as OpenAI-compatible, making it clear for developers

**Alternative:** `/v1/models`

**Reasons:**
- Also works correctly
- Slightly faster (82ms)
- Returns identical data
- Standard v1 API endpoint

### Expected Response Format

The models endpoint returns a JSON object with the following structure:

```typescript
interface ModelsResponse {
  data: Model[];
}

interface Model {
  provider: string;
  always_on: boolean;
  id: string;
  hugging_face_id: string;
  name: string;
  input_modalities: string[];
  output_modalities: string[];
  context_length: number;
  max_output_length?: number;
  pricing: {
    prompt: string;
    completion: string;
    image: string;
    request: string;
    input_cache_reads: string;
    input_cache_writes: string;
  };
  created?: number;
  quantization?: string;
  supported_sampling_parameters?: string[];
  supported_features?: string[];
  openrouter?: {
    slug: string;
  };
  datacenters?: Array<{
    country_code: string;
  }>;
}
```

### Special Requirements

1. **Authentication:** All endpoints require Bearer token authentication with a valid API key
2. **Model Naming:** When using chat completions, model names must use the `hf:` prefix
3. **Content-Type:** Requests must include `Content-Type: application/json` header

### Future Testing Recommendations

1. **Test Chat Completions with Valid Model:**
   - Use a valid model ID from the models list (e.g., `hf:deepseek-ai/DeepSeek-V3`)
   - Test with proper request format
   - Verify response structure

2. **Investigate Quota Endpoint:**
   - Determine why `/v2/quotas` returns empty object
   - Check if additional parameters or headers are required
   - Verify if quota information is available through other endpoints

3. **Test Additional Endpoints:**
   - Explore other potential endpoints (e.g., `/v1/completions`, `/v1/embeddings`)
   - Test pagination or filtering options for models endpoint
   - Investigate rate limiting and caching behavior

4. **Test Error Handling:**
   - Test with invalid API keys
   - Test with malformed requests
   - Verify error messages are clear and helpful

---

## Conclusion

The Synthetic.new API provides two working endpoints for fetching models:
- `/openai/v1/models` (recommended for OpenAI compatibility)
- `/v1/models` (standard v1 endpoint)

Both endpoints return comprehensive information about 18 available models from multiple providers. The API does not have v2 endpoints for models or chat completions, and the quota endpoint appears to be non-functional or require additional configuration.

For implementing model display functionality in the extension, use either `/openai/v1/models` or `/v1/models` with proper Bearer token authentication.
