# Addon Configuration

This directory contains the dashboard addon configuration for the Social Media Dashboard.

## Overview

The addon system allows customization of dashboard widgets, automation rules, and navigation grouping. Configuration is defined in JSON format with schema validation.

## Files

- **addons.json**: Main configuration file defining all addon groups and their dashboard cards
- **addons.schema.json**: JSON Schema for validation and IDE autocompletion support

## Configuration Structure

```
{
  "addons": {
    "{addon_group_id}": {
      "id": "string",
      "label": "string",
      "navigation_group": "string",
      "dashboard_cards": [...]
    }
  }
}
```

### Addon Group Properties

- **id**: Unique identifier (must match the key name)
- **label**: Display name shown in UI
- **navigation_group**: Category for navigation menu grouping
- **dashboard_cards**: Array of widget configurations

## Supported Widget Types

### 1. metric_grid
Display key metrics with configurable time ranges.

**Required fields:**
- `metrics` (array, min 1): Metric identifiers to display
- `time_range_default` (enum): One of `last_7_days`, `last_30_days`, `last_90_days`, `custom`

### 2. recurring_slot_list
Manage scheduled content slots.

**Required fields:**
- `fields` (array): Field names to display (e.g., `name`, `frequency`, `next_run_at`)

### 3. library
Content repository with tagging and actions.

**Optional fields:**
- `item_types` (array): Allowed content types
- `tags_enabled` (boolean): Enable tagging feature
- `actions` (array): Available actions for items

### 4. kanban_board
Workflow management with columns and swimlanes.

**Required fields:**
- `columns` (array, min 1): Column identifiers

**Optional fields:**
- `swimlanes` (array): Grouping dimensions - `platform`, `campaign`, `user`, or `priority`

### 5. automation_panel
Rule-based automation with triggers and actions.

**Optional fields:**
- `rules` (array): Automation rule definitions (see Automation Rules section)

### 6. brief_generator
Template-based content brief generation.

**Required fields:**
- `brief_templates` (array): Available template types
- `fields` (array): Required fields for brief generation

### 7. timeline_board
Long-form narrative planning.

**Required fields:**
- `fields` (array): Fields for timeline entries (e.g., `name`, `theme`, `start_date`, `end_date`)

### 8. experiment_matrix
Multi-dimensional content testing.

**Required fields:**
- `dimensions` (array): Variables to test
- `metrics` (array): Metrics to track

## Automation Rules

Automation rules enable event-driven workflows. Each rule consists of:

### Structure
```json
{
  "id": "unique_rule_id",
  "trigger": "trigger_type",
  "conditions": ["expression1", "expression2"],
  "actions": ["action1", "action2"]
}
```

### Triggers

Supported trigger types (validated at config load time):
- `post_published`: Fires when a post is published
- `before_schedule`: Fires before scheduled post time
- `metric_threshold_reached`: Fires when a metric crosses a threshold
- `time_based`: Fires at specified times
- `manual_trigger`: User-initiated trigger

### Conditions

Conditions are string expressions evaluated at runtime. The system supports:
- **Comparison operators**: `>`, `<`, `>=`, `<=`, `==`, `!=`
- **Variable references**: Metric names, post properties, user context
- **Example**: `"engagement_rate > threshold"` where `engagement_rate` is a metric and `threshold` is a rule parameter

**Validation**: 
- Conditions are validated for syntax at rule registration
- Unknown variables trigger clear error messages
- Runtime evaluation failures are logged and optionally retried per rule configuration

### Actions

Supported action types (validated against registry):
- `mark_evergreen`: Mark content for evergreen rotation
- `add_to_recycle_queue`: Add to content recycling queue
- `warn_user`: Display warning notification
- `suggest_alternative_slot`: Suggest different scheduling time
- `send_notification`: Send notification to user
- `update_status`: Update content status

**Action Execution**:
- Actions are registered in a central action registry
- Each action has a defined handler interface (signature, sync/async behavior)
- Failed actions are logged with actionable error messages
- Retry behavior is configurable per rule

### Error Handling

1. **Validation Errors**: Invalid triggers, conditions, or actions prevent rule registration and display clear errors showing:
   - JSON path to the error
   - Expected vs actual value/type
   - Available valid values

2. **Runtime Errors**: Condition evaluation or action execution failures are:
   - Logged with full context
   - Optionally retried based on rule configuration
   - Can trigger compensating actions if defined

## Adding a New Addon

1. Add a new key under `addons` in `addons.json`
2. Use a consistent naming convention:
   - **Recommended**: `snake_case` for addon IDs (e.g., `culture_community`, `creator_ops`)
   - Also supported: `kebab-case` (e.g., `my-addon`) or alphanumeric with underscores/hyphens
3. Define required properties:
   ```json
   {
     "id": "my_addon",
     "label": "My Addon",
     "navigation_group": "MyGroup",
     "dashboard_cards": []
   }
   ```
4. Add dashboard cards with appropriate widget types
5. Validate against schema using a JSON Schema validator (e.g., AJV, Zod)

## Validation

The configuration is validated at startup using the JSON Schema. Runtime validation:
- Loads `src/config/addons.json`
- Validates against `src/config/addons.schema.json`
- Throws errors with clear messages showing JSON path and expected types on validation failure

## Example: Adding a Custom Widget

```json
{
  "id": "my_custom_widget",
  "type": "metric_grid",
  "title": "My Metrics",
  "metrics": ["metric1", "metric2"],
  "time_range_default": "last_30_days"
}
```

This configuration provides a foundation for extending the dashboard with custom functionality while maintaining type safety and validation.
