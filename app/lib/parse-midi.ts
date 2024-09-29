import {
  IMidiFile,
  IMidiNoteOnEvent,
  IMidiProgramChangeEvent,
  IMidiSetTempoEvent,
  IMidiTextEvent,
  IMidiTrackNameEvent,
} from 'midi-json-parser-worker'
import { Song } from '@/app/lib/song.mjs'

export const midiToInternalSong = (midi: IMidiFile) => {
  const song = new Song()

  let deltaUnit = 0
  for (const track in midi.tracks) {
    let time = 0

    for (const event of midi.tracks[track]) {
      time += event.delta * deltaUnit
      if (Object.hasOwn(event, 'setTempo')) {
        deltaUnit =
          (event as IMidiSetTempoEvent).setTempo.microsecondsPerQuarter /
          1_000 /
          midi.division
        // millisecondsPerQuarter =
        //   (event as IMidiSetTempoEvent).setTempo.microsecondsPerQuarter / 1_000
      } else if (Object.hasOwn(event, 'trackName'))
        song
          .getTrack(event.track)
          .setName((event as IMidiTrackNameEvent).trackName)
      else if (Object.hasOwn(event, 'text'))
        song.getTrack(event.track).addText(time, (event as IMidiTextEvent).text)
      else if (Object.hasOwn(event, 'programChange'))
        song.addInstrumentChange(
          time,
          event.channel,
          (event as IMidiProgramChangeEvent).programChange.programNumber,
        )
      else if (Object.hasOwn(event, 'noteOn'))
        song.addNote(
          time,
          event.channel,
          track,
          (event as IMidiNoteOnEvent).noteOn.noteNumber,
          (event as IMidiNoteOnEvent).noteOn.velocity,
        )
    }
  }

  return song
}
