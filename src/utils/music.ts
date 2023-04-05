function playNote(audioContext, frequency, startTime, duration) {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(1, startTime + 0.01);
  gainNode.gain.linearRampToValueAtTime(0, startTime + duration);
  oscillator.frequency.value = frequency;
  oscillator.type = "sine";
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

export function playMelody() {
  const audioContext = new (window.AudioContext || window.AudioContext)();
  const startTime = audioContext.currentTime;
  const noteDuration = 0.3;

  playNote(audioContext, 261.63, startTime, noteDuration); // C4
  playNote(audioContext, 329.63, startTime + noteDuration, noteDuration); // E4
  playNote(audioContext, 392.0, startTime + noteDuration * 2, noteDuration); // G4
  playNote(audioContext, 523.25, startTime + noteDuration * 3, noteDuration); // C5
}
