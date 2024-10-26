import { Dispatch, useEffect, useState } from 'react'
import { useFilePicker } from 'use-file-picker'
import { Midi } from '@tonejs/midi'
import { usePostHog } from 'posthog-js/react'
import { FactorioInstrumentName } from '@/app/lib/data/factorio-instruments-by-id'
import { DrumMapOverrides } from '@/app/lib/drum-map'
import { midiToSong, Song } from '@/app/lib/song'

export type TrackSettings = {
  factorioInstruments: (FactorioInstrumentName | undefined)[]
  velocityValues: number[]
  octaveShift: number

  /**
   * midi note number to Factorio drum sound
   */
  drumMapOverrides?: DrumMapOverrides
}

export type Settings = {
  tracks: TrackSettings[]
  globalNoteShift: number
  speedMultiplier: number
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
            const processedSong = midiToSong(song, filesContent[0].name)
            console.log('Finished processing: ', processedSong)
            setSong(processedSong)

            setLoadingMessage('')
          }
        })
      })
    }
  }, [filesContent, loadingMessage, setSong])

  return (
    <div className="flex-grow flex flex-col items-center">
      <div className="flex-grow-[4]"></div>
      <div className="shadow-[0_10px_35px_10px_rgba(0,_0,_0,_0.7)]">
        {loadingMessage ? (
          <div className="panel m0">{loadingMessage}</div>
        ) : (
          <button className="button button-green mr0" onClick={openFilePicker}>
            Select MIDI file
          </button>
        )}
      </div>
      <div className="flex-grow"></div>
    </div>
  )
}
