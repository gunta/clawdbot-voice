# OS1 Plugin Specification

This document defines the plugin format for OS1. Plugins follow the [Claude Code Plugins](https://docs.anthropic.com/en/docs/claude-code/plugins) format with OS1-specific extensions for web components.

## Overview

A plugin packages related functionality:
- **Skills** — Instructions for AI agents (SKILL.md files per [agentskills.io](https://agentskills.io/specification))
- **Agents** — Specialized subagents for specific tasks
- **Commands** — Voice and slash commands
- **Hooks** — Event-triggered actions
- **Components** — Custom UI web components (OS1 extension)

## Directory Structure

```
/plugins/{plugin-name}/
├── .claude-plugin/
│   └── plugin.json          # REQUIRED: Plugin manifest
│
├── skills/                   # Agent Skills (agentskills.io spec)
│   └── {skill-name}/
│       ├── SKILL.md          # Required per skill
│       ├── scripts/          # Optional: executable scripts
│       ├── references/       # Optional: additional documentation
│       └── assets/           # Optional: templates, data files
│
├── agents/                   # Subagents (Claude Code format)
│   └── {agent-name}.md
│
├── commands/                 # Voice/slash commands
│   └── {command-name}.md
│
├── hooks/                    # Event handlers
│   └── hooks.json
│
├── components/               # OS1 Extension: Web Components
│   └── {component-name}/
│       ├── index.js          # Component entry point (Preact)
│       └── styles.css        # Component styles
│
└── PLUGIN.md                 # Optional: human-readable documentation
```

## File Formats

### plugin.json (Required)

Location: `.claude-plugin/plugin.json`

```json
{
  "name": "my-plugin",
  "version": "1.0.0",
  "description": "What this plugin does",
  "author": {
    "name": "Your Name",
    "email": "you@example.com",
    "url": "https://example.com"
  },
  "homepage": "https://docs.example.com",
  "repository": "https://github.com/user/my-plugin",
  "license": "MIT",
  "keywords": ["keyword1", "keyword2"],
  
  "skills": "./skills",
  "agents": "./agents",
  "commands": "./commands",
  "hooks": "./hooks/hooks.json",
  "components": "./components"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Must match directory name. Lowercase, hyphens allowed. |
| `version` | Recommended | Semantic version (e.g., "1.0.0") |
| `description` | Recommended | Brief description of the plugin |
| `author` | Recommended | Author information |
| `license` | Recommended | License identifier (e.g., "MIT") |
| `skills` | No | Path to skills directory |
| `agents` | No | Path to agents directory |
| `commands` | No | Path to commands directory |
| `hooks` | No | Path to hooks.json file |
| `components` | No | Path to components directory |

---

### SKILL.md

Location: `skills/{skill-name}/SKILL.md`

Skills follow the [Agent Skills Specification](https://agentskills.io/specification).

```markdown
---
name: my-skill
description: Detailed description of what this skill does and when to use it. Include keywords that help agents identify relevant tasks.
license: MIT
metadata:
  author: your-name
  version: "1.0"
compatibility: OS1 voice-first environment
allowed-tools: Read Write voice.speak
---

# My Skill

Instructions for the agent.

## Instructions

Step-by-step guide for the agent.

## Examples

Input/output examples.

## Edge Cases

How to handle unusual situations.
```

#### Frontmatter Fields

| Field | Required | Constraints |
|-------|----------|-------------|
| `name` | Yes | 1-64 chars, lowercase alphanumeric + hyphens, must match parent directory |
| `description` | Yes | 1-1024 chars, describes what and when |
| `license` | No | License name |
| `metadata` | No | Arbitrary key-value pairs |
| `compatibility` | No | Environment requirements |
| `allowed-tools` | No | Space-delimited tool names |

#### Name Validation

- Lowercase letters, numbers, and hyphens only
- Must not start or end with a hyphen
- No consecutive hyphens (`--`)
- 1-64 characters

Valid: `my-skill`, `voice-assistant`, `a`  
Invalid: `My-Skill`, `-skill`, `skill-`, `my--skill`

---

### Agent Definition

Location: `agents/{agent-name}.md`

```markdown
---
name: my-agent
description: When to invoke this agent
tools: Read, Write, voice.speak
model: sonnet
---

You are a specialized agent for OS1.

Your role:
- Task 1
- Task 2

Guidelines:
- Guideline 1
- Guideline 2
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Agent identifier |
| `description` | Yes | When to invoke this agent |
| `tools` | No | Comma-separated tool names |
| `model` | No | Model to use (sonnet, opus, haiku) |

---

### Command Definition

Location: `commands/{command-name}.md`

```markdown
---
name: my-command
description: What this command does
trigger: voice
phrases:
  - "trigger phrase one"
  - "trigger phrase two"
---

# My Command

What happens when this command executes.
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Command identifier |
| `description` | Yes | What the command does |
| `trigger` | No | `voice`, `slash`, or `both` |
| `phrases` | No | Voice phrases that trigger this command |

---

### hooks.json

Location: `hooks/hooks.json`

```json
{
  "hooks": [
    {
      "event": "on-navigate",
      "config": { "app": "files" },
      "action": "component:show:my-component"
    },
    {
      "event": "on-time",
      "config": { "time": "09:00" },
      "action": "command:morning-brief"
    },
    {
      "event": "on-voice",
      "config": { "phrase": "wake up" },
      "action": "skill:greet"
    }
  ]
}
```

#### Supported Events

| Event | Config | Description |
|-------|--------|-------------|
| `on-navigate` | `{ "app": "app-id" }` | Fires when navigating to an app |
| `on-time` | `{ "time": "HH:MM" }` | Fires at specific time |
| `on-voice` | `{ "phrase": "..." }` | Fires when phrase is spoken |
| `on-file-change` | `{ "path": "/path" }` | Fires when file changes |
| `on-boot` | `{}` | Fires when OS1 starts |

#### Action Formats

| Format | Description |
|--------|-------------|
| `command:{name}` | Execute a command |
| `skill:{name}` | Activate a skill |
| `component:show:{name}` | Show a component |
| `component:hide:{name}` | Hide a component |

---

### Components (OS1 Extension)

Location: `components/{component-name}/index.js`

Components are Preact functional components:

```javascript
import { html } from 'htm/preact';

export default function MyComponent({ host }) {
  return html`
    <div class="my-component">
      <h2>Hello from plugin!</h2>
    </div>
  `;
}
```

Styles in `styles.css`:

```css
.my-component {
  padding: 16px;
  background: rgba(200, 69, 54, 0.1);
  border-radius: 8px;
}
```

#### Component Props

| Prop | Type | Description |
|------|------|-------------|
| `host` | `HTMLElement` | The host custom element |

#### Using Components

In your app:

```html
<os1-plugin-slot plugin="my-plugin" component="my-component"></os1-plugin-slot>
```

#### Limitations (v1)

- Components must use `htm/preact` (available via import map)
- Relative imports within the component directory work
- External imports must be from the import map (`preact`, `htm/preact`, `@preact/signals`)
- CSS is injected into Shadow DOM (no external URLs)

---

## Plugin Loading

### Discovery

OS1 scans `/plugins/` on boot and loads plugins that have:
1. A `.claude-plugin/plugin.json` file
2. Are enabled in `/settings/plugins.json` (or all by default)

### Enable/Disable

Configure in `/settings/plugins.json`:

```json
{
  "enabled": ["hello-world", "morning-routine"],
  "disabled": ["experimental-plugin"]
}
```

### Safe Mode

Boot with `?safeMode` URL parameter to disable all plugins:

```
https://clawdbot.com/?safeMode
```

Or set in localStorage:

```javascript
localStorage.setItem('os1:safeMode', 'true');
```

---

## Agent Tools API

Plugins can use these tools (exposed at `window.os1.tools`):

### Filesystem (`fs`)

```javascript
os1.tools.fs.read('/path/to/file');
os1.tools.fs.write('/path/to/file', 'content');
os1.tools.fs.list('/path/to/dir');
os1.tools.fs.exists('/path');
os1.tools.fs.delete('/path');
os1.tools.fs.mkdir('/path');
```

### Navigation (`nav`)

```javascript
os1.tools.nav.open('files', { path: '/documents' });
os1.tools.nav.back();
os1.tools.nav.close();
os1.tools.nav.present('settings');
```

### Voice (`voice`)

```javascript
os1.tools.voice.speak('Hello!', { persona: 'her' });
os1.tools.voice.listen();
os1.tools.voice.stop();
```

### Plugins (`plugin`)

```javascript
os1.tools.plugin.list();
os1.tools.plugin.get('my-plugin');
os1.tools.plugin.reload('my-plugin');
```

### Skills (`skill`)

```javascript
os1.tools.skill.list();
os1.tools.skill.get('greet');
```

### Context (`context`)

```javascript
os1.tools.context.getCurrentApp();
os1.tools.context.getHistory(10);
os1.tools.context.getStory(300000); // Last 5 minutes
```

---

## Example Plugin

Complete example: `hello-world`

### .claude-plugin/plugin.json

```json
{
  "name": "hello-world",
  "version": "1.0.0",
  "description": "A simple greeting plugin for OS1",
  "author": { "name": "OS1 Team" },
  "license": "MIT",
  "skills": "./skills",
  "commands": "./commands",
  "hooks": "./hooks/hooks.json",
  "components": "./components"
}
```

### skills/greet/SKILL.md

```markdown
---
name: greet
description: Greets users warmly. Use when user says hello or requests a greeting.
license: MIT
---

# Greet Skill

Provide friendly greetings.

## Instructions

1. Use voice.speak to say a warm greeting
2. Optionally show the hello-badge component

## Examples

User: "Hello"  
Action: voice.speak("Hello! How can I help you today?")
```

### commands/say-hello.md

```markdown
---
name: say-hello
description: Voice command to trigger a greeting
trigger: voice
phrases:
  - "say hello"
  - "greet me"
---

Activates the greet skill and shows the hello badge.
```

### hooks/hooks.json

```json
{
  "hooks": [
    {
      "event": "on-navigate",
      "config": { "app": "files" },
      "action": "component:show:hello-badge"
    }
  ]
}
```

### components/hello-badge/index.js

```javascript
import { html } from 'htm/preact';

export default function HelloBadge({ host }) {
  return html`
    <div class="badge">
      <span class="wave">👋</span>
      <span class="text">Hello from a plugin!</span>
    </div>
  `;
}
```

### components/hello-badge/styles.css

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(200, 69, 54, 0.1);
  border: 1px solid rgba(200, 69, 54, 0.3);
  border-radius: 20px;
  font-size: 14px;
  color: var(--color-text, #e8e4e0);
}

.wave {
  animation: wave 1s ease-in-out infinite;
}

@keyframes wave {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(20deg); }
}
```

---

## Troubleshooting

### Plugin not loading

1. Check `.claude-plugin/plugin.json` exists and is valid JSON
2. Verify `name` in plugin.json matches directory name
3. Check browser console for errors
4. Ensure plugin is enabled in `/settings/plugins.json`

### Component not rendering

1. Check `index.js` has a default export
2. Verify component uses `htm/preact` syntax
3. Check console for import errors
4. Ensure CSS doesn't have syntax errors

### Skill not activating

1. Verify SKILL.md has required `name` and `description` fields
2. Check name follows validation rules (lowercase, hyphens)
3. Ensure skill directory name matches `name` in frontmatter

### Hot reload not working

1. Changes require file to be re-saved in AgentFS
2. Component must be displayed via `<os1-plugin-slot>`
3. Check for JavaScript errors in console

---

## References

- [Claude Code Plugins](https://docs.anthropic.com/en/docs/claude-code/plugins)
- [Agent Skills Specification](https://agentskills.io/specification)
- [Vercel: Agents with Filesystems](https://vercel.com/blog/how-to-build-agents-with-filesystems-and-bash)
- [Ink & Switch: Malleable Software](https://www.inkandswitch.com/essay/malleable-software/)
