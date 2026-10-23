// Lightweight sound driver wrapper. Can hook up to expo-av later.
export const SoundManager = {
  isMuted: false,

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  },

  play(effectName: 'tap' | 'win' | 'lose' | 'collision' | 'move') {
    if (this.isMuted) return;
    // Integration placeholder: Audio.Sound.createAsync(...)
    console.log(`[SoundManager] Playing: ${effectName}`);
  }
};
