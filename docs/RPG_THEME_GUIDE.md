# RPG Theme Implementation Guide

## Overview

This document describes the RPG-themed display system for the Synthetic Usage Tracker VSCode extension.

## API Response Structure

The Synthetic.new API returns quota data with the following structure:

```typescript
interface QuotaResponse {
  subscription?: QuotaCategory;        // Rate limit (e.g., 600 req/5hr)
  search?: SearchQuota;                // Hourly search quota
  freeToolCalls?: QuotaCategory;       // Daily tool call quota
  toolCallDiscounts?: QuotaCategory;   // Alternative field name
  weeklyTokenLimit?: WeeklyTokenLimit; // Weekly regenerating mana pool
}
```

### Resource Types

1. **Subscription (600 requests / 5 hours)**
   - Rapid regeneration (5 hours)
   - Rate-limited requests
   - Always returned by API

2. **Weekly Token Limit (Mana Pool)**
   - Weekly regeneration
   - Scales with token costs and cache hits
   - Returns `percentRemaining` and `nextRegenAt`

3. **Search (Hourly)**
   - Fast regeneration (hourly)
   - Wrapped in `{ hourly: QuotaCategory }`
   - May not be present in all responses

4. **Tool Calls (Daily)**
   - Daily quota for tool invocations
   - May be named `freeToolCalls` or `toolCallDiscounts`
   - May not be present in all responses

## RPG Theme Mapping

User-selected RPG themes for resource display:

| API Field | Display Name | RPG Theme | Concept | Regeneration |
|-----------|--------------|-----------|---------|--------------|
| `subscription` | Subscription | **Endurance** / **Vigor** | Core vitality | 5 hours |
| `weeklyTokenLimit` | Token Pool | **Mana** / **Arcane Essence** | Magical energy | Weekly |
| `search.hourly` | Search | **Focus** / **Insight** | Mental acuity | 1 hour |
| `freeToolCalls` | Tool Calls | **Spirit** / **Binds** | Binding magic | Daily |

## Where Default Values Come From

### When API Fields Are Missing

**File: `src/api/syntheticService.ts`**

#### Line 382-383: Empty Categories for Missing Data

```typescript
const usageInfo: UsageInfo = {
  subscription: this.parseCategory(data.subscription),
  search: this.parseCategory(data.search?.hourly ?? this.buildEmptyCategory()),
  toolCalls: this.parseCategory(toolCallsCategory ?? this.buildEmptyCategory()),
};
```

**Behavior:**
- If `search` is not in API response → Uses `buildEmptyCategory()` → Shows 0/0
- If `toolCalls` is not in API response → Uses `buildEmptyCategory()` → Shows 0/0

#### Line 472-478: Empty Category Factory

```typescript
private buildEmptyCategory(): QuotaCategory {
  return {
    limit: 0,
    requests: 0,
    renewsAt: "",
  };
}
```

**Default Values for Missing Categories:**
- `limit`: 0
- `requests`: 0
- `renewsAt`: "" (empty string)

### Where Empty Categories Are FILTERED

**File: `src/statusBar/usageIndicator.ts`**

#### Line 248-250: Tool Calls Filter

```typescript
if (!(toolCalls.requests === 0 && toolCalls.limit === 0)) {
  tooltip += this.buildCategoryTooltip("Free Tool Calls (daily)", toolCalls);
}
```

**Behavior:** Tool calls section is hidden when both limit and requests are 0.

#### Missing: Search Filter

**Current Issue:** Search quota is shown even when empty (0/0).

**Should add similar filter:**
```typescript
if (!(search.requests === 0 && search.limit === 0)) {
  tooltip += this.buildCategoryTooltip("Search (hourly)", search);
}
```

## Implementation Requirements

### Configuration Options

Add to `package.json` under `contributes.configuration`:

```json
{
  "syntheticUsageTracker.enableRpgTheme": {
    "type": "boolean",
    "default": false,
    "description": "Display quotas using RPG-themed terminology"
  },
  "syntheticUsageTracker.rpgThemeStyle": {
    "type": "string",
    "enum": ["health", "mana", "stamina", "spirit"],
    "default": "health",
    "description": "RPG theme style for quota display"
  }
}
```

### Code Changes Needed

1. **`src/config/configuration.ts`**
   - ✅ Add `enableRpgTheme: boolean`
   - ✅ Add `rpgThemeStyle: RpgThemeStyle`

2. **`src/statusBar/usageIndicator.ts`**
   - Add `getRpgLabel()` method
   - Update `buildCategoryTooltip()` to use RPG names
   - Update `buildText()` for RPG symbols
   - Add filter for empty search quota

3. **`package.json`**
   - Add configuration schema
   - Add RPG theme descriptions

### RPG Label Mapping

```typescript
private getRpgLabel(category: string, style: RpgThemeStyle): string {
  const themes: Record<string, Record<RpgThemeStyle, string>> = {
    subscription: {
      health: "Health",
      mana: "Vitality",
      stamina: "Endurance",
      spirit: "Essence"
    },
    weeklyTokens: {
      health: "Life Force",
      mana: "Mana Pool",
      stamina: "Energy Reserve",
      spirit: "Spirit Well"
    },
    search: {
      health: "Vigor",
      mana: "Focus",
      stamina: "Swiftness",
      spirit: "Insight"
    },
    toolCalls: {
      health: "Strength",
      mana: "Charms",
      stamina: "Agility",
      spirit: "Binds"
    }
  };
  
  return themes[category]?.[style] || category;
}
```

## Symbol Mapping

Status bar symbols for RPG themes:

| Quota | Health | Mana | Stamina | Spirit |
|-------|--------|------|---------|--------|
| Subscription | ❤️ | 🛡️ | ⚡ | 🔮 |
| Weekly Token | 💚 | 🔷 | 🔋 | ✨ |
| Search | 💪 | 👁️ | 🏃 | 🔍 |
| Tool Calls | 🦾 | 🔮 | 🎯 | 🔗 |

## Time Regeneration Descriptions

Add themed time descriptions:

```typescript
private getRpgTimeDescription(timeRemaining: string, category: string): string {
  const descriptions: Record<string, string> = {
    subscription: "Restores in",
    weeklyTokens: "Reservoir refills in",
    search: "Renews in",
    toolCalls: "Renewal at"
  };
  return descriptions[category] || "Renews in";
}
```

## Testing

Test cases needed:

1. **RPG theme disabled** → Shows standard terminology
2. **RPG theme enabled** → Shows themed terminology
3. **Missing API fields** → Empty categories hidden (not shown as 0/0)
4. **Weekly token with percentRemaining** → Mana pool displayed correctly
5. **Mixed presence** → Only present categories shown

## Files to Update

1. `src/config/configuration.ts` - Add config options
2. `src/statusBar/usageIndicator.ts` - Apply RPG labels and fix empty display
3. `package.json` - Add configuration schema
4. `docs/` - Update documentation with RPG theme info
