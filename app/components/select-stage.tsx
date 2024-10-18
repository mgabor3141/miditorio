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
