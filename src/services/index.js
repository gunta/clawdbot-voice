/**
 * Services Index
 * Re-export all services for convenient imports
 */

export { haptic, isHapticSupported } from './haptic.js';
export { wakeLockService } from './wake-lock.js';
export { audioPlayer } from './audio-player.js';
export { audioAnalyzer } from './audio-analyzer.js';
export { speechSynthesis } from './speech-synthesis.js';
export { speechRecognition } from './speech-recognition.js';
export { generateResponse } from './response-generator.js';
export { get, set, remove, isReturningUser } from './storage.js';
export { chimes } from './chimes.js';
export { systemSounds } from './system-sounds.js';
export { generateDateGreeting, getGreetingsCount } from './date-greetings.js';

// AgentFS - Core OS Filesystem
export * as agentfs from './agentfs.js';

// App Context - Inter-app state and communication
export { appContext } from './app-context.js';

// Navigation Service - XState-powered window/modal navigation
export { navigationService } from './navigation-service.js';

// ─────────────────────────────────────────────────────────────────────────────
// Plugin System
// ─────────────────────────────────────────────────────────────────────────────

// Plugin Loader - Discovers and loads plugins
export { pluginLoader } from './plugin-loader.js';

// Skill Loader - Parses SKILL.md files (agentskills.io spec)
export { skillLoader } from './skill-loader.js';

// Hooks Registry - Event hooks for plugins
export { hooksRegistry } from './hooks-registry.js';

// Plugin Module Loader - In-browser ES module loader for AgentFS
export { pluginModuleLoader } from './plugin-module-loader.js';

// Agent Tools API - Structured operations for external agents
export { agentTools, initVoiceServices, exposeGlobally } from './agent-tools.js';
