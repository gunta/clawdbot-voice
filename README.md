<p align="center">
  <img src="icons/icon-192.png" alt="CLAWD OS1" width="96" height="96" />
</p>

<h1 align="center">CLAWD OS1</h1>

<p align="center">
  <strong>Your voice companion — works on any device, even offline</strong>
</p>

<p align="center">
  <a href="https://clawdbot.com/">Live Demo</a> •
  <a href="#features">Features</a> •
  <a href="#deploy">Deploy</a> •
  <a href="#development">Development</a>
</p>

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https://github.com/gunta/clawdbot-voice">
    <img src="https://vercel.com/button" alt="Deploy with Vercel" />
  </a>
  <a href="https://deploy.workers.cloudflare.com/?url=https://github.com/gunta/clawdbot-voice">
    <img src="https://deploy.workers.cloudflare.com/button" alt="Deploy to Cloudflare" />
  </a>
</p>

---

## ✨ Features

- **🎙️ Voice Interaction** — Talk naturally with two distinct voice personas
- **🦞 Meet Clawd** — The lobster speaks directly to you
- **👤 Meet Her** — She speaks to Clawd for you
- **📱 Progressive Web App** — Install on any device, works offline
- **🎨 Beautiful UI** — Elegant animations and WebGPU-powered waveforms
- **⚡ Zero Dependencies** — Pure vanilla JavaScript, no build step required
- **🔒 Privacy First** — All processing happens on your device

## 🚀 Deploy

Deploy your own instance with one click:

### Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/gunta/clawdbot-voice)

### Cloudflare Pages

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/gunta/clawdbot-voice)

Or deploy manually:

```bash
# Cloudflare Pages
npm run deploy:cloudflare

# Vercel
npm run deploy:vercel
```

## 🛠️ Development

```bash
# Clone the repository
git clone https://github.com/gunta/clawdbot-voice.git
cd clawdbot-voice

# Start local server
npm run serve

# Open http://localhost:3000
```

No build step required — it's pure vanilla JavaScript!

## 🏗️ Architecture

```
clawdbot-voice/
├── src/
│   ├── app.js              # Main application entry
│   ├── components/         # Custom Web Components
│   │   ├── voice-card.js   # Voice persona cards
│   │   ├── speak-button.js # Main interaction button
│   │   ├── gpu-waveform.js # WebGPU audio visualization
│   │   ├── files-app.js    # Spatial file browser
│   │   ├── commands-app.js # Terminal interface
│   │   └── coder-app.js    # Code editor
│   ├── services/           # Core services
│   │   ├── speech-recognition.js
│   │   ├── speech-synthesis.js
│   │   └── audio-analyzer.js
│   └── styles/             # CSS styling
├── icons/                  # App icons (all sizes)
├── audio/                  # Audio assets
├── index.html              # Single page entry
├── manifest.json           # PWA manifest
└── sw.js                   # Service Worker for offline
```

## 🎯 Tech Stack

- **Web Components** — Native custom elements with Shadow DOM
- **Declarative Shadow DOM** — Server-rendered component templates
- **WebGPU** — Hardware-accelerated waveform visualization
- **Web Speech API** — Native speech recognition & synthesis
- **Service Workers** — Full offline support
- **No Framework** — Pure vanilla JavaScript

## 📦 Apps Included

| App | Description |
|-----|-------------|
| 🎙️ **Voice** | Main voice interaction interface |
| 📁 **Files** | Spatial file browser with gesture support |
| 💻 **Commands** | Terminal interface |
| 📝 **Code** | Monaco-powered code editor |
| ⏰ **Clock** | Beautiful analog clock modal |

## 🌐 Browser Support

- Chrome/Edge 90+
- Safari 15.4+
- Firefox 98+

WebGPU features require Chrome 113+ or Safari 17+

## 📄 License

[MIT](LICENSE) © [gunta](https://x.com/gunta85)

---

<p align="center">
  <sub>Built with 🦞 by <a href="https://x.com/gunta85">gunta</a></sub>
</p>
