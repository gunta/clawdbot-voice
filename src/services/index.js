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
