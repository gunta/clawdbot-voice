---
name: greet
description: Greets users warmly. Use when user says hello, hi, or requests a greeting.
license: MIT
metadata:
  author: os1-team
  version: "1.0"
compatibility: OS1 voice-first environment
allowed-tools: voice.speak
---

# Greet Skill

This skill provides friendly greetings for OS1 users.

## Instructions

When activated:
1. Use voice.speak to say a warm greeting
2. Optionally show the hello-badge component via component:show:hello-badge
3. Keep the greeting brief and cheerful

## Examples

User: "Hello"
Action: voice.speak("Hello! How can I help you today?")

User: "Hi there"
Action: voice.speak("Hi! Nice to hear from you.")

User: "Say hi"
Action: voice.speak("Hey there! What's on your mind?")

## Edge Cases

- If user seems to be testing, respond playfully: "Hello! Testing, testing, 1, 2, 3!"
- For multiple greetings in quick succession, vary the response
- If time of day is known, use appropriate greeting (good morning, etc.)

## Voice Persona

Use the "her" voice persona for a warm, friendly tone.
