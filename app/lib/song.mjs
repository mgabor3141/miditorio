/*
	Ok this is kinda tricky.
	Note data is stored in Song.notes
	Tracks and Instruments store the index of their respective notes within Song.notes
	Instruments are grouped into arrays by the channel they're on 
*/
import { Instrument } from './instrument.mjs'
import { Track } from '@/app/lib/track.mjs'
import { Note } from '@/app/lib/note.mjs'
import { factorio_instrument } from '@/app/lib/data.mjs'

export function Song() {
  this.name = ''
  this.time = 0
  this.globalshift = 0
  this.notes = []
  this.tracks = []
  this.instruments = []
  this.instruments[9] = [new Instrument(0, -1)] // Drum Track
}

Song.prototype.addNote = function (time, channel, track, pitch, velocity) {
  if (this.tracks[track] === undefined)
    this.tracks[track] = new Track(track, this)

  this.tracks[track].addNote(this.notes.length)

  if (this.getInstrument(time, channel) === undefined)
    this.addInstrumentChange(time, channel, 0)

  const instrument = this.getInstrument(time, channel)
  instrument.addNote(this.notes.length)

  this.notes.push(
    new Note(time, channel, this.tracks[track], pitch, velocity, instrument),
  )

  if (time > this.time) this.time = time
}

Song.prototype.getTrack = function (track) {
  if (this.tracks[track] === undefined)
    this.tracks[track] = new Track(track, this)

  return this.tracks[track]
}

Song.prototype.getInstrument = function (time, channel) {
  if (channel === 9) return this.instruments[9][0]

  let maximumInstrumentTime = -1
  let maximumInstrument

  for (const instrumentNumber in this.instruments[channel]) {
    const instrument = this.instruments[channel][instrumentNumber]
    if (instrument.time <= time && instrument.time > maximumInstrumentTime) {
      maximumInstrument = instrument
      maximumInstrumentTime = instrument.time
    }
  }

  return maximumInstrument
}

Song.prototype.addInstrumentChange = function (time, channel, instrument) {
  if (channel === 9) return

  if (this.instruments[channel] === undefined) {
    this.instruments[channel] = []
    this.instruments[channel].push(new Instrument(time, instrument)) // add new
  } else {
    const existing = this.instruments[channel].find(
      (value) => value.time === time,
    )

    if (existing !== undefined) existing.instrument = instrument
    else this.instruments[channel].push(new Instrument(time, instrument)) // add new
  }
}

Song.prototype.toFactorio = function () {
  const factorioInstruments = []

  for (const instrument_channel of this.instruments) {
    for (const instrumentNumber in instrument_channel) {
      const instrument = instrument_channel[instrumentNumber]
      const factorioInstrument = instrument.factorioInstrument

      if (factorioInstruments[factorioInstrument.name] === undefined)
        factorioInstruments[factorioInstrument.name] = []

      for (const instrument_note of instrument.notes) {
        const note = this.notes[instrument_note]

        const factorioTick = Math.round(note.time * 0.06) + 10 // Milliseconds to 1/60 sec tick
        if (
          factorioInstruments[factorioInstrument.name][factorioTick] ===
          undefined
        )
          factorioInstruments[factorioInstrument.name][factorioTick] = []

        if (factorioInstrument.checkRange(note)) {
          factorioInstruments[factorioInstrument.name][factorioTick].push(
            note.convert(),
          )
        }
      }
    }
  }

  const delays = []
  const factorioSignals = []
  let signalInstruments = []

  let signalsUsed = 0

  for (const instrument_i in factorioInstruments) {
    const instrument = factorioInstruments[instrument_i]
    for (const delay in instrument) {
      const chord = instrument[delay]

      delays.push(parseInt(delay))

      for (let i in chord) {
        i = parseInt(i)
        if (factorioSignals[signalsUsed + i] === undefined) {
          factorioSignals[signalsUsed + i] = []
          signalInstruments.push(factorio_instrument[instrument_i])
        }

        factorioSignals[signalsUsed + i][delay] = chord[i]
      }
    }

    signalsUsed = factorioSignals.length
  }

  signalInstruments = signalInstruments.slice(0, 77)

  // This could be done better performance-wise
  let uniqueDelays = []
  delays.forEach(function (delay) {
    if (!uniqueDelays.includes(delay)) uniqueDelays.push(delay)
  })
  uniqueDelays = uniqueDelays.toSorted(function (a, b) {
    return a - b
  })

  return {
    delays: uniqueDelays,
    factorioSignals: factorioSignals,
    signalInstruments: signalInstruments,
  }
}
