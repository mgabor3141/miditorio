import { PianoRoll } from '@/app/components/piano-roll'
import { Dispatch, useEffect, useRef, useState } from 'react'
import { Settings, Song } from '@/app/components/select-stage'

export type InstrumentStageProps = {
  song: Song
  onBack: Dispatch<void>
  onContinue: Dispatch<void>
  onSettingsChanged?: Dispatch<Settings>
  className?: string
}
export const InstrumentStage = ({
  song,
  onBack,
  onContinue,
  className,
}: InstrumentStageProps) => {
  const panel = useRef<HTMLDivElement>(null)
  const [selectedTrack, setSelectedTrack] = useState<number | undefined>(
    undefined,
  )
  const midi = song.midi

  useEffect(() => {
    setSelectedTrack(midi.tracks.length === 1 ? 0 : undefined)
  }, [midi.tracks.length])

  useEffect(() => {
    panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <div className={`panel mt0 !pt-4 flex-column ${className}`} ref={panel}>
      <div className="flex items-baseline gap-3">
        <h1 className="text-ellipsis line-clamp-1">{midi.name}</h1>
        <h5 className="flex-grow normal-weight">
          {Math.floor(midi.duration / 60)}:
          {String(Math.floor(midi.duration % 60)).padStart(2, '0')}
        </h5>
        <div className="gap-3 min-w-fit">
          <button
            className="button !text-center !mr-2"
            onClick={() => onBack()}
          >
            Choose another
          </button>
          <button
            className="button-green-right !mr-3 !text-center"
            onClick={() => onContinue()}
          >
            Continue
          </button>
        </div>
      </div>

      <div className="flex gap-3 items-start self-center">
        <div className="panel-inset-lighter flex-column gap-2 flex-start">
          <h3>Tracks</h3>
          {midi.tracks.length > 1 && (
            <div
              key="all"
              className={`button mr0 ${selectedTrack === undefined ? 'button-green' : ''}`}
              onClick={() => setSelectedTrack(undefined)}
            >
              All
            </div>
          )}
          {midi.tracks.map((track, trackNumber) => (
            <div
              key={trackNumber}
              className={`mr0 ${selectedTrack === trackNumber ? 'button-green' : 'button'}`}
              onClick={() => setSelectedTrack(trackNumber)}
            >
              {track.name}
            </div>
          ))}
        </div>
        <div className="panel-inset !pl-0 !bg-[#0E0E0E] f">
          <PianoRoll
            song={song}
            selectedTrack={selectedTrack}
            width={800}
            height={600}
          />
        </div>
      </div>
      <div>
        {selectedTrack !== undefined && (
          <>
            <p>{midi.tracks[selectedTrack].instrument.family}</p>
            <p>{midi.tracks[selectedTrack].instrument.name}</p>
            <p>
              {song.settings.tracks[selectedTrack].factorioInstrument?.name}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
