export function Note(time, channel, track, pitch, velocity, instrument) {
  this.time = time
  this.channel = channel
  this.track = track
  this.pitch = pitch
  this.velocity = velocity
  this.instrument = instrument
}

Note.prototype.convert = function () {
  let pitch = this.instrument.factorioInstrument.convert(this.pitch)

  // Don't shift DrumKits
  if (this.instrument.instrument === -1) return pitch

  pitch += this.instrument.shift * 12

  pitch += this.track.shift * 12

  // pitch += song.globalshift

  return pitch
}
