# MCP (Model Context Protocol) Configuration

This document explains how AI agents use MCP servers to enhance their capabilities when working on this project.

## Overview

The `.mcp/mcp-config.json` file contains MCP server configurations with credentials. This file is **gitignored** to protect sensitive API keys. The `.mcp/mcp-config.example.json` file is **git-tracked** and contains placeholders for reference.

## File Locations

- **Config File**: `.mcp/mcp-config.json` (gitignored, contains real credentials)
- **Example File**: `.mcp/mcp-config.example.json` (git-tracked, contains placeholders)
- **Documentation**: This file (`docs/mcp.md`)

## Supported Tools

The following AI tools support MCP and can read this configuration:
- **Kilocode**: Full MCP integration
- **Roocode**: MCP support
- **Opencode**: MCP support (current tool)
- **Amp**: MCP support
- **Gemini**: MCP support (via extensions)
- **Claude**: MCP support (via extensions)
- **Antigravity**: MCP support (via extensions)

## Available MCP Servers

### Perplexity
- **Purpose**: AI-powered search and reasoning
- **Commands**: `perplexity_search`, `perplexity_reason`, `perplexity_research`, `perplexity_ask`
- **Status**: Disabled by default (enable in config if needed)
- **Environment Variable**: `PERPLEXITY_API_KEY`

### Web Search Prime
- **Purpose**: Web search API
- **Commands**: `webSearchPrime`
- **Status**: Enabled
- **Authorization**: Bearer token in headers

### Web Reader
- **Purpose**: Read web content
- **Commands**: `webReader`
- **Status**: Enabled
- **Authorization**: Bearer token in headers

### ZAI MCP Server
- **Purpose**: Image and screenshot analysis
- **Commands**: `ui_to_artifact`, `extract_text_from_screenshot`, `diagnose_error_screenshot`, `analyze_data_visualization`, `understand_technical_diagram`, `ui_diff_check`, `analyze_image`, `analyze_video`
- **Status**: Enabled
- **Environment Variables**: `Z_AI_API_KEY`, `Z_AI_MODE`

### Context7
- **Purpose**: Library documentation search
- **Commands**: `resolve-library-id`, `get-library-docs`, `query-docs`
- **Status**: Enabled
- **Environment Variable**: `DEFAULT_MINIMUM_TOKENS` (optional)

### Sequential Thinking
- **Purpose**: Enhanced reasoning and step-by-step thinking
- **Commands**: `sequentialthinking`
- **Status**: Enabled

### Time
- **Purpose**: Time-related operations
- **Commands**: `get_current_time`, `convert_time`
- **Status**: Enabled

### Memory
- **Purpose**: Persistent memory across sessions
- **Commands**: `create_entities`, `create_relations`, `add_observations`, `delete_entities`, `delete_observations`, `delete_relations`, `read_graph`, `search_nodes`, `open_nodes`
- **Status**: Enabled

## Usage by Agents

When an AI agent starts working on this project:

1. **Read Configuration**: Agent reads `.mcp/mcp-config.json` to discover available MCP servers
2. **Connect to Servers**: Agent connects to enabled MCP servers
3. **Use Capabilities**: Agent uses MCP tools to enhance its abilities:
   - Web search for up-to-date information
   - Library documentation lookup
   - Sequential thinking for complex reasoning
   - Memory for cross-session persistence
   - Image analysis for visual tasks

## Configuration

### Setting Up

1. **Copy Example File**:
   ```bash
   cp .mcp/mcp-config.example.json .mcp/mcp-config.json
   ```

2. **Fill in Credentials**:
   - Replace placeholder values with actual API keys/tokens
   - Ensure sensitive values are not committed to version control
   - Verify `.mcp/` is in `.gitignore`

3. **Enable/Disable Servers**:
   - Set `disabled: true` to disable a server
   - Set `disabled: false` or remove property to enable a server
   - Default state is specified in example configuration

### Example Configuration Entry

```json
{
  "mcpServers": {
    "web-search-prime": {
      "type": "streamable-http",
      "url": "https://api.z.ai/api/mcp/web_search_prime/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN_HERE"
      },
      "alwaysAllow": ["webSearchPrime"]
    }
  }
}
```

## Security Notes

- **Never commit** `.mcp/mcp-config.json` to version control
- **Never share** actual API keys with anyone
- **Use placeholders** when documenting MCP configuration in public docs
- Example: `"PERPLEXITY_API_KEY": "[API_KEY]"` instead of actual key
- **Verify gitignore** ensures `.mcp/` is protected

## Credential Management

### Placeholder Format

When documenting MCP servers, use these placeholders:

| Original | Placeholder | Purpose |
|----------|-------------|---------|
| `PERPLEXITY_API_KEY` | `[PERPLEXITY_API_KEY]` | Perplexity API key |
| Token strings | `[WEB_SEARCH_PRIME_TOKEN]` | Web search token |
| API keys | `[API_KEY]` | Generic API key |
| Tokens | `[TOKEN]` | Generic authentication token |

### Updating Credentials

To update MCP server credentials:

1. Edit `.mcp/mcp-config.json`
2. Add or modify server configurations
3. Replace placeholder values with actual credentials
4. Enable/disable servers as needed
5. Keep credentials secure - never expose in commits or public docs

## Agent Integration

When implementing MCP integration for different AI tools, follow these guidelines:

### Auto-Discovery

- Tools should automatically read `.mcp/mcp-config.json`
- Fall back to `.mcp/mcp-config.example.json` for reference
- Gracefully handle missing or invalid configuration

### Credential Security

- Never log or expose credentials from configuration
- Use environment variables or secure storage for runtime access
- Mask credentials in error messages and logs

### Fallback Behavior

- Gracefully handle missing configuration
- Provide clear error messages when credentials are invalid
- Allow tools to function without MCP if configuration is missing

### Error Reporting

- Report MCP connection issues without exposing credentials
- Use generic error messages for authentication failures
- Document troubleshooting steps in this file

## Troubleshooting

### Common Issues

**Issue**: MCP server not found
- **Cause**: Configuration file not found or invalid
- **Solution**: Verify `.mcp/mcp-config.json` exists and is valid JSON

**Issue**: Authentication failed
- **Cause**: Invalid or expired credentials
- **Solution**: Update credentials in `.mcp/mcp-config.json`

**Issue**: Server connection timeout
- **Cause**: Network issues or server unavailable
- **Solution**: Try again later, or use alternative MCP server

**Issue**: Command not available
- **Cause**: Server disabled or command not in `alwaysAllow` list
- **Solution**: Enable server in configuration, add command to `alwaysAllow`

## See Also

- [`AGENTS.md`](../AGENTS.md) - AI Agent Development Guide
- [`docs/MEMORY.md`](MEMORY.md) - Query Memory & Task Tracking
- [`docs/memory/shared-memory.md`](memory/shared-memory.md) - Consolidated shared memory pool
- [`docs/memory/tool-registry.md`](memory/tool-registry.md) - AI tool registry
- [`.mcp/mcp-config.json`](../.mcp/mcp-config.json) - MCP configuration (gitignored)
- [`.mcp/mcp-config.example.json`](../.mcp/mcp-config.example.json) - MCP configuration example (git-tracked)
