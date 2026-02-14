// Sound Manager - Web Audio API procedural sounds
class SoundManager {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this._initialized = false;
  }

  _init() {
    if (this._initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this._initialized = true;
    } catch {
      this.enabled = false;
    }
  }

  // Resume audio context (needed after user gesture on mobile)
  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  setEnabled(val) {
    this.enabled = val;
  }

  _playTone(frequency, duration, type = 'sine', volume = 0.15) {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);

    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(this.ctx.currentTime);
    osc.stop(this.ctx.currentTime + duration);
  }

  // Short click/move sound
  playMove() {
    this._playTone(220, 0.08, 'sine', 0.08);
  }

  // Merge sound - pitch increases with tile value
  playMerge(value) {
    // Map value to frequency: 4->330, 8->370, ... 2048->880
    const logVal = Math.log2(value);
    const freq = 220 + (logVal - 1) * 60;
    this._playTone(freq, 0.15, 'sine', 0.12);
  }

  // Win sound - ascending arpeggio
  playWin() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;
    this.resume();

    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      setTimeout(() => this._playTone(freq, 0.3, 'sine', 0.12), i * 120);
    });
  }

  // Lose sound - descending tone
  playLose() {
    if (!this.enabled) return;
    this._init();
    if (!this.ctx) return;
    this.resume();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.5);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  // Button click
  playClick() {
    this._playTone(600, 0.05, 'sine', 0.06);
  }
}
