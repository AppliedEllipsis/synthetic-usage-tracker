# Prompt Reference System

This file contains reusable prompt patterns and templates for AI agents.

## Prompt Format

Prompts follow this structure:

```markdown
#prompt_name#
{prompt description with placeholders}
```

**Important**: Use `~` (tilde) instead of `!` for prompt names to avoid shell command conflicts.

**Placeholder Usage**:

- Use `{placeholder_name}` for dynamic content
- Replace placeholders with actual values when executing prompts
- Prompts can have or without a name
- Prompt matching is fuzzy/general, not necessarily exact

## Available Prompts

### #update_from_project#

**Description**: Look into {path provided} for project memory updates that we might add to best practices, enhance yourself based off non-project specific best practices, document and memorize, and implement it.

**Use when**:

- Discovering workflows from other projects
- Learning best practices from existing codebases
- Extracting reusable patterns
- Enhancing scaffolding or documentation

**Placeholders**:

- `{path provided}` - Path to project to examine

**Matching Logic**:

- Look for general prompt intent, not exact string match
- "update memory" patterns match this prompt
- "update from project" patterns match this prompt
- Context-aware: distinguish from code comments or inline explanations

### Adding New Prompts

**When to add**:

- Discover a workflow that would be useful to repeat
- Learn a new pattern from another project
- Create a reusable template for common tasks
- Document best practices that should be standardized

**How to add**:

1. Use `#prompt_name#` format (with `~` not `!`)
2. Include prompt description with `{placeholders}`
3. Document when to use the prompt
4. Add matching logic (what triggers this prompt)
5. Include example usage if helpful

### Prompt Management

- Keep prompts focused and reusable
- Use descriptive names with `~` prefix
- Document placeholders clearly
- Update prompts based on feedback and usage
- Make matching flexible/general, not strict

### Matching Guidelines

- Agents should check for ~ patterns that look like prompt requests
- Distinguish from inline code or comments
- Look for intent/context, not exact string match
- "update" + "memory/project" matches #update_from_project#
- User requests like "update from project" should trigger prompts
- Consider user's specific tool and context when matching

### Integration with Memory System

- Prompt additions should be documented in docs/MEMORY.md
- Update Quick Reference section with new prompt patterns
- Reference prompts in AGENTS.md and agents.min.md for context
- Share prompt knowledge via docs/memory/shared-memory.md
- Always check docs/common_prompts.md when user asks to update memory or learn from projects

### Example Usage

**User says**: "Update from z-ai-monitor project"

**Agent action**:

1. Check docs/common_prompts.md for matching prompts
2. Find #update_from_project# matches (general matching, not exact)
3. Execute prompt with placeholder: `{path provided}` = `z-ai-monitor`
4. Process: look into D:\_projects\z-ai-monitor for best practices...

**User says**: "Update memory with what I learned"

**Agent action**:

1. Check for prompt patterns matching "update memory"
2. If no specific match found, proceed with general memory update
3. Check docs/common_prompts.md for relevant prompts
4. Execute if match found, otherwise use standard memory update workflow

**User says**: "~update_from_project# D:\_projects\some-project"

**Agent action**:

1. Recognize this as an explicit prompt reference
2. Parse prompt name and placeholder value
3. Execute #update_from_project# with `{path provided}` = `D:\_projects\some-project`

---

## Reference

- [`AGENTS.md`](../AGENTS.md) - AI Agent Development Guide
- [`docs/MEMORY.md`](docs/MEMORY.md) - Query Memory & Task Tracking
- [`docs/memory/shared-memory.md`](memory/shared-memory.md) - Shared Memory Pool
- [`docs/memory/tool-registry.md`](memory/tool-registry.md) - AI Tool Registry
