# Synthetic Usage Tracker Documentation

Welcome to the comprehensive documentation for the Synthetic.new Usage Tracker VSCode extension.

![Extension Icon](../image/icon/icon_128.png)

The extension icon features a **chemistry flask** (🧪), representing the experimental and innovative nature of Synthetic.new's AI platform.

## Table of Contents

- [Installation Guide](installation.md) - How to install the extension
- [Architecture](architecture.md) - System architecture and design
- [API Documentation](api.md) - Extension API reference
- [API Payload Analysis](api-payload-analysis.md) - Usage endpoint payload structure documentation
- [Models Endpoint Testing](models-endpoint-testing.md) - Models endpoint testing and discovery
- [Phase 6 Test Results](phase6-test-results.md) - Unit testing results for Phase 4 features
- [Development Guide](development.md) - Setting up the development environment
- [Troubleshooting](troubleshooting.md) - Common issues and solutions

## AI Agent Documentation

This project includes comprehensive documentation for AI agents from various tools to ensure consistent onboarding and workflow across different AI systems.

### Core Documentation

- **[AGENTS.md](../AGENTS.md)** - Primary agent development guide with workflows, coding practices, and memory system
- **[docs/MEMORY.md](MEMORY.md)** - Query history, current focus, sub-tasks tracking, and quick reference
- **[docs/mcp.md](mcp.md)** - MCP (Model Context Protocol) configuration and usage guide

### Shared Memory System

- **[docs/memory/shared-memory.md](memory/shared-memory.md)** - Consolidated memory pool for all AI tools
- **[docs/memory/tool-registry.md](memory/tool-registry.md)** - Registry of AI tools and their capabilities
- **[docs/memory/git_commit_format.md](memory/git_commit_format.md)** - Git commit message format specification
- **[docs/memory/README.md](memory/README.md)** - Documentation for shared memory system

### Tool-Specific Documentation

- **[plans/kilocode-memory-system-design.md](../plans/kilocode-memory-system-design.md)** - Kilocode-specific memory system design

### Supported AI Tools

AI tools supported by this project's documentation and memory systems:
- **Kilocode** - Has automated memory tracking with JSON entries
- **Roocode** - Memory system to be discovered
- **Opencode** - Current tool, uses shared memory pool
- **Amp** - Memory system to be discovered
- **Gemini** - Memory system to be discovered
- **Claude** - Memory system to be discovered
- **Antigravity** - Memory system to be discovered

### Onboarding Workflow

When an AI agent starts working on this project:

1. **Read AGENTS.md** - Understand agent development workflow
2. **Read docs/MEMORY.md** - Check query history and current focus
3. **Read docs/memory/shared-memory.md** - Load cross-tool context
4. **Read docs/memory/tool-registry.md** - Identify your tool and capabilities
5. **Read docs/mcp.md** - Understand available MCP servers
6. **Report to User** - Confirm context loaded, list pending tasks, offer to continue

## Quick Links

- [VSCode Marketplace](https://marketplace.visualstudio.com/)
- [GitHub Repository](https://github.com/AppliedEllipsis/synthetic-usage-tracker)
- [Synthetic.new API Documentation](https://dev.synthetic.new/docs/synthetic/quotas)

## Getting Help

- **Report Issues**: [GitHub Issues](https://github.com/AppliedEllipsis/synthetic-usage-tracker/issues)
- **Feature Requests**: Use the GitHub issue tracker with the "enhancement" label
- **Questions**: Use GitHub Discussions

## Documentation Structure

```
docs/
├── README.md           # This file - documentation overview
├── installation.md     # Installation instructions
├── architecture.md     # System architecture and design
├── api.md              # API reference documentation
├── api-payload-analysis.md  # Usage endpoint payload structure documentation
├── models-endpoint-testing.md  # Models endpoint testing documentation
├── phase6-test-results.md  # Phase 6 unit testing results for Phase 4 features
├── development.md      # Development setup guide
├── troubleshooting.md  # Common issues and solutions
├── mcp.md             # MCP configuration and usage guide
├── MEMORY.md           # Query history and task tracking
├── multi-key-architecture.md  # Multi-key architecture documentation
└── memory/            # Shared memory system for AI tools
    ├── shared-memory.md      # Consolidated memory pool
    ├── tool-registry.md      # AI tool registry
    ├── git_commit_format.md # Git commit message format
    └── README.md            # Memory system documentation
```
