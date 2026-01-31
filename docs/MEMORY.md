# Query Memory & Task Tracking

This file maintains context across AI agent sessions by tracking queries, current focus, sub-tasks, and quick reference information.

## Query History

### [2026-01-31 01:00 UTC] - Query: Fetch and Document Synthetic.new API Documentation

**Query**: "Query synthetic.new's website for documentation. Focus on API docs (v1 for chat/models/messages, v2 for tools/usage/search). Commit to memory and local docs."

**Context**: Task from comprehensive requirements in docs/MEMORY.md. The user reported that the usage endpoint has been updated to include payloads for tool and search usage. Current documentation in docs/api.md needed updating.

**Outcome**: Completed - Successfully retrieved API documentation from https://dev.synthetic.new/ and updated docs/api.md with comprehensive API information including:

- Official documentation link: https://dev.synthetic.new/
- Base URL discrepancies documented (api.glhf.chat/v1/, api.synthetic.new/openai/v1, api.synthetic.new/v2)
- Rate limits by subscription tier (Standard: 135/5hrs, Pro: 1350/5hrs, Usage Based: unlimited)
- OpenAI-compatible endpoints (/models, /chat/completions, /completions, /embeddings)
- Anthropic-compatible endpoints (/messages, /messages/count_tokens)
- Model naming convention (hf: prefix for Hugging Face models)
- Renamed endpoint section to "Quotas Endpoint" for clarity

**Key Findings**:

- Documentation site at https://dev.synthetic.new/ categorizes endpoints by compatibility (OpenAI/Anthropic/Synthetic) rather than v1/v2 versions
- Multiple conflicting base URLs in documentation - extension uses recommended api.synthetic.new/v2
- take note that things like usage and search use /v2 whereas chat/completions, models, etc use v1.
- Models use hf: prefix (e.g., hf:zai-org/GLM-4.6, hf:deepseek-ai/DeepSeek-V3)
- Rate limits vary by subscription tier with special considerations for small requests and tool calls

**Notes**: WebReader tool consistently timed out when trying to access individual endpoint documentation pages. Main overview, Getting Started, and chat/completions pages were successfully retrieved. Updated docs/api.md with gathered information.

---

### [2026-01-31 01:15 UTC] - Query: Test usage endpoint and document payload structure

**Query**: Test the usage endpoint with a test key and examine the payload structure to understand new usage types (tools, search, and others)

**Context**: Phase 2 of the Synthetic Usage Tracker project - Phase 1 (API Documentation Research) was completed successfully. Need to discover actual payload structure from the API to understand tools, search, and other usage types that may not be fully documented.

**Outcome**: Completed - Successfully called https://api.synthetic.new/v2/quotas endpoint using test key [API_KEY]. Discovered three distinct usage types: subscription (monthly API request quota), search (hourly quota nested as search.hourly), and toolCallDiscounts (tool call functionality quota). Each type has independent limit, requests, and renewAt fields. Key finding: API does NOT return remaining or percentageUsed - these must be calculated client-side. Created docs/api-payload-analysis.md with comprehensive documentation and test-usage-endpoint.js script. Updated API Endpoints section in Quick Reference with payload structure details.

---

### [2026-01-31 00:27 UTC] - Query: Reorganize documentation structure and document current session

**Query**: Reorganize documentation structure and document current session. The user wants:

1. Memory files should be in `/docs/` path (excluding basic files like README, agents.md, LICENSE)
2. The original query requirements were "forgotten" due to going on a tangent with a sub-agent before documenting thoughts
3. The user wants the assistant to document current knowledge and check that TODO and other files contain what was in a previous prompt
4. Move MEMORY.md to /docs/
5. Update MEMORY.md with current session knowledge and comprehensive new requirements

**Context**: User is reorganizing the project documentation structure. Previous session had comprehensive new requirements that need to be documented. The project is a VSCode extension for tracking Synthetic.new API usage.

**Outcome**: In Progress - Moving MEMORY.md to /docs/ and documenting new comprehensive requirements

**Key Requirements to Document:**

- API Documentation & Research: Query synthetic.new's website for docs, focus on API docs (v1 for chat/models/messages, v2 for tools/usage/search)
- API Testing & Documentation: Use test key from .env to call usage endpoint, examine payload structure (tools, search, etc.), document payload
- UI Enhancements: ASCII progress bars in tooltip for each usage type, symbols in statusbar for high quota, show last 4 chars of API key, only one statusbar element
- API Testing: Test models endpoint and other endpoints, consider displaying models
- Testing & Documentation: Test all work, add unit tests, document logic, never leak keys

---

### [2026-01-31 00:22 UTC] - Query: Analyze incomplete items and create query tracking system

**Query**: "what do you have remaining or what hasn't been done yet or is incomplete"

**Context**: User wants to understand what's incomplete in the Synthetic Usage Tracker project. Additionally, user requested implementation of a query documentation and tracking system to maintain context across sessions.

**Outcome**: Completed

1. Comprehensive analysis of incomplete items identified:
   - 2 critical bugs (KeyManager not integrated in extension.ts, Configuration interface missing multi-key settings)
   - 8+ unreleased features (multi-key support, key cycling, key management UI, etc.)
   - 11 pending tasks from implementation plans
2. Created MEMORY.md with query tracking system
3. Created .env.example template
4. Updated agents.md with Memory System Workflow documentation

**Key Findings:**

- Critical issue: KeyManager not integrated in extension.ts - needs integration
- Critical issue: Configuration interface missing multi-key settings - needs updates
- Multi-key infrastructure is well-designed and tested at unit level (2,355 lines of unit tests)
- All individual services have comprehensive test coverage

---

### [2026-01-31 00:18 UTC] - Query: Create query documentation and tracking system

**Query**: Create a query documentation and tracking system for the Synthetic Usage Tracker project. This system will help maintain context across sessions and track progress on tasks.

Tasks:

1. Create `MEMORY.md` at the project root with the following structure:
   - Query History section (chronological list of queries, sanitized of sensitive info)
   - Current Focus section (last query summary with context, planning, and remaining items)
   - Sub-tasks Tracking section (list of active sub-tasks with status)
   - Quick Reference section (commonly referenced info)

2. Create `.env.example` as a git-tracked template showing structure of secrets (without actual values)

3. Update `.gitignore` to ensure `.env` is ignored (if not already)

4. Update `agents.md` to document this new system as part of the workflow

**Context**: New project infrastructure task to support AI agent development workflow. The Synthetic Usage Tracker is a VSCode extension that monitors API usage from Synthetic.new service.

**Outcome**: Completed - All files created and updated successfully.

---

## Current Focus

No active focus. Last task completed.

---

## Sub-tasks Tracking

| #   | Sub-task                                             | Status      | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Move MEMORY.md to /docs/ directory                   | Complete    | Successfully moved from project root                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2   | Update MEMORY.md with comprehensive new requirements | In Progress | Adding all requirements from previous session                                                                                                                                                                                                                                                                                                                                                                                          |
| 3   | Query synthetic.new website for API documentation    | Complete    | Successfully retrieved API documentation from https://dev.synthetic.new/ - documented API overview, base URLs (api.synthetic.new/v2 recommended), rate limits by subscription tier, OpenAI-compatible endpoints (/models, /chat/completions, /completions, /embeddings), Anthropic-compatible endpoints (/messages, /messages/count_tokens), model naming convention (hf: prefix). Updated docs/api.md with comprehensive information. |
| 4   | Test usage endpoint with test key from .env          | Complete    | Successfully called https://api.synthetic.new/v2/quotas endpoint with test key [API_KEY]. Discovered three usage types: subscription (monthly limit), search (hourly limit nested as search.hourly), and toolCallDiscounts (tool call functionality). Each type has independent limit, requests, and renewAt fields. Created test-usage-endpoint.js script.                                                                            |
| 5   | Document API payload structure                       | Complete    | Created docs/api-payload-analysis.md with detailed payload structure documentation. Discovered that API does NOT return remaining or percentageUsed - these must be calculated client-side. All three usage types (subscription, search, toolCallDiscounts) have independent renewal schedules. Updated API Endpoints section in Quick Reference with payload structure details.                                                       |
| 6   | Update tooltip with ASCII progress bars              | Pending     | Add progress bars for total, tools, search, and other usage types                                                                                                                                                                                                                                                                                                                                                                      |
| 7   | Add symbols in statusbar for high quota types        | Pending     | Show warnings when specific quota types are high                                                                                                                                                                                                                                                                                                                                                                                       |
| 8   | Show last 4 characters of API key in tooltip         | Pending     | For key cycling awareness                                                                                                                                                                                                                                                                                                                                                                                                              |
| 9   | Verify single statusbar element                      | Pending     | Ensure only one statusbar element exists                                                                                                                                                                                                                                                                                                                                                                                               |
| 10  | Test models endpoint                                 | Pending     | Use test key to explore models endpoint                                                                                                                                                                                                                                                                                                                                                                                                |
| 11  | Test other API endpoints                             | Pending     | Comprehensive API testing                                                                                                                                                                                                                                                                                                                                                                                                              |
| 12  | Add unit tests for all new work                      | Pending     | Maintain test coverage                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 13  | Document logic in code                               | Pending     | Add decision-logic comments                                                                                                                                                                                                                                                                                                                                                                                                            |
| 14  | Verify security (no key leaks)                       | Pending     | Check commits and docs for leaked keys                                                                                                                                                                                                                                                                                                                                                                                                 |

---

## Quick Reference

### Critical Files

| File                               | Purpose                                                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------- |
| [`agents.md`](agents.md)           | AI Agent Development Guide - comprehensive guide for agents working on this project |
| [`docs/MEMORY.md`](docs/MEMORY.md) | Query Memory & Task Tracking - this file, maintains session context                 |
| [`package.json`](package.json)     | Extension manifest, dependencies, and scripts                                       |
| [`tsconfig.json`](tsconfig.json)   | TypeScript compiler configuration                                                   |
| [`CHANGELOG.md`](CHANGELOG.md)     | Version history and release notes                                                   |
| [`README.md`](README.md)           | User-facing documentation                                                           |
| [`.env.example`](.env.example)     | Environment variables template (git-tracked)                                        |

**Source Files:**

- [`src/extension.ts`](src/extension.ts) - Main extension entry point
- [`src/api/syntheticService.ts`](src/api/syntheticService.ts) - API integration layer
- [`src/api/keyCyclingService.ts`](src/api/keyCyclingService.ts) - Key cycling service
- [`src/config/configuration.ts`](src/config/configuration.ts) - Configuration management
- [`src/config/keyManager.ts`](src/config/keyManager.ts) - Multi-key management
- [`src/statusBar/usageIndicator.ts`](src/statusBar/usageIndicator.ts) - UI status bar component

**Test Files:**

- [`test/suite/extension.test.ts`](test/suite/extension.test.ts) - Extension tests
- [`test/suite/api/syntheticService.test.ts`](test/suite/api/syntheticService.test.ts) - API service tests
- [`test/suite/api/keyCyclingService.test.ts`](test/suite/api/keyCyclingService.test.ts) - Key cycling tests
- [`test/suite/config/keyManager.test.ts`](test/suite/config/keyManager.test.ts) - Key manager tests
- [`test/suite/config/configuration.test.ts`](test/suite/config/configuration.test.ts) - Configuration tests
- [`test/suite/statusBar/usageIndicator.test.ts`](test/suite/statusBar/usageIndicator.test.ts) - Status bar tests

**Documentation:**

- [`docs/MEMORY.md`](docs/MEMORY.md) - Query Memory & Task Tracking
- [`docs/architecture.md`](docs/architecture.md) - System architecture
- [`docs/api.md`](docs/api.md) - API documentation
- [`docs/development.md`](docs/development.md) - Development workflow
- [`docs/troubleshooting.md`](docs/troubleshooting.md) - Common issues and solutions
- [`docs/api-payload-analysis.md`](docs/api-payload-analysis.md) - API payload analysis
- [`docs/models-endpoint-testing.md`](docs/models-endpoint-testing.md) - Models endpoint testing
- [`docs/multi-key-architecture.md`](docs/multi-key-architecture.md) - Multi-key architecture

### Common Commands

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode for development
npm run watch

# Run linter
npm run lint

# Auto-fix linting issues
npm run lint:fix

# Run tests
npm run test

# Package extension
npm run package

# Build release (version bump, compile, package, move to releases/)
npm run buildrelease
```

### Known Issues

None currently documented. When issues are identified, add them here with:

- Issue description
- Affected version
- Workaround (if available)
- Status (Open/In Progress/Resolved)

### Configuration Storage

- **API Keys**: Stored in VSCode SecretStorage (`context.secrets`)
  - New format: `syntheticApiKeys` (JSON array of keys with labels)
  - Legacy format: `syntheticApiKey` (single string)
  - Supports backward compatibility for upgrades
- **Test API Key**: Available in `.env` file (not git-tracked)
  - Template: `.env.example` shows the structure
- **Configuration**: Stored in VSCode workspace configuration (`syntheticUsageTracker` namespace)
- **Shared State**: Uses `context.globalState` for cross-window synchronization

### Extension Commands

| Command ID                                | Description                        |
| ----------------------------------------- | ---------------------------------- |
| `syntheticUsageTracker.refresh`           | Manually refresh usage data        |
| `syntheticUsageTracker.setApiKey`         | Configure API key                  |
| `syntheticUsageTracker.showUsage`         | Display detailed usage information |
| `syntheticUsageTracker.toggleAutoRefresh` | Enable/disable auto-refresh        |

### API Endpoints

**Synthetic.new API Documentation:** https://dev.synthetic.new/

**Recommended Base URL:** `https://api.synthetic.new/v2` (used by this extension)

**Note:** Multiple base URLs are referenced in documentation. The extension uses `api.synthetic.new/v2` which is the recommended endpoint.

#### Synthetic Endpoints

| Endpoint  | Purpose                       | Notes                                                      |
| --------- | ----------------------------- | ---------------------------------------------------------- |
| `/quotas` | Fetch quota/usage information | Returns subscription, search, and toolCallDiscounts quotas |
| `/models` | List available models         | Lists always-on and recently used on-demand models         |

#### Quotas Endpoint Payload Structure

The `/quotas` endpoint returns usage information for multiple quota types. The API does **not** return `remaining` or `percentageUsed` - these must be calculated client-side.

**Response Structure:**

```json
{
  "subscription": {
    "limit": 135,
    "requests": 83.1,
    "renewAt": "2026-01-31T06:00:00.000Z"
  },
  "search": {
    "hourly": {
      "limit": 250,
      "requests": 0,
      "renewAt": "2026-01-31T02:00:00.000Z"
    }
  },
  "toolCallDiscounts": {
    "limit": 1620,
    "requests": 382,
    "renewAt": "2026-01-31T06:00:00.000Z"
  }
}
```

**Usage Types:**

| Type                | Description                      | Renewal Period | Calculation                |
| ------------------- | -------------------------------- | -------------- | -------------------------- |
| `subscription`      | Main API request quota (monthly) | Every 5 hours  | `(requests / limit) * 100` |
| `search.hourly`     | Hourly search quota              | Every hour     | `(requests / limit) * 100` |
| `toolCallDiscounts` | Tool call functionality quota    | Every 5 hours  | `(requests / limit) * 100` |

**Notes:**

- Each usage type has independent renewal schedules
- `renewAt` is an ISO 8601 timestamp indicating when the quota resets
- `requests` can be a decimal value (e.g., 83.1)
- `search` is nested with `hourly` sub-object
- Calculate `remaining = limit - requests` and `percentageUsed = (requests / limit) * 100` client-side

#### OpenAI-Compatible Endpoints

| Endpoint            | Purpose                               | Notes                                       |
| ------------------- | ------------------------------------- | ------------------------------------------- |
| `/chat/completions` | Chat-based completions                | Supports streaming, tools, function calling |
| `/completions`      | Traditional text completions          | OpenAI-compatible                           |
| `/embeddings`       | Transform text into vector embeddings | OpenAI-compatible                           |
| `/models`           | List all models                       | OpenAI-compatible                           |

#### Anthropic-Compatible Endpoints

| Endpoint                 | Purpose                   | Notes                |
| ------------------------ | ------------------------- | -------------------- |
| `/messages`              | Send and receive messages | Anthropic-compatible |
| `/messages/count_tokens` | Count tokens in messages  | Anthropic-compatible |

#### Model Naming Convention

All models use the `hf:` prefix to indicate Hugging Face integration:

- Example: `hf:zai-org/GLM-4.6`
- Example: `hf:deepseek-ai/DeepSeek-V3`
- Example: `hf:meta-llama/Llama-3.1-70B-Instruct`

#### Rate Limits by Subscription Tier

| Tier        | Messages  | Renewal Period |
| ----------- | --------- | -------------- |
| Standard    | 135       | Every 5 hours  |
| Pro         | 1350      | Every 5 hours  |
| Usage Based | Unlimited | N/A            |

### Status Bar States

| State   | Icon                              | Meaning                               |
| ------- | --------------------------------- | ------------------------------------- |
| Idle    | `$(circle-outline) Synthetic.new` | No API key configured                 |
| Loading | `$(loading~spin) Synthetic.new`   | Fetching data                         |
| Success | `$(check-circle) Synthetic.new`   | Usage below threshold                 |
| Warning | `$(warning) Synthetic.new`        | Usage above warning threshold         |
| Error   | `$(error) Synthetic.new`          | Error fetching data or critical usage |

### Memory System Usage

**When to Update MEMORY.md:**

1. At the start of each new query session
2. When switching focus to a different task
3. When completing significant milestones
4. When encountering important context that should persist

**How to Use:**

1. Read the "Query History" to understand previous work
2. Review "Current Focus" to understand what was being worked on
3. Check "Sub-tasks Tracking" for incomplete items
4. Reference "Quick Reference" for commonly needed information

**Sanitization Rules:**

- Always replace API keys with `[API_KEY]`
- Replace user emails with `[USER_EMAIL]`
- Replace personal data with `[REDACTED]`
- Never include actual secrets, passwords, or credentials

### Current Roadmap

**Phase 1: API Documentation & Research**

- Query synthetic.new website for API documentation
- Focus on v1 (chat/models/messages) and v2 (tools/usage/search)
- Document API endpoints and capabilities

**Phase 2: API Testing & Documentation**

- Use test key from .env to call usage endpoint
- Examine payload structure (tools, search, and other usage types)
- Document payload structure in memory, README, and other docs

**Phase 3: UI Enhancements**

- Update tooltip with ASCII progress bars for each usage type
- Add symbols in statusbar for high quota types
- Show last 4 characters of API key in tooltip
- Ensure only one statusbar element exists
- Make popup aesthetically pleasing

**Phase 4: API Testing**

- Test models endpoint using test key
- Test other API endpoints
- Consider displaying models in the tool (future feature)

**Phase 5: Testing & Documentation**

- Test all work
- Add unit tests
- Document logic
- Never leak keys in commits or docs that are not gitignored
