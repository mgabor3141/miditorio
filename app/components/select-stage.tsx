import { Dispatch, useCallback, useEffect, useState } from 'react'
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

const useDragAndDrop = (
  onFile: (file: ArrayBuffer, fileName: string) => Promise<void>,
) => {
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault()
      setIsDragging(true)
    }

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault()
    }

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault()
      if (e.target === document.documentElement) {
        setIsDragging(false)
      }
    }

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer?.files || [])
      const midiFile = files.find(
        (file) =>
          file.type === 'audio/midi' ||
          file.type === 'audio/x-midi' ||
          file.name.endsWith('.mid'),
      )

      if (midiFile) {
        try {
          const buffer = await midiFile.arrayBuffer()
          await onFile(buffer, midiFile.name)
        } catch {
          // Error handling is done in the onFile callback
        }
      }
    }

    document.addEventListener('dragenter', handleDragEnter)
    document.addEventListener('dragover', handleDragOver)
    document.addEventListener('dragleave', handleDragLeave)
    document.addEventListener('drop', handleDrop)

    return () => {
      document.removeEventListener('dragenter', handleDragEnter)
      document.removeEventListener('dragover', handleDragOver)
      document.removeEventListener('dragleave', handleDragLeave)
      document.removeEventListener('drop', handleDrop)
    }
  }, [onFile])

  return isDragging
}

export const SelectStage = ({ setSong }: SelectStageProps) => {
  const postHog = usePostHog()
  const [loadingMessage, setLoadingMessage] = useState('')

  const processFile = useCallback(
    async (file: ArrayBuffer, fileName: string) => {
      postHog.capture('Selected midi file', {
        'File Name': fileName,
      })
      setSong(undefined)

      requestAnimationFrame(() => {
        setLoadingMessage('Loading file...')
        requestAnimationFrame(() => {
          const song = new Midi(file.slice(0))
          setSong(midiToSong(song, fileName))
          setLoadingMessage('')
        })
      })
    },
    [postHog, setSong],
  )

  const { openFilePicker } = useFilePicker({
    accept: ['audio/midi', 'audio/x-midi'],
    readAs: 'ArrayBuffer',
    onFilesSuccessfullySelected: async ({ filesContent }) => {
      await processFile(filesContent[0].content, filesContent[0].name)
    },
  })

  const isDragging = useDragAndDrop(processFile)

  return (
    <>
      {isDragging && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: '1.5rem',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          Drop MIDI file
        </div>
      )}
      <div className="flex-grow flex flex-col items-center">
        <div className="flex-grow-[4]"></div>
        {loadingMessage ? (
          <div className="panel m0 shadow-main-button">{loadingMessage}</div>
        ) : (
          <>
            <div className="flex flex-col items-center shadow-main-button">
              <button
                className="button button-green mr0"
                onClick={openFilePicker}
              >
                Select MIDI file
              </button>
            </div>
            <div className="text-sm mt-1 opacity-75">or drag and drop</div>
          </>
        )}
        <div className="flex-grow"></div>
      </div>
    </>
  )
}
