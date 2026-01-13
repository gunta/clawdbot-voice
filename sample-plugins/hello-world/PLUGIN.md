# Hello World Plugin

A simple demonstration plugin for OS1 showcasing all plugin features.

## Features

- **Skill**: `greet` - Provides friendly greetings
- **Command**: `say-hello` - Voice command to trigger greetings
- **Hook**: Shows badge when navigating to Files app
- **Component**: `hello-badge` - A cheerful greeting badge

## Installation

This plugin can be installed into OS1's AgentFS using the plugin installer:

```javascript
// In browser console:
await os1.tools.fs.mkdir('/plugins/hello-world');
await os1.tools.fs.mkdir('/plugins/hello-world/.claude-plugin');
// ... copy files from sample-plugins/hello-world
```

Or use the Plugin Installer UI in the Settings app.

## Usage

Once installed:
1. Navigate to the Files app to see the hello badge
2. Say "hello" or "greet me" to trigger the greeting skill
3. The plugin will greet you on boot

## Customization

Edit the files in AgentFS:
- `/plugins/hello-world/skills/greet/SKILL.md` - Modify greeting behavior
- `/plugins/hello-world/components/hello-badge/styles.css` - Change badge appearance

## License

MIT
