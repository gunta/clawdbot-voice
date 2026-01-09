// Clawdbot Voice - OS1 Interface
// Inspired by Her (2013)

class OS1Interface {
    constructor() {
        this.assistantBtn = document.getElementById('assistantBtn');
        this.lobsterBtn = document.getElementById('lobsterBtn');
        this.waveform = document.getElementById('waveform');
        this.status = document.getElementById('status');
        this.particles = document.getElementById('particles');

        this.currentAudio = null;
        this.isPlaying = false;

        this.init();
    }

    init() {
        this.createParticles();
        this.bindEvents();
        this.updateStatus('Ready to listen');
    }

    createParticles() {
        const particleCount = 30;

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';

            // Random position
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';

            // Random animation delay and duration
            particle.style.animationDelay = Math.random() * 15 + 's';
            particle.style.animationDuration = (10 + Math.random() * 10) + 's';

            // Random size
            const size = 2 + Math.random() * 4;
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';

            this.particles.appendChild(particle);
        }
    }

    bindEvents() {
        this.assistantBtn.addEventListener('click', () => this.playVoice('assistant'));
        this.lobsterBtn.addEventListener('click', () => this.playVoice('lobster'));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === '1' || e.key === 'a') {
                this.playVoice('assistant');
            } else if (e.key === '2' || e.key === 'l') {
                this.playVoice('lobster');
            } else if (e.key === ' ' || e.key === 'Escape') {
                e.preventDefault();
                this.stopAudio();
            }
        });
    }

    playVoice(type) {
        // Stop any currently playing audio
        if (this.currentAudio) {
            this.stopAudio();
        }

        const btn = type === 'assistant' ? this.assistantBtn : this.lobsterBtn;
        const audioPath = btn.dataset.audio;

        // Create new audio element
        this.currentAudio = new Audio(audioPath);
        this.isPlaying = true;

        // Add playing state
        btn.classList.add('playing');
        this.waveform.classList.add('active');
        this.status.classList.add('playing');

        // Update status
        const voiceName = type === 'assistant' ? 'Assistant' : 'Clawdbot';
        this.updateStatus(`${voiceName} is speaking...`);

        // Play audio
        this.currentAudio.play().catch(err => {
            console.log('Audio playback failed:', err);
            this.updateStatus('Audio file not found - upload MP3 to audio folder');
            this.stopAudio();
        });

        // Handle audio end
        this.currentAudio.addEventListener('ended', () => {
            this.stopAudio();
            this.updateStatus('Ready to listen');
        });

        // Store reference to button for cleanup
        this.currentButton = btn;
    }

    stopAudio() {
        if (this.currentAudio) {
            this.currentAudio.pause();
            this.currentAudio.currentTime = 0;
            this.currentAudio = null;
        }

        // Remove playing states
        this.assistantBtn.classList.remove('playing');
        this.lobsterBtn.classList.remove('playing');
        this.waveform.classList.remove('active');
        this.status.classList.remove('playing');

        this.isPlaying = false;
        this.updateStatus('Ready to listen');
    }

    updateStatus(text) {
        const statusText = this.status.querySelector('.status-text');
        if (statusText) {
            statusText.textContent = text;
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.os1 = new OS1Interface();
});

// Easter egg - Double click logo for extra glow
document.addEventListener('DOMContentLoaded', () => {
    const logo = document.querySelector('.logo-circle');
    if (logo) {
        logo.addEventListener('dblclick', () => {
            logo.style.animation = 'none';
            logo.offsetHeight; // Trigger reflow
            logo.style.animation = 'pulse 0.5s ease-in-out 3';

            setTimeout(() => {
                logo.style.animation = 'pulse 3s infinite ease-in-out';
            }, 1500);
        });
    }
});
