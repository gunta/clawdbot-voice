---
name: say-hello
description: Voice command to trigger a greeting
trigger: voice
phrases:
  - "say hello"
  - "greet me"
  - "hello"
  - "hi"
---

# Say Hello Command

Activates the greet skill and shows the hello badge component.

## Behavior

1. Activate the `greet` skill
2. Show the `hello-badge` component briefly
3. Speak a warm greeting using the voice API

## Implementation

When this command is triggered:
- Fire the `skill:greet` action
- Fire `component:show:hello-badge` action
- The skill handles the actual greeting logic
