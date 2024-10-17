import { Dispatch, useEffect, useState } from 'react'
import { useFilePicker } from 'use-file-picker'
import { Midi } from '@tonejs/midi'
import { Note } from '@tonejs/midi/dist/Note'
import { toFactorioInstrument } from '@/app/lib/factorio-instrument'
import { capitalize } from '@/app/lib/utils'
import { usePostHog } from 'posthog-js/react'
import { getVelocityValues } from '@/app/components/instrument-stage'
import { FactorioInstrumentName } from '@/app/lib/data/factorio-instruments-by-id'

export type NoteExtremes = {
  min: number
  max: number
}

export type Settings = {
  tracks: {
    factorioInstrument?: FactorioInstrumentName
    velocityValues: number[]
    octaveShift: number
  }[]
}

export type Song = {
  midi: Midi
  additionalInfo: {
    noteExtremes: NoteExtremes
    trackExtremes: NoteExtremes[]
  }
  settings: Settings
}

const getNoteExtremes = (
  input: Midi | Note[],
  padding: number = 0,
): { min: number; max: number } => {
  const notes =
    'tracks' in input
      ? input.tracks
          .filter((track) => !track.instrument.percussion)
          .flatMap((track) => track.notes)
      : input

  const result: {
    min?: number
    max?: number
  } = {
    min: undefined,
    max: undefined,
  }

  notes.forEach((note) => {
    if (!result.max || note.midi > result.max) result.max = note.midi
    if (!result.min || note.midi < result.min) result.min = note.midi
  })

  return {
    min: (result.min || 40) - padding,
    max: (result.max || 40 + 3 * 12) + padding,
  }
}

export const preprocessSong = (originalMidi: Midi, filename: string): Song => {
  const midi = new Midi(originalMidi.toArray())
  midi.name = midi.name.trim()

  // Arbitrary rules for when not to accept the midi embedded title and
  //  fall back on the filename instead
  if (
    !midi.name ||
    midi.name.toLowerCase().match(/^(\w*\s*track|\w*\s*template)\s*\d*$/) ||
    midi.name.toLowerCase() === midi.tracks[0].name.trim().toLowerCase()
  )
    midi.name = capitalize(filename.replace(/\.midi?$/, '').replace(/_/g, ' '))

  midi.tracks = midi.tracks.filter(
    (track) => track.notes.length && !track.instrument.percussion,
  )

  // Unify drum tracks
  const drumInstrument = originalMidi.tracks.find(
    (track) => track.instrument.percussion,
  )?.instrument
  if (drumInstrument) {
    const unifiedDrumTrack = midi.addTrack()
    unifiedDrumTrack.instrument = drumInstrument
    unifiedDrumTrack.name = 'Percussion'
    originalMidi.tracks
      .filter((track) => track.instrument.percussion)
      .flatMap((track) => track.notes)
      .forEach((note) => unifiedDrumTrack.addNote(note))
  }

  for (const trackNumber in midi.tracks) {
    if (!midi.tracks[trackNumber].name)
      midi.tracks[trackNumber].name = capitalize(
        midi.tracks[trackNumber].instrument.name,
      )
  }

  return {
    midi,
    additionalInfo: {
      noteExtremes: getNoteExtremes(midi),
      trackExtremes: midi.tracks.map((track) => getNoteExtremes(track.notes)),
    },
    settings: {
      tracks: midi.tracks.map((track) => ({
        factorioInstrument: toFactorioInstrument(track.instrument),
        velocityValues: getVelocityValues(track.notes),
        octaveShift: 0,
      })),
    },
  }
}

export type SelectStageProps = {
  setSong: Dispatch<Song | undefined>
}
export const SelectStage = ({ setSong }: SelectStageProps) => {
  const postHog = usePostHog()
  const [loadingMessage, setLoadingMessage] = useState('')

  const { openFilePicker, filesContent } = useFilePicker({
    accept: ['audio/midi', 'audio/x-midi'],
    readAs: 'ArrayBuffer',
    onFilesSuccessfullySelected: async ({ filesContent }) => {
      postHog.capture('Selected midi file', {
        'File Name': filesContent[0].name,
      })
      setSong(undefined)
    },
  })

  useEffect(() => {
    if (filesContent[0]) {
      requestAnimationFrame(() => {
        setLoadingMessage('Loading file...')

        requestAnimationFrame(() => {
          if (loadingMessage && filesContent.length) {
            const song = new Midi(filesContent[0].content.slice(0))
            const processedSong = preprocessSong(song, filesContent[0].name)
            console.log('Finished processing: ', processedSong)
            setSong(processedSong)

            setLoadingMessage('')
          }
        })
      })
    }
  }, [filesContent, loadingMessage, setSong])

  return (
    <div>
      {loadingMessage ? (
        <div className="panel m0">{loadingMessage}</div>
      ) : (
        <div className="flex-column items-center gap-4">
          <div className="panel max-w-md">
            <p>
              This is a preview of the in-development version of miditorio v2
              for Factorio 2.0 and Space Age.
            </p>
            <p>
              Send feedback about this preview{' '}
              <a
                href="https://github.com/mgabor3141/miditorio/pull/1"
                target="_blank"
              >
                here
              </a>
              .
            </p>
            <p>
              If you would like to generate a blueprint for Factorio 1.x, the
              current released version, please use{' '}
              <a href="v1/">miditorio v1</a>.
            </p>
          </div>

          <button className="button button-green mr0" onClick={openFilePicker}>
            Select MIDI file
          </button>
        </div>
      )}
    </div>
  )
}
