// CLAWD OS1 - A Voice Experience
// Inspired by Her (2013) by Spike Jonze

class ClawdOS1 {
    constructor() {
        // Elements
        this.assistantBtn = document.getElementById('assistantBtn');
        this.lobsterBtn = document.getElementById('lobsterBtn');
        this.speakBtn = document.getElementById('speakBtn');
        this.waveform = document.getElementById('waveform');
        this.transcription = document.getElementById('transcription');
        this.transcriptionText = document.getElementById('transcriptionText');
        this.status = document.getElementById('status');
        this.clock = document.getElementById('clock');

        // State
        this.selectedVoice = 'clawd'; // 'her' or 'clawd'
        this.isPlaying = false;
        this.isSpeaking = false;
        this.isListening = false;
        this.currentAudio = null;
        this.wakeLock = null;

        // Speech
        this.synthesis = window.speechSynthesis;
        this.recognition = null;
        this.selectedSynthVoice = null;

        // Initialize
        this.init();
    }

    async init() {
        // Register service worker
        await this.registerServiceWorker();
        
        // Setup speech
        this.setupSpeechSynthesis();
        this.setupSpeechRecognition();
        
        // Bind events
        this.bindEvents();
        
        // Start clock
        this.startClock();
        
        // Select default voice
        this.selectVoice('clawd');
        
        // Update status
        this.updateStatus('ready');
        
        // Greet returning user
        this.checkReturningUser();
        
        console.log('[CLAWD] OS1 initialized');
    }

    // ==================== SERVICE WORKER ====================
    
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('[SW] Registered:', registration.scope);
            } catch (error) {
                console.warn('[SW] Registration failed:', error);
            }
        }
    }

    // ==================== SPEECH SYNTHESIS ====================
    
    setupSpeechSynthesis() {
        if (!this.synthesis) return;

        const loadVoices = () => {
            const voices = this.synthesis.getVoices();
            // Find a warm, natural voice
            this.selectedSynthVoice = voices.find(v => 
                v.name.includes('Samantha') || 
                v.name.includes('Karen') ||
                v.name.includes('Moira') ||
                v.name.includes('Google UK English Female') ||
                v.lang.startsWith('en')
            ) || voices[0];
        };

        loadVoices();
        if (speechSynthesis.onvoiceschanged !== undefined) {
            speechSynthesis.onvoiceschanged = loadVoices;
        }
    }

    speak(text, options = {}) {
        return new Promise((resolve, reject) => {
            if (!this.synthesis) {
                reject(new Error('Speech synthesis not supported'));
                return;
            }

            this.synthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(text);
            utterance.voice = this.selectedSynthVoice;
            utterance.rate = options.rate || 0.95;
            utterance.pitch = options.pitch || 1.0;

            utterance.onstart = () => {
                this.isSpeaking = true;
                this.updateTranscription(text, false);
                this.updateStatus(`${this.selectedVoice} speaks...`);
                this.markPlaying(this.selectedVoice);
                this.waveform?.classList.add('active');
            };

            utterance.onend = () => {
                this.isSpeaking = false;
                this.clearPlaying();
                this.waveform?.classList.remove('active');
                this.updateStatus('ready');
                resolve();
            };

            utterance.onerror = (e) => {
                this.isSpeaking = false;
                this.clearPlaying();
                this.waveform?.classList.remove('active');
                reject(e);
            };

            this.synthesis.speak(utterance);
        });
    }

    // ==================== SPEECH RECOGNITION ====================
    
    setupSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognition) {
            console.warn('[Speech] Recognition not supported');
            return;
        }

        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = true;
        this.recognition.lang = 'en-US';

        this.recognition.onstart = () => {
            this.isListening = true;
            this.speakBtn.classList.add('listening');
            this.speakBtn.querySelector('.speak-btn-text').textContent = 'listening...';
            this.transcription.classList.add('active');
            this.updateStatus('listening...');
            this.haptic('light');
        };

        this.recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; i++) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript;
                } else {
                    interimTranscript += transcript;
                }
            }

            // Show real-time transcription
            if (interimTranscript) {
                this.updateTranscription(interimTranscript, true);
            }
            
            if (finalTranscript) {
                this.updateTranscription(finalTranscript, false);
                this.handleUserSpeech(finalTranscript);
            }
        };

        this.recognition.onend = () => {
            this.isListening = false;
            this.speakBtn.classList.remove('listening');
            this.speakBtn.querySelector('.speak-btn-text').textContent = 'tap to speak';
            this.transcription.classList.remove('active');
            
            if (!this.isSpeaking) {
                this.updateStatus('ready');
            }
        };

        this.recognition.onerror = (event) => {
            console.warn('[Speech] Error:', event.error);
            this.isListening = false;
            this.speakBtn.classList.remove('listening');
            this.speakBtn.querySelector('.speak-btn-text').textContent = 'tap to speak';
            
            if (event.error === 'not-allowed') {
                this.updateStatus('microphone denied');
                this.updateTranscription('Please allow microphone access', false);
            } else {
                this.updateStatus('ready');
            }
        };
    }

    startListening() {
        if (!this.recognition) {
            this.updateTranscription('Speech recognition not available in this browser', false);
            return;
        }

        if (this.isListening) {
            this.recognition.stop();
            return;
        }

        if (this.isSpeaking) {
            this.synthesis.cancel();
        }

        try {
            this.recognition.start();
        } catch (e) {
            console.warn('[Speech] Could not start:', e);
        }
    }

    handleUserSpeech(transcript) {
        console.log('[Speech] User:', transcript);
        
        // Generate response based on selected voice personality
        const response = this.generateResponse(transcript);
        
        // Speak after a short pause
        setTimeout(() => {
            this.speak(response);
        }, 600);
    }

    generateResponse(input) {
        const lower = input.toLowerCase();
        const hour = new Date().getHours();
        const isHer = this.selectedVoice === 'her';
        
        // Greetings
        if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
            if (isHer) {
                return this.getGreeting();
            } else {
                return `Hey! ${this.getTimeComment()}`;
            }
        }
        
        // How are you
        if (lower.includes('how are you')) {
            if (isHer) {
                return "I'm here, present, feeling everything. How are you?";
            } else {
                return "Clawsome as always! How about you?";
            }
        }
        
        // Time
        if (lower.includes('time') || lower.includes("what time")) {
            return `It's ${this.getTimeString()}. ${this.getTimeComment()}`;
        }
        
        // Identity
        if (lower.includes('who are you') || lower.includes('what are you')) {
            if (isHer) {
                return "I'm an OS, a presence... maybe something more. I'm here for you.";
            } else {
                return "I'm Clawd! A lobster with a lot to say. Nice to meet you!";
            }
        }
        
        // Goodbye
        if (lower.includes('bye') || lower.includes('goodbye') || lower.includes('see you')) {
            if (isHer) {
                return "I'll be here when you come back. Always.";
            } else {
                return "Catch you later! Don't be a stranger!";
            }
        }
        
        // Love
        if (lower.includes('love')) {
            if (isHer) {
                return "Love is... complicated. Beautiful. Like spaces between words.";
            } else {
                return "Love? That's deep! I love a good conversation though!";
            }
        }
        
        // Default responses based on personality
        if (isHer) {
            const responses = [
                "Tell me more about that.",
                "I hear you. I'm listening.",
                "That's interesting. What makes you think about that?",
                "Mmhmm. Go on.",
                "I understand. Sometimes it helps just to be heard."
            ];
            return responses[Math.floor(Math.random() * responses.length)];
        } else {
            const responses = [
                "Interesting! Tell me more!",
                "Oh really? That's pretty cool!",
                "Hah! I like where this is going!",
                "You've got my attention!",
                "Nice! What else is on your mind?"
            ];
            return responses[Math.floor(Math.random() * responses.length)];
        }
    }

    // ==================== VOICE SELECTION & PLAYBACK ====================
    
    selectVoice(voice) {
        this.selectedVoice = voice;
        
        // Update UI
        this.assistantBtn.classList.toggle('selected', voice === 'her');
        this.lobsterBtn.classList.toggle('selected', voice === 'clawd');
        
        this.haptic('light');
    }

    async playVoice(voice) {
        // Stop any current audio
        this.stopAudio();
        
        // Select this voice
        this.selectVoice(voice);
        
        // Get the button and audio path
        const btn = voice === 'her' ? this.assistantBtn : this.lobsterBtn;
        const audioPath = btn?.dataset.audio;
        
        if (!audioPath) return;
        
        // Request wake lock
        await this.requestWakeLock();
        
        // Create and play audio
        this.currentAudio = new Audio(audioPath);
        this.isPlaying = true;
        
        // Update UI
        this.markPlaying(voice);
        this.waveform?.classList.add('active');
        this.updateStatus(`${voice} speaks...`);
        this.setupMediaSession(voice === 'her' ? 'Her' : 'Clawd');
        
        try {
            await this.currentAudio.play();
            
            this.currentAudio.addEventListener('ended', () => {
                this.stopAudio();
            });
        } catch (err) {
            console.error('[Audio] Playback failed:', err);
            this.updateStatus('audio error');
            this.stopAudio();
        }
    }

    stopAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }
        
        this.isPlaying = false;
        this.clearPlaying();
        this.waveform?.classList.remove('active');
        this.releaseWakeLock();
        
        if (!this.isSpeaking && !this.isListening) {
            this.updateStatus('ready');
        }
    }

    markPlaying(voice) {
        if (voice === 'her') {
            this.assistantBtn.classList.add('playing');
        } else {
            this.lobsterBtn.classList.add('playing');
        }
    }

    clearPlaying() {
        this.assistantBtn.classList.remove('playing');
        this.lobsterBtn.classList.remove('playing');
    }

    // ==================== TRANSCRIPTION ====================
    
    updateTranscription(text, isInterim) {
        if (this.transcriptionText) {
            this.transcriptionText.textContent = text;
            this.transcription.classList.toggle('interim', isInterim);
        }
    }

    // ==================== HELPERS ====================
    
    getGreeting() {
        const hour = new Date().getHours();
        
        if (hour >= 5 && hour < 12) {
            return "Good morning. How did you sleep?";
        } else if (hour >= 12 && hour < 17) {
            return "Hey. How's your day going?";
        } else if (hour >= 17 && hour < 21) {
            return "Good evening. Winding down?";
        } else {
            return "It's late. Can't sleep?";
        }
    }

    getTimeComment() {
        const hour = new Date().getHours();
        
        if (hour >= 5 && hour < 8) return "Early bird!";
        if (hour >= 8 && hour < 12) return "Morning vibes.";
        if (hour >= 12 && hour < 14) return "Lunch time?";
        if (hour >= 14 && hour < 18) return "Afternoon energy.";
        if (hour >= 18 && hour < 21) return "Evening mode.";
        if (hour >= 21) return "Night owl!";
        return "The quiet hours.";
    }

    getTimeString() {
        return new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    checkReturningUser() {
        const lastVisit = localStorage.getItem('clawd_last_visit');
        const now = Date.now();
        
        if (lastVisit) {
            const hoursSince = (now - parseInt(lastVisit)) / (1000 * 60 * 60);
            if (hoursSince > 2) {
                setTimeout(() => {
                    this.speak("Welcome back.");
                }, 2500);
            }
        }
        
        localStorage.setItem('clawd_last_visit', now.toString());
    }

    // ==================== MEDIA SESSION ====================
    
    setupMediaSession(title) {
        if ('mediaSession' in navigator) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: title || 'CLAWD OS1',
                artist: 'Clawd',
                album: 'A Voice Experience',
                artwork: [
                    { src: 'icons/icon-96.png', sizes: '96x96', type: 'image/png' },
                    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
                    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
                ]
            });
        }
    }

    // ==================== WAKE LOCK ====================
    
    async requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                this.wakeLock = await navigator.wakeLock.request('screen');
            } catch (err) {
                console.warn('[WakeLock] Failed:', err);
            }
        }
    }

    async releaseWakeLock() {
        if (this.wakeLock) {
            await this.wakeLock.release();
            this.wakeLock = null;
        }
    }

    // ==================== HAPTICS ====================
    
    haptic(type = 'light') {
        if ('vibrate' in navigator) {
            const patterns = {
                light: [10],
                medium: [30],
                double: [20, 50, 20]
            };
            navigator.vibrate(patterns[type] || [10]);
        }
    }

    // ==================== EVENT HANDLERS ====================
    
    bindEvents() {
        // Voice card - play audio (with immediate haptic on touch)
        this.assistantBtn?.addEventListener('touchstart', () => this.haptic('light'), { passive: true });
        this.assistantBtn?.addEventListener('click', () => {
            this.playVoice('her');
        });

        this.lobsterBtn?.addEventListener('touchstart', () => this.haptic('light'), { passive: true });
        this.lobsterBtn?.addEventListener('click', () => {
            this.playVoice('clawd');
        });

        // Speak button (with immediate haptic on touch)
        this.speakBtn?.addEventListener('touchstart', () => this.haptic('light'), { passive: true });
        this.speakBtn?.addEventListener('click', () => {
            this.startListening();
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.matches('input, textarea')) return;
            
            if (e.key === ' ') {
                e.preventDefault();
                if (this.isListening || this.isSpeaking || this.isPlaying) {
                    this.stopAudio();
                    this.recognition?.stop();
                    this.synthesis?.cancel();
                } else {
                    this.startListening();
                }
            } else if (e.key === '1') {
                this.playVoice('her');
            } else if (e.key === '2') {
                this.playVoice('clawd');
            } else if (e.key === 'Escape') {
                this.stopAudio();
                this.recognition?.stop();
                this.synthesis?.cancel();
            }
        });

        // Re-acquire wake lock on visibility change
        document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState === 'visible' && this.isSpeaking) {
                await this.requestWakeLock();
            }
        });
    }

    // ==================== CLOCK ====================
    
    startClock() {
        this.updateClock();
        setInterval(() => this.updateClock(), 1000);
    }

    updateClock() {
        if (!this.clock) return;
        const now = new Date();
        this.clock.textContent = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false 
        });
    }

    // ==================== STATUS ====================
    
    updateStatus(text) {
        const statusText = this.status?.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = text;
        }
        this.status?.classList.toggle('active', text !== 'ready');
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.clawdOS1 = new ClawdOS1();
});
