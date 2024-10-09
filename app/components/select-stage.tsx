import { Dispatch, useEffect, useState } from 'react'
import { useFilePicker } from 'use-file-picker'
import { Midi } from '@tonejs/midi'

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const preprocessSong = (originalSong: Midi, filename: string): Midi => {
  const song: typeof originalSong = new Midi(originalSong.toArray())
  if (!song.name) song.name = capitalize(filename.replace(/\.midi?$/, ''))

  song.tracks = song.tracks.filter(
    (track) => track.notes.length && !track.instrument.percussion,
  )

  // Unify drum tracks
  const drumInstrument = originalSong.tracks.find(
    (track) => track.instrument.percussion,
  )?.instrument
  if (drumInstrument) {
    const unifiedDrumTrack = song.addTrack()
    unifiedDrumTrack.instrument = drumInstrument
    unifiedDrumTrack.name = 'Percussion'
    originalSong.tracks
      .filter((track) => track.instrument.percussion)
      .flatMap((track) => track.notes)
      .forEach((note) => unifiedDrumTrack.addNote(note))
  }

  for (const trackNumber in song.tracks) {
    if (!song.tracks[trackNumber].name)
      song.tracks[trackNumber].name = capitalize(
        song.tracks[trackNumber].instrument.name,
      )
  }

  return song
}

export type SelectStageProps = {
  setSong: Dispatch<Midi | undefined>
}
export const SelectStage = ({ setSong }: SelectStageProps) => {
  const [loadingMessage, setLoadingMessage] = useState('')

  const { openFilePicker, filesContent } = useFilePicker({
    accept: ['audio/midi', 'audio/x-midi'],
    readAs: 'ArrayBuffer',
    onFilesSuccessfullySelected: async () => {
      setSong(undefined)
    },
  })

  useEffect(() => {
    if (filesContent[0]) {
      requestAnimationFrame(() => {
        setLoadingMessage('Loading file...')

        requestAnimationFrame(() => {
          if (loadingMessage && filesContent.length) {
            // const midi = await parseArrayBuffer(filesContent[0].content)
            const song = new Midi(filesContent[0].content.slice(0))
            console.log(song)
            const processedSong = preprocessSong(song, filesContent[0].name)
            console.log(processedSong)
            setSong(processedSong)
            // setBlueprintString(midiToBlueprint(midi))

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
        <button className="button button-green mr0" onClick={openFilePicker}>
          Select MIDI file
        </button>
      )}
    </div>
  )
}
