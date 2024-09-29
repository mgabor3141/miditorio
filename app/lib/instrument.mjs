import { getFactorioInstrument } from './data.mjs'

export function Instrument(time, instrument) {
  this.time = time
  this.instrument = instrument
  this.shift = 0

  this.notes = []

  this.factorioInstrument = getFactorioInstrument(instrument)
}

Instrument.prototype.addNote = function (id) {
  this.notes.push(id)
}

Instrument.prototype.getRangeData = function () {
  var data = { above: 0, below: 0, max: { above: 0, below: 0 } }

  for (var note_i in this.notes) {
    var note = song.notes[this.notes[note_i]]

    var range = this.factorioInstrument.checkRange(note, true)
    if (range !== true) {
      data[range.direction]++
      if (range.delta > data.max[range.direction])
        data.max[range.direction] = range.delta
    }
  }

  return data
}

Instrument.prototype.setShift = function (shift) {
  this.shift = shift

  updateTrackInfos()
}
