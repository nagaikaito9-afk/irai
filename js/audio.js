/**
 * 草原のネコさがし - Web Audio API サウンド合成システム
 * 外部音源不要で、高品質な猫の鳴き声・草むらの音・チャイム・環境音を合成
 */
class SoundSystem {
  constructor() {
    this.ctx = null;
    this.bgmEnabled = true;
    this.sfxEnabled = true;
    this.isInitialized = false;
    this.ambientOscillators = [];
  }

  init() {
    if (this.isInitialized) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
      this.isInitialized = true;
      if (this.bgmEnabled) {
        this.startAmbientSound();
      }
    } catch (e) {
      console.warn("AudioContext not supported:", e);
    }
  }

  ensureContext() {
    if (!this.isInitialized) {
      this.init();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // ネコの可愛い「ニャー」声
  playMeow(pitchMultiplier = 1.0, isSpecial = false) {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    // ネコの周波数変調
    osc.type = 'triangle';
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1000 * pitchMultiplier, t);
    filter.Q.setValueAtTime(2.0, t);

    const baseFreq = 580 * pitchMultiplier;
    // ニャ〜ン の抑揚（ピッチの上昇と下降）
    osc.frequency.setValueAtTime(baseFreq * 0.9, t);
    osc.frequency.linearRampToValueAtTime(baseFreq * 1.35, t + 0.12);
    osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.75, t + 0.45);

    // 音量エンベロープ
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(0.28, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.48);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.5);

    // 特別なニャー（子猫や甘えた声）の場合は倍音追加
    if (isSpecial) {
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(baseFreq * 2.0, t);
      osc2.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t + 0.4);
      gain2.gain.setValueAtTime(0.08, t);
      gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(t);
      osc2.stop(t + 0.42);
    }
  }

  // 草をかき分けるサラサラ音
  playGrassRustle() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.12;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // ホワイトノイズ生成
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // バンドパスフィルターで草の擦れ感を演出
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400 + Math.random() * 400, t);
    filter.Q.setValueAtTime(1.8, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, t);
    gain.gain.linearRampToValueAtTime(0.12, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(t);
  }

  // 鈴を鳴らした時の美しいチリン音
  playBellSound() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const notes = [2093, 2637, 3135]; // C7, E7, G7 の透明感のある鈴の和音
    const t = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq + (Math.random() * 15 - 7), t + idx * 0.04);

      gain.gain.setValueAtTime(0.15, t + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + idx * 0.04 + 0.8);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + idx * 0.04);
      osc.stop(t + idx * 0.04 + 0.85);
    });
  }

  // ネコ発見時のキラリ音
  playFoundFanfare() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const chords = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    chords.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t + idx * 0.08);

      gain.gain.setValueAtTime(0.18, t + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + idx * 0.08);
      osc.stop(t + idx * 0.08 + 0.52);
    });
  }

  // ステージクリア時の華やかなファンファーレ
  playClearMusic() {
    if (!this.sfxEnabled) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const melody = [
      { f: 523.25, d: 0.15 }, // C5
      { f: 659.25, d: 0.15 }, // E5
      { f: 783.99, d: 0.15 }, // G5
      { f: 1046.50, d: 0.35 } // C6
    ];

    let offset = 0;
    melody.forEach(note => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(note.f, t + offset);

      gain.gain.setValueAtTime(0.2, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + note.d + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(t + offset);
      osc.stop(t + offset + note.d + 0.12);

      offset += note.d;
    });
  }

  // 公園のそよ風と穏やかな環境音
  startAmbientSound() {
    if (!this.bgmEnabled || !this.ctx) return;
    this.stopAmbientSound();

    try {
      // 優しい風
      const bufferSize = this.ctx.sampleRate * 2.0;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.15;
      }

      const windSource = this.ctx.createBufferSource();
      windSource.buffer = buffer;
      windSource.loop = true;

      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = 'lowpass';
      windFilter.frequency.setValueAtTime(260, this.ctx.currentTime);

      const windGain = this.ctx.createGain();
      windGain.gain.setValueAtTime(0.025, this.ctx.currentTime);

      windSource.connect(windFilter);
      windFilter.connect(windGain);
      windGain.connect(this.ctx.destination);

      windSource.start();
      this.ambientOscillators.push(windSource);
    } catch (e) {
      console.warn("Ambient sound error:", e);
    }
  }

  stopAmbientSound() {
    this.ambientOscillators.forEach(src => {
      try {
        src.stop();
        src.disconnect();
      } catch (e) {}
    });
    this.ambientOscillators = [];
  }

  toggleSound(enabled) {
    this.sfxEnabled = enabled;
    this.bgmEnabled = enabled;
    if (enabled) {
      this.ensureContext();
      this.startAmbientSound();
    } else {
      this.stopAmbientSound();
    }
  }
}

window.soundSystem = new SoundSystem();
