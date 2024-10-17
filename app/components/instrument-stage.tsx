import { PianoRoll } from '@/app/components/piano-roll'
import React, { Dispatch, useEffect, useRef, useState } from 'react'
import { Settings, Song } from '@/app/components/select-stage'
import {
  getFactorioInstrument,
  getFactorioInstrumentList,
} from '@/app/lib/factorio-instrument'
import { autoCluster, kMeansClustering } from '@/app/lib/kmeans'
import { Histogram } from '@/app/components/histogram'
import { Note } from '@tonejs/midi/dist/Note'
import { noteToGmPercussion } from '@/app/lib/data/gm-percussion-note-names'
import { FactorioInstrumentName } from '@/app/lib/data/factorio-instruments-by-id'

export const getVelocityValues = (
  notes: Note[],
  targetNumberOfClusters?: number,
): number[] => {
  const data = notes.map(({ velocity }) => velocity)

  if (!targetNumberOfClusters) {
    // Auto clustering tries to cluster the values into a "nice" number of clusters.
    // To do this, it tries every cluster number until the mean difference improvement
    //  is less than the threshold. Then groups that are too close together are merged.
    // The resulting number of groups is the target number for a final k-means clustering.
    return autoCluster({
      data,
      meanDeviationDecreaseThreshold: 0.01,
      minimumGroupCenterDistance: 1 / 14,
      maxK: 16,
    }).centers.toSorted()
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
                    getFactorioInstrument(
                      settings.tracks[selectedTrack].factorioInstrument,
                    )?.name
                  }
                  onChange={({ currentTarget: { value } }) =>
                    onSettingsChanged((settings) => {
                      settings.tracks[selectedTrack].factorioInstrument =
                        value as FactorioInstrumentName

                      return settings
                    })
                  }
                >
                  {Object.keys(getFactorioInstrumentList()).map(
                    (instrument) => (
                      <option key={instrument} value={instrument}>
                        {instrument}
                      </option>
                    ),
                  )}
                  <option key="none" value={undefined}>
                    [Mute]
                  </option>
                </select>
                Instrument range from{' '}
                {
                  getFactorioInstrument(
                    settings.tracks[selectedTrack].factorioInstrument,
                  )?.lowestNote
                }{' '}
                to{' '}
                {
                  getFactorioInstrument(
                    settings.tracks[selectedTrack].factorioInstrument,
                  )?.highestNote
                }
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
              {midi.tracks[selectedTrack].instrument.percussion && (
                <div>
                  <h3>Drum sounds</h3>
                  {Object.entries(
                    midi.tracks[selectedTrack].notes.reduce(
                      (acc, note) => ({
                        ...acc,
                        [note.midi]: (acc[note.midi] || 0) + 1,
                      }),
                      {} as Record<string, number>,
                    ),
                  )
                    .toSorted(
                      ([_a, frequency], [_b, otherFrequency]) =>
                        otherFrequency - frequency,
                    )
                    .map(([note, frequency]) => (
                      <p key={note}>
                        {frequency} - {noteToGmPercussion[note as never]}
                      </p>
                    ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
