import { PianoRoll } from '@/app/components/piano-roll'
import { Midi } from '@tonejs/midi'
import { useEffect, useRef, useState } from 'react'

export type InstrumentStageProps = {
  song: Midi
}
export const InstrumentStage = ({ song }: InstrumentStageProps) => {
  const panel = useRef<HTMLDivElement>(null)
  const [selectedTrack, setSelectedTrack] = useState<number | undefined>(
    undefined,
  )

  useEffect(() => {
    setSelectedTrack(song.tracks.length === 1 ? 0 : undefined)
  }, [song.tracks.length])

  useEffect(() => {
    panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <div className="panel mt0 !pt-4 flex-column" ref={panel}>
      <div className="flex items-baseline gap-3">
        <h1 className="text-ellipsis line-clamp-1">{song.name}</h1>
        <h5 className="flex-grow normal-weight">
          {Math.floor(song.duration / 60)}:
          {String(Math.floor(song.duration % 60)).padStart(2, '0')}
        </h5>
        <div className="gap-3 min-w-fit">
          <button className="button !text-center !mr-2">Choose another</button>
          <button className="button-green-right !mr-3 !text-center">
            Continue
          </button>
        </div>
      </div>

      <div className="flex gap-3 items-start self-center">
        <div className="panel-inset-lighter flex-column gap-2 flex-start">
          <h3>Tracks</h3>
          {song.tracks.length > 1 && (
            <div
              key="all"
              className={`button mr0 ${selectedTrack === undefined ? 'button-green' : ''}`}
              onClick={() => setSelectedTrack(undefined)}
            >
              All
            </div>
          )}
          {song.tracks.map((track, trackNumber) => (
            <div
              key={trackNumber}
              className={`mr0 ${selectedTrack === trackNumber ? 'button-green' : 'button'}`}
              onClick={() => setSelectedTrack(trackNumber)}
            >
              {track.name}
            </div>
          ))}
        </div>
        <div className="panel-inset !pl-0 !bg-[#171616] f">
          <PianoRoll
            song={song}
            selectedTrack={selectedTrack}
            width={800}
            height={600}
          />
        </div>
      </div>
    </div>
  )
}