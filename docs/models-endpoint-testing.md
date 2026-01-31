# Models Endpoint Testing

This document documents the testing results of the Synthetic.new API models endpoint.

## Overview

**Test Date**: 2026-01-31  
**Purpose**: Understand the structure and capabilities of the models endpoint  
**Test Script**: [`test-models-endpoint.js`](../test-models-endpoint.js)

## Endpoint Information

### URL
```
GET https://api.synthetic.new/openai/v1/models
```

### Authentication
- **Method**: Bearer token
- **Header**: `Authorization: Bearer <API_KEY>`
- **API Key Format**: Must start with `syn_`

## Response Structure

### Top-Level Structure
```typescript
{
  "data": Array<Model>
}
```

### Model Object Structure

The response returns an array of model objects with the following structure:

```typescript
{
  "provider": string;           // Model provider (e.g., "synthetic", "fireworks", "together")
  "always_on": boolean;         // Whether the model is always available
  "id": string;                 // Full model ID (e.g., "hf:zai-org/GLM-4.7")
  "hugging_face_id": string;    // Hugging Face model ID
  "name": string;               // Model name
  "input_modalities": string[]; // Supported input types (e.g., ["text"], ["text", "image"])
  "output_modalities": string[];// Supported output types (e.g., ["text"])
  "context_length": number;     // Maximum context window size in tokens
  "max_output_length": number;  // Maximum output length in tokens (optional)
  "pricing": {                  // Pricing information
    "prompt": string;           // Price per 1M input tokens (e.g., "$0.00000055")
    "completion": string;       // Price per 1M output tokens (e.g., "$0.00000219")
    "image": string;            // Image generation price
    "request": string;          // Per-request price
    "input_cache_reads": string;// Cache read price
    "input_cache_writes": string;// Cache write price
  };
  "created": number;            // Creation timestamp (Unix timestamp, optional)
  "quantization": string;       // Quantization type (e.g., "fp8", optional)
  "supported_sampling_parameters": string[]; // Supported parameters
  "supported_features": string[]; // Supported features
  "openrouter": {               // OpenRouter integration info (optional)
    "slug": string;
  };
  "datacenters": Array<{        // Datacenter locations (optional)
    "country_code": string;
  }>;
}
```

## Models Available

### Total Models
**19 models** are currently available through the API.

### Models by Provider

#### Provider: synthetic (4 models)
1. `hf:zai-org/GLM-4.7`
2. `hf:MiniMaxAI/MiniMax-M2.1`
3. `hf:deepseek-ai/DeepSeek-V3-0324`
4. `hf:deepseek-ai/DeepSeek-R1-0528`

#### Provider: fireworks (10 models)
1. `hf:deepseek-ai/DeepSeek-V3.1`
2. `hf:deepseek-ai/DeepSeek-V3.1-Terminus`
3. `hf:deepseek-ai/DeepSeek-V3.2`
4. `hf:Qwen/Qwen3-VL-235B-A22B-Instruct`
5. `hf:moonshotai/Kimi-K2-Instruct-0905`
6. `hf:moonshotai/Kimi-K2-Thinking`
7. `hf:openai/gpt-oss-120b`
8. `hf:Qwen/Qwen3-Coder-480B-A35B-Instruct`
9. `hf:Qwen/Qwen3-235B-A22B-Instruct-2507`
10. `hf:zai-org/GLM-4.6`
11. `hf:MiniMaxAI/MiniMax-M2`
12. `hf:moonshotai/Kimi-K2.5`

#### Provider: together (3 models)
1. `hf:deepseek-ai/DeepSeek-V3`
2. `hf:Qwen/Qwen3-235B-A22B-Thinking-2507`

### Models by Organization

| Organization | Count |
|--------------|-------|
| deepseek-ai | 6 |
| Qwen | 4 |
| moonshotai | 3 |
| zai-org | 2 |
| MiniMaxAI | 2 |
| meta-llama | 1 |
| openai | 1 |

## Model Naming Patterns

### Hugging Face Prefix
All models use the `hf:` prefix to indicate Hugging Face integration:
```
hf:<organization>/<model-name>
```

### Common Patterns

**DeepSeek Models** (6 models):
- `hf:deepseek-ai/DeepSeek-V3`
- `hf:deepseek-ai/DeepSeek-V3.1`
- `hf:deepseek-ai/DeepSeek-V3.1-Terminus`
- `hf:deepseek-ai/DeepSeek-V3.2`
- `hf:deepseek-ai/DeepSeek-V3-0324`
- `hf:deepseek-ai/DeepSeek-R1-0528`

**Qwen Models** (4 models):
- `hf:Qwen/Qwen3-VL-235B-A22B-Instruct` (Vision-Language)
- `hf:Qwen/Qwen3-Coder-480B-A35B-Instruct` (Code generation)
- `hf:Qwen/Qwen3-235B-A22B-Instruct-2507`
- `hf:Qwen/Qwen3-235B-A22B-Thinking-2507` (Reasoning)

**Moonshot Models** (3 models):
- `hf:moonshotai/Kimi-K2-Instruct-0905`
- `hf:moonshotai/Kimi-K2-Thinking`
- `hf:moonshotai/Kimi-K2.5` (Multimodal - text and image)

**ZAI Models** (2 models):
- `hf:zai-org/GLM-4.7`
- `hf:zai-org/GLM-4.6`

**MiniMax Models** (2 models):
- `hf:MiniMaxAI/MiniMax-M2.1`
- `hf:MiniMaxAI/MiniMax-M2`

**Other Models** (2 models):
- `hf:meta-llama/Llama-3.3-70B-Instruct`
- `hf:openai/gpt-oss-120b`

## Model Capabilities

### Input/Output Modalities

**Text-only models** (18 models):
- Most models support text input and output only

**Multimodal models** (1 model):
- `hf:moonshotai/Kimi-K2.5` - Supports both text and image input

### Context Lengths

Range: **131,072 to 262,144 tokens**

| Context Length | Models |
|----------------|--------|
| 131,072 | DeepSeek-V3, gpt-oss-120b |
| 196,608 | MiniMax-M2, MiniMax-M2.1 |
| 202,752 | GLM-4.6, GLM-4.7 |
| 256,000 | Qwen3-VL-235B-A22B-Instruct |
| 262,144 | All Qwen3-235B models, all Kimi models |

### Supported Sampling Parameters

Common sampling parameters across models:
- `temperature` - Controls randomness
- `top_k` - Limits token selection to top K
- `top_p` - Nucleus sampling
- `repetition_penalty` - Penalizes repetition
- `frequency_penalty` - Penalizes frequency
- `presence_penalty` - Penalizes presence
- `stop` - Stop sequences
- `seed` - Random seed for reproducibility

### Supported Features

Common features across models:
- `tools` - Function calling/tool use
- `json_mode` - JSON output mode
- `structured_outputs` - Structured output generation
- `reasoning` - Chain-of-thought reasoning

## Pricing Information

### Pricing Structure
All pricing is expressed as price per 1 million tokens in USD format (`$X.XXXXXXXX`).

### Sample Pricing Examples

**Budget-friendly options**:
- `hf:openai/gpt-oss-120b`: $0.0000001 per 1M tokens (prompt and completion)
- `hf:Qwen/Qwen3-235B-A22B-Instruct-2507`: $0.00000022 per 1M prompt tokens

**Mid-range options**:
- `hf:zai-org/GLM-4.7`: $0.00000055 per 1M prompt tokens
- `hf:deepseek-ai/DeepSeek-V3`: $0.00000125 per 1M tokens (prompt and completion)

**Premium options**:
- `hf:moonshotai/Kimi-K2-Instruct-0905`: $0.0000012 per 1M tokens
- `hf:Qwen/Qwen3-235B-A22B-Thinking-2507`: $0.00000065 per 1M prompt, $0.000003 per 1M completion

## Datacenter Locations

Models are hosted in:
- **US** (United States)

## Comparison with Documentation

The actual response structure differs from what was documented in [`docs/api.md`](api.md):

### Documented Structure (from docs/api.md)
```typescript
{
  "object": string,
  "data": Array<{
    "id": string,
    "object": string,
    "created": number,
    "owned_by": string
  }>
}
```

### Actual Structure
```typescript
{
  "data": Array<{
    "provider": string,
    "always_on": boolean,
    "id": string,
    "hugging_face_id": string,
    "name": string,
    "input_modalities": string[],
    "output_modalities": string[],
    "context_length": number,
    "max_output_length": number,
    "pricing": { ... },
    "created": number,
    "quantization": string,
    "supported_sampling_parameters": string[],
    "supported_features": string[],
    "openrouter": { ... },
    "datacenters": Array<{ ... }>
  }>
}
```

### Key Differences

1. **No `object` field** at the top level
2. **No `owned_by` field** - instead uses `provider` field
3. **No `object` field** in individual model entries
4. **Additional fields** not documented:
   - `provider`, `always_on`, `hugging_face_id`, `name`
   - `input_modalities`, `output_modalities`
   - `context_length`, `max_output_length`
   - `pricing` object with detailed pricing
   - `quantization`
   - `supported_sampling_parameters`, `supported_features`
   - `openrouter` integration info
   - `datacenters` locations

## Potential Future Features

Based on the models endpoint data, potential future enhancements to the extension could include:

### Model Selection UI
- Display available models in a dropdown or picker
- Allow users to select their preferred model
- Show model capabilities (context length, modalities, features)

### Cost Estimation
- Display pricing information for each model
- Estimate cost based on token usage
- Compare costs between models

### Model Recommendations
- Suggest models based on use case (e.g., coding, reasoning, multimodal)
- Highlight budget-friendly options
- Show context length recommendations

### Usage Breakdown by Model
- Track usage per model
- Display which models are being used most
- Show cost breakdown by model

## Testing Notes

### Test Environment
- **Node.js**: Version 18+
- **Test API Key**: Used from environment variable `SYNTHETIC_TEST_API_KEY`
- **Test Script**: [`test-models-endpoint.js`](../test-models-endpoint.js)

### Execution
```bash
node test-models-endpoint.js
```

### Output
The test script outputs:
1. Full payload structure (JSON formatted)
2. Top-level field analysis
3. Model count
4. Complete list of models
5. Model ID pattern analysis
6. Models grouped by owner
7. Models grouped by organization prefix

## Conclusion

The models endpoint provides comprehensive information about available models, including:
- Model metadata (provider, name, Hugging Face ID)
- Capabilities (modalities, context length, features)
- Pricing information
- Supported parameters and features

The response structure is more detailed than what was initially documented, offering rich information that could be leveraged for future extension features.

## Related Documentation

- [`docs/api.md`](api.md) - API documentation (note: structure differs from actual response)
- [`docs/api-payload-analysis.md`](api-payload-analysis.md) - Usage endpoint analysis
- [`test-models-endpoint.js`](../test-models-endpoint.js) - Test script
- [`test-usage-endpoint.js`](../test-usage-endpoint.js) - Usage endpoint test script
