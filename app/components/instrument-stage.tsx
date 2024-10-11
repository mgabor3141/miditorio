import { PianoRoll } from '@/app/components/piano-roll'
import React, { Dispatch, useEffect, useRef, useState } from 'react'
import { Settings, Song } from '@/app/components/select-stage'
import { computeClusterMeans, dbscan1D } from '@/app/lib/dbscan'
import {
  FactorioInstrumentName,
  factorioInstrumentsById,
} from '@/app/lib/data/factorio-instruments-by-id'
import { FACTORIO_INSTRUMENT } from '@/app/lib/factorio-instrument'
import { kMeans1D } from '@/app/lib/kmeans'
import { Histogram } from '@/app/components/histogram'

export type InstrumentStageProps = {
  song: Song
  onBack: Dispatch<void>
  onContinue: Dispatch<void>
  onSettingsChanged: Dispatch<(settings: Settings) => Settings>
  className?: string
}
export const InstrumentStage = ({
  song,
  onBack,
  onContinue,
  className,
  onSettingsChanged,
}: InstrumentStageProps) => {
  const panel = useRef<HTMLDivElement>(null)
  const [selectedTrack, setSelectedTrack] = useState<number | undefined>(
    undefined,
  )
  const {
    midi,
    additionalInfo: { noteExtremes },
    settings,
  } = song

  useEffect(() => {
    setSelectedTrack(midi.tracks.length === 1 ? 0 : undefined)
  }, [midi.tracks.length])

  useEffect(() => {
    panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  // const clusters =
  //   selectedTrack &&
  //   dbscan1D(
  //     song.midi.tracks[selectedTrack].notes.map(({ velocity }) =>
  //       Number(velocity.toFixed(4)),
  //     ),
  //     0.01,
  //   )
  // const centers = clusters && computeClusterMeans(clusters)

  const { clusters, centroids } = kMeans1D(
    midi.tracks[selectedTrack ?? 0].notes.map(({ velocity }) => velocity),
    settings.tracks[selectedTrack ?? 0].velocityBuckets,
  )

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
        <div className="flex-column">
          <div className="panel-inset !pl-0 !bg-[#0E0E0E]">
            <PianoRoll
              midi={midi}
              noteExtremes={noteExtremes}
              settings={settings}
              selectedTrack={selectedTrack}
              width={800}
              height={600}
            />
          </div>
          {selectedTrack !== undefined && (
            <div>
              <h3>Instrument Settings</h3>
              <p>
                Factorio Instrument
                <select
                  className="ml-4 text-black"
                  value={
                    settings.tracks[selectedTrack].factorioInstrument?.name
                  }
                  onChange={({ currentTarget: { value } }) =>
                    onSettingsChanged((settings) => {
                      settings.tracks[selectedTrack].factorioInstrument =
                        FACTORIO_INSTRUMENT[
                          value as keyof typeof FACTORIO_INSTRUMENT
                        ] ?? value
                      return settings
                    })
                  }
                >
                  {Object.keys(FACTORIO_INSTRUMENT).map((instrument) => (
                    <option key={instrument} value={instrument}>
                      {instrument}
                    </option>
                  ))}
                  <option key="none" value={undefined}>
                    [Mute]
                  </option>
                </select>
              </p>
              <p>
                Note volumes
                <input
                  type="number"
                  className="ml-4"
                  value={settings.tracks[selectedTrack].velocityBuckets}
                  onInput={({ currentTarget: { value } }) =>
                    onSettingsChanged((settings) => {
                      settings.tracks[selectedTrack].velocityBuckets =
                        Number(value)
                      return settings
                    })
                  }
                  min={1}
                  max={10}
                />
              </p>
              <p>
                Note volumes:{' '}
                {(() => {
                  return centroids
                    .map((n, i) => [n, clusters[i].length])
                    .toSorted(([a], [b]) => a - b)
                    .map(
                      ([centroid, clusterLength]) =>
                        `${centroid.toFixed(2)} (${clusterLength})`,
                    )
                    .join(', ')
                })()}
              </p>

              <Histogram
                data={Object.entries(
                  midi.tracks[selectedTrack].notes.reduce(
                    (acc, note) => {
                      const roundedVelocity = note.velocity
                      acc[roundedVelocity] = (acc[roundedVelocity] || 0) + 1
                      return acc
                    },
                    {} as Record<string, number>,
                  ),
                ).toSorted(([a], [b]) => Number(a) - Number(b))}
                clusterCenters={centroids}
                width={400}
                height={300}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
