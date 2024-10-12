import { PianoRoll } from '@/app/components/piano-roll'
import React, { Dispatch, useEffect, useRef, useState } from 'react'
import { Settings, Song } from '@/app/components/select-stage'
import { FACTORIO_INSTRUMENT } from '@/app/lib/factorio-instrument'
import { autoCluster, kMeansClustering } from '@/app/lib/kmeans'
import { Histogram } from '@/app/components/histogram'
import { Note } from '@tonejs/midi/dist/Note'

export const getVelocityValues = (
  notes: Note[],
  targetNumberOfClusters?: number,
): number[] => {
  const data = notes.map(({ velocity }) => velocity)

  if (!targetNumberOfClusters) {
    // TODO comment
    // Auto clustering stops adding new clusters when the mean difference improvement
    // is less than the threshold. This is set dependent of the total number of notes,
    // so that more important instruments get more love. The actual values are guesses.
    // Examples: 1000+ notes -> 1/32; 100 notes ~> 1/4
    // const autoClusterThreshold = 0.05

    const clusters = autoCluster({
      data,
      meanDeviationThreshold: 0.005,
      meanDeviationDecreaseThreshold: 0.01,
      maxK: 16,
    }).centers.toSorted()

    return clusters
  }

  return kMeansClustering(data, targetNumberOfClusters).centers.toSorted()
}

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
    additionalInfo: { noteExtremes, trackExtremes },
    settings,
  } = song

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
            <div className="panel-inset">
              <div className="flex items-baseline gap-4">
                <h3>{midi.tracks[selectedTrack].name}</h3>
                <p className="smaller">
                  {midi.tracks[selectedTrack].notes.length} notes from{' '}
                  {trackExtremes[selectedTrack].min} to{' '}
                  {trackExtremes[selectedTrack].max}
                </p>
              </div>
              <p>
                Factorio Instrument
                <select
                  className="mx-4 text-black"
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
                Instrument range from{' '}
                {settings.tracks[selectedTrack].factorioInstrument?.lowestNote}{' '}
                to{' '}
                {settings.tracks[selectedTrack].factorioInstrument?.highestNote}
              </p>
              <p>
                Note volumes
                <input
                  type="number"
                  className="ml-4"
                  value={settings.tracks[selectedTrack].velocityValues.length}
                  onInput={({ currentTarget: { value } }) =>
                    onSettingsChanged((settings) => {
                      settings.tracks[selectedTrack].velocityValues =
                        getVelocityValues(
                          midi.tracks[selectedTrack].notes,
                          Number(value),
                        )

                      return settings
                    })
                  }
                  min={1}
                  max={16}
                />
              </p>

              <div className="panel-inset !bg-[#0E0E0E] w-[400px] box-content">
                <Histogram
                  data={Object.entries(
                    midi.tracks[selectedTrack].notes.reduce(
                      (acc, note) => {
                        acc[note.velocity] = (acc[note.velocity] || 0) + 1
                        return acc
                      },
                      {} as Record<string, number>,
                    ),
                  ).toSorted(([a], [b]) => Number(a) - Number(b))}
                  clusterCenters={settings.tracks[selectedTrack].velocityValues}
                  width={400}
                  height={150}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
