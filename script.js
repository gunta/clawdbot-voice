// Clawdbot Voice - Bold Red Edition
// Inspired by Her (2013)

class ClawdbotVoice {
    constructor() {
        this.assistantBtn = document.getElementById('assistantBtn');
        this.lobsterBtn = document.getElementById('lobsterBtn');
        this.waveform = document.getElementById('waveform');
        this.status = document.getElementById('status');

        this.currentAudio = null;
        this.isPlaying = false;

        this.init();
    }

    init() {
        this.bindEvents();
        this.updateStatus('ready');
    }

    bindEvents() {
        this.assistantBtn.addEventListener('click', () => this.playVoice('assistant'));
        this.lobsterBtn.addEventListener('click', () => this.playVoice('lobster'));

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === '1' || e.key === 'a' || e.key === 'A') {
                this.playVoice('assistant');
            } else if (e.key === '2' || e.key === 'l' || e.key === 'L') {
                this.playVoice('lobster');
            } else if (e.key === ' ' || e.key === 'Escape') {
                e.preventDefault();
                this.stopAudio();
            }
        });

        // Click anywhere to stop
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.voice-card') && this.isPlaying) {
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
        const voiceName = type === 'assistant' ? 'she speaks...' : 'clawdbot speaks...';
        this.updateStatus(voiceName);

        // Play audio
        this.currentAudio.play().catch(err => {
            console.log('Audio playback failed:', err);
            this.updateStatus('audio not found');
            setTimeout(() => {
                this.stopAudio();
            }, 2000);
        });

        // Handle audio end
        this.currentAudio.addEventListener('ended', () => {
            this.stopAudio();
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
        this.updateStatus('ready');
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
    window.clawdbot = new ClawdbotVoice();
});
