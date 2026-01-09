---
name: clawd-os1
description: Development guide for CLAWD OS1, a voice-first experience inspired by the movie "Her". Use when working on this project's features, components, or architecture. Built as universal static HTML that runs on ANY device with a browser - phones, tablets, TVs, kiosks - with full offline capability.
---

# CLAWD OS1

A voice-first operating system experience inspired by the movie "Her" (2013). The goal is to create an intimate, human-like AI interaction that feels alive and emotionally present.

## Core Philosophy: Universal & Resilient

**"Can't go down. Works everywhere."**

- **Pure static HTML** - No server, no build step, no dependencies that can break
- **Offline-first** - Full functionality without network after first load
- **Universal device support** - Any device with HTML + mic/speakers (phones, tablets, TVs, kiosks)
- **On-device speech** - Native Web Speech APIs, no external services required
- **Progressive enhancement** - Graceful degradation when APIs unavailable

## Ideal Deployment Scenarios

### 🖥️ TV / Living Room Display
A large screen voice companion in the living room or kitchen.
- Samsung/LG/Android TV with built-in browser + mic
- Always-on display mode, voice-activated
- Hands-free interaction from across the room
- Great for: ambient assistant, family use

### 🖥️ Dedicated Device (iMac / Tablet on Stand)
A repurposed device that becomes a dedicated Clawdbot terminal.
- Old iMac, iPad, or Android tablet on a stand
- Browser in fullscreen/kiosk mode
- Always listening, always ready
- Great for: home office, kitchen counter, bedside

### 📱 Mobile PWA (On-the-Go)
Install to home screen for native app experience.
- iOS: Safari → Share → Add to Home Screen
- Android: Chrome → Menu → Install App
- Opens fullscreen, no browser chrome
- Works offline after first load
- Great for: portable assistant, travel

```
Deployment Matrix:
┌─────────────────┬──────────────┬─────────────┬──────────────┐
│ Device          │ Input        │ Install     │ Use Case     │
├─────────────────┼──────────────┼─────────────┼──────────────┤
│ Smart TV        │ Voice + Remote│ Bookmark   │ Living room  │
│ iMac/Desktop    │ Voice + Click │ PWA/Kiosk  │ Always-on    │
│ Tablet on Stand │ Voice + Touch │ PWA        │ Kitchen/Desk │
│ Mobile Phone    │ Voice + Touch │ PWA        │ On-the-go    │
└─────────────────┴──────────────┴─────────────┴──────────────┘
```

## Design Philosophy

### "Her" Aesthetic
- **Warm, intimate feel**: Soft coral/terracotta red (#C84536) as primary color
- **Minimal, breathing UI**: Elements feel alive through subtle animations
- **Voice-first**: Visual UI supports voice, not the other way around
- **Emotional presence**: The interface should feel like it's listening, thinking, responding

### Visual Language
- Clean line-art illustrations (Her character, Clawd lobster)
- Serif italic fonts for names (elegant, personal)
- Sans-serif for UI text (clean, readable)
- Generous whitespace, centered compositions
- Animations that "breathe" - subtle pulses, flows, not jarring transitions

## Tech Stack

### Target Platforms
**Primary (on-device speech)**
- Safari iOS/macOS (excellent native voices)
- Chrome/Edge (desktop & Android)
- Smart TVs with browser + mic
- Any device with HTML5 + Web Speech API

**Degraded but functional**
- Devices without mic (display-only mode)
- Older browsers (no speech, visual-only)

**PWA Installation**
- All platforms that support Service Worker

### Core Technologies
```
HTML5 + CSS3 + ES Modules (no build step)
├── Web Components (Declarative Shadow DOM)
├── Web Audio API (audio analysis, visualization)
├── Web Speech API (recognition + synthesis)
├── Screen Wake Lock API (always-on listening)
├── Service Worker (offline, caching)
├── Media Session API (lock screen controls)
└── Vibration API (haptic feedback)
```

### Architecture
```
src/
├── app.js              # Main orchestrator
├── components/         # Web Components (behavior only)
│   ├── *.js           # Component classes
│   └── styles/*.css   # Component styles (linked via Declarative Shadow DOM)
├── controllers/        # Feature controllers
│   ├── voice-controller.js    # Voice selection, audio playback
│   ├── speech-controller.js   # Recognition, synthesis, responses
│   └── keyboard-controller.js # Keyboard shortcuts
└── services/           # Reusable services
    ├── audio-analyzer.js      # Web Audio frequency analysis
    ├── audio-player.js        # MP3 playback
    ├── speech-recognition.js  # Speech-to-text
    ├── speech-synthesis.js    # Text-to-speech
    ├── wake-lock.js           # Screen wake lock
    └── haptic.js              # Vibration feedback
```

## Implementation Patterns

### Web Components (Declarative Shadow DOM)
Templates live in `index.html`, behavior in JS files:

```html
<voice-card voice="clawd" audio-src="audio/lobster.mp3">
  <template shadowrootmode="open">
    <link rel="stylesheet" href="src/components/styles/voice-card.css">
    <slot name="svg"></slot>
    <div class="divider"></div>
    <slot name="content"></slot>
  </template>
  <!-- Light DOM content here -->
</voice-card>
```

```javascript
// Component JS - behavior only, no template
export class VoiceCard extends HTMLElement {
  connectedCallback() {
    // Access shadowRoot directly (created by browser)
    this.shadowRoot.querySelector('.divider');
  }
}
```

### Audio-Reactive Animations
Connect visualizations to actual audio levels:

```javascript
// Subscribe to audio analyzer
audioAnalyzer.addEventListener('levels', (e) => {
  const { levels, average } = e.detail; // 8 frequency bands, 0-1
  // Animate based on levels
});
```

### Native App Feel
```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

```css
html, body {
  height: 100dvh;
  overflow: hidden;
  overscroll-behavior: none;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
}
```

### Persistent Wake Lock
Keep screen awake for always-on listening:

```javascript
// Auto-reacquires when page becomes visible
wakeLockService.init();
```

## Animation Guidelines

### Breathing/Pulse Effects
```css
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(0.98); }
}
```

### Line Drawing Effects (SVG)
```css
.line {
  stroke-dasharray: 8 4;
  animation: line-flow 1s linear infinite;
}

@keyframes line-flow {
  to { stroke-dashoffset: -24; }
}
```

### Audio-Reactive
Animate stroke-width, opacity, or glow based on frequency levels from audio analyzer.

## Voice Characters

### Her (Assistant)
- Warm, gentle female voice
- Speaks on behalf of Clawd ("She speaks to Clawd for you")
- Visual: Elegant female silhouette line drawing

### Clawd (Lobster)
- Direct, characterful voice
- Speaks directly to user
- Visual: Playful lobster line drawing

## Keyboard Shortcuts
- `Space`: Toggle listening / Stop all
- `1`: Play Her voice
- `2`: Play Clawd voice
- `Escape`: Stop all

## PWA Features

### Offline Capability
```
First Visit (online):
  Browser ──> Loads all assets ──> Service Worker caches everything

Subsequent Visits (offline OK):
  Browser ──> Service Worker serves from cache ──> Full functionality
  
Speech (always on-device):
  User speaks ──> Web Speech API (local) ──> No network needed
  App responds ──> SpeechSynthesis (local) ──> No network needed
```

### Files
- `manifest.json`: Icons, shortcuts, display modes
- `sw.js`: Offline caching, asset preloading (cache-first strategy)
- App shortcuts for quick voice access

### What Works Offline
✅ Full UI and animations
✅ Custom fonts (self-hosted, no CDN)
✅ Speech recognition (on-device)
✅ Speech synthesis (on-device voices)
✅ Audio playback (cached MP3s)
✅ Wake lock, haptics

### What Needs Network (Optional Enhancements)
⚡ Future cloud TTS providers (ElevenLabs, etc.)

## Speech Provider Architecture

### Default: On-Device (Always Available)
```javascript
// Built-in - works offline, no API keys
speechRecognition  // Web Speech API (SpeechRecognition)
speechSynthesis    // Web Speech API (SpeechSynthesisUtterance)
```

### Future: Optional Cloud Providers
When network available, can enhance with premium voices:
```javascript
// Provider interface (future)
interface SpeechProvider {
  speak(text: string, options?: object): Promise<void>
  isAvailable(): boolean
  requiresNetwork(): boolean
}

// Potential providers:
// - ElevenLabs (high-quality voices)
// - OpenAI TTS
// - Google Cloud TTS
// - Azure Cognitive Services
```

**Design Principle**: Cloud providers are OPTIONAL enhancements. On-device speech is always the fallback. The app MUST work without any API keys or network.

## Quality Standards
- No build tools (pure ES modules)
- Graceful degradation for unsupported APIs
- Console logging with `[Tag]` prefixes
- Events over callbacks (EventTarget pattern)
- CSS custom properties for theming
- **Zero external runtime dependencies**
- **Offline-first: network is a bonus, not a requirement**
