export function playRestTimerDing(): void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();

    const playBell = (startTime: number) => {
      // Two oscillators: fundamental + inharmonic partial (bell character)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();

      osc1.connect(gain1); gain1.connect(ctx.destination);
      osc2.connect(gain2); gain2.connect(ctx.destination);

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, startTime);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1108, startTime); // inharmonic partial — gives bell timbre

      // Sharp attack, long decay (bell rings out)
      gain1.gain.setValueAtTime(0.5, startTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, startTime + 1.2);

      gain2.gain.setValueAtTime(0.25, startTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);

      osc1.start(startTime); osc1.stop(startTime + 1.2);
      osc2.start(startTime); osc2.stop(startTime + 0.8);
    };

    playBell(ctx.currentTime);        // first ding
    playBell(ctx.currentTime + 0.45); // second ding, 450ms later (room for the first to ring)

  } catch (e) {
    // Silently fail — audio is non-critical
  }
}
