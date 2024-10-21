import { PianoRoll, PixiProvider } from '@/app/components/piano-roll'
import React, { Dispatch, useEffect, useMemo, useRef, useState } from 'react'
import { Settings } from '@/app/components/select-stage'
import {
  getFactorioInstrument,
  getFactorioInstrumentList,
} from '@/app/lib/factorio-instrument'
import { autoCluster, kMeansClustering } from '@/app/lib/kmeans'
import { Histogram } from '@/app/components/histogram'
import { Note } from '@tonejs/midi/dist/Note'
import { noteToGmPercussion } from '@/app/lib/data/gm-percussion-note-names'
import { FactorioInstrumentName } from '@/app/lib/data/factorio-instruments-by-id'
import {
  FactorioDrumSound,
  factorioDrumSoundToNoteNumber,
  signalToFactorioDrumSound,
} from '@/app/lib/data/factorio-drumkit-sounds-by-id'
import { MidiNote } from 'tone/build/esm/core/type/NoteUnits'
import { getOutOfRangeNotes, noteExtremesToString, Song } from '@/app/lib/song'
import {
  NumberDecrementStepper,
  NumberIncrementStepper,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
} from '@chakra-ui/react'

const NONE = 'None'

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
    return autoCluster({ data }).centers.toSorted()
  }

  return kMeansClustering(data, targetNumberOfClusters).centers.toSorted()
}

export type InstrumentStageProps = {
  song: Song
  onBack: Dispatch<void>
  onContinue: Dispatch<void>
  onSettingsChanged: Dispatch<Settings>
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
    additionalInfo: {
      noteExtremes,
      trackExtremes,
      totalNotes,
      trackNoteDistribution,
    },
    settings,
  } = song

  useEffect(() => {
    panel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const outOfRangeNotes: { higher: number; lower: number }[] = useMemo(
    () =>
      midi.tracks.map((_, trackNumber) =>
        getOutOfRangeNotes(
          trackNoteDistribution[trackNumber],
          settings.tracks[trackNumber],
          settings,
        ),
      ),
    [midi.tracks, settings, trackNoteDistribution],
  )

  return (
    <div
      className={`panel pt0 flex-column w-full !mb-16 ${className}`}
      ref={panel}
    >
      <div className="panel-inset !pl-0 !bg-[#0E0E0E]">
        <PixiProvider>
          <PianoRoll
            midi={midi}
            noteExtremes={noteExtremes}
            settings={settings}
            selectedTrack={selectedTrack}
          />
        </PixiProvider>
      </div>

      {/* Title */}
      <div className="flex justify-between items-center gap-3 w-full flex-col sm:flex-row">
        <button
          className="button !text-center !min-w-fit"
          onClick={() => onBack()}
        >
          Choose another
        </button>
        <div className="flex flex-col text-center">
          <h1 className="text-ellipsis line-clamp-1 m0">{midi.name}</h1>
          <div className="flex flex-grow gap-1 justify-center flex-wrap">
            <h5 className="normal-weight text-sm line-clamp-1">
              {Math.floor(midi.duration / 60)}:
              {String(Math.floor(midi.duration % 60)).padStart(2, '0')} seconds;
            </h5>
            <h5 className="normal-weight text-sm line-clamp-1">
              {totalNotes} notes
            </h5>
          </div>
        </div>
        <button
          className="button-green-right !mr-3 !text-center"
          onClick={() => {
            if (
              selectedTrack === undefined ||
              selectedTrack < midi.tracks.length - 1
            )
              setSelectedTrack((track) => (track !== undefined ? track + 1 : 0))
            else onContinue()
          }}
        >
          Continue
        </button>
      </div>

      {/* Main section */}
      <div className="flex flex-col sm:flex-row gap-x-3 w-full min-h-[40dvh]">
        {/* Tracks */}
        <div className="panel-inset-lighter flex-column gap-2 flex-start flex-1 min-w-32 max-w-fit basis-1/5 ">
          <div
            key="all"
            className={`mr0 max-w-full !min-w-0 text-ellipsis overflow-hidden ${selectedTrack === undefined ? 'button-green' : 'button'}`}
            onClick={() => setSelectedTrack(undefined)}
          >
            Overview
          </div>
          <hr className="m-0" />
          <h2>MIDI Tracks</h2>
          {midi.tracks.map((track, trackNumber) => (
            <button
              key={trackNumber}
              className={`mr0 max-w-full !min-w-0 !flex flex-row justify-between !py-0 items-center ${selectedTrack === trackNumber ? 'button-green' : 'button'}`}
              onClick={() => setSelectedTrack(trackNumber)}
            >
              <span className="text-ellipsis overflow-hidden h-full content-center">
                {track.name}
              </span>
              {(() => {
                const { higher, lower } = outOfRangeNotes[trackNumber]
                return higher || lower ? (
                  <span>
                    <span className="relative -top-[0.5px]">⚠️</span>
                    <span>
                      {higher ? '↥' : ''}
                      {lower ? '↧' : ''}
                    </span>
                  </span>
                ) : (
                  ''
                )
              })()}
            </button>
          ))}
        </div>
        {/* Track settings */}
        <div className="flex-1 basis-4/5 panel-inset">
          {selectedTrack === undefined ? (
            <>
              <h2>Conversion settings – overview</h2>
              <p>
                Check each track and decide which Factorio instrument it will be
                assigned to.
              </p>
              <p>
                Keep in mind that each Factorio instrument has a range of
                limited notes. To solve this you can assign multiple instruments
                to the same track, or you can shift the notes up or down to
                better match the instrument range.
              </p>
              <h3>Global settings</h3>
              <p>
                These settings will apply to all tracks in addition to the track
                specific settings.
              </p>
              <h4>Shift all notes by</h4>
              <p>
                <NumberInput size="lg" maxW={32} defaultValue={15} min={10}>
                  <NumberInputField />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
                <input
                  type="number"
                  className="mr-4"
                  value={settings.globalNoteShift}
                  onInput={({ currentTarget: { value } }) => {
                    settings.globalNoteShift = Number(value)
                    onSettingsChanged(settings)
                  }}
                  min={-16}
                  max={16}
                />
                semitones
              </p>
              {(() => {
                const { higher, lower } = outOfRangeNotes.reduce(
                  (previousValue, { higher, lower }) => ({
                    higher: previousValue.higher + higher,
                    lower: previousValue.lower + lower,
                  }),
                )

                return higher || lower ? (
                  <div className="panel alert-warning w-fit">
                    {(['higher', 'lower'] as const) // TODO deduplicate
                      .flatMap((higherOrLower) => {
                        const n = { higher, lower }[higherOrLower]
                        return n
                          ? [
                              `${higherOrLower === 'higher' ? '↥' : '↧'} ${n} notes are ${higherOrLower}`,
                            ]
                          : []
                      })
                      .map((str, i, array) => (
                        <>
                          {str}
                          {i === 0 && array.length === 2 && (
                            <>
                              ,<br />
                            </>
                          )}
                        </>
                      ))}{' '}
                    than what their respective instruments can play.
                  </div>
                ) : (
                  <p>All notes are within range for all instruments 🗸</p>
                )
              })()}
              <h3>Playback speed</h3>
              <p>This allows playback on different game speeds.</p>
              {/*<p> TODO */}
              {/*  BPM:{' '}*/}
              {/*  {song.midi.header.tempos*/}
              {/*    .map((tempo) => tempo.bpm.toFixed(0))*/}
              {/*    .join(', ')}*/}
              {/*</p>*/}
              <p>
                <input
                  type="number"
                  className="mr-4"
                  value={settings.speedMultiplier}
                  onInput={({ currentTarget: { value } }) => {
                    settings.speedMultiplier = Number(value)
                    onSettingsChanged(settings)
                  }}
                  min={0.01}
                  max={4}
                  step={0.1}
                />
                x
              </p>
            </>
          ) : (
            /* Track settings */
            (() => {
              const track = midi.tracks[selectedTrack]
              const trackSettings = settings.tracks[selectedTrack]
              const trackInstruments = trackSettings.factorioInstruments.map(
                getFactorioInstrument,
              )

              return (
                <>
                  <div className="flex items-baseline gap-4">
                    <h2>{track.name}</h2>
                    <p className="smaller">
                      {track.notes.length} notes
                      {!track.instrument.percussion && (
                        <span>
                          {' '}
                          {noteExtremesToString(trackExtremes[selectedTrack])}
                        </span>
                      )}
                    </p>
                  </div>
                  {!track.instrument.percussion && (
                    <>
                      <h4>Shift notes of this track by</h4>
                      <p>
                        <input
                          type="number"
                          className="mr-4"
                          value={trackSettings.octaveShift}
                          onInput={({ currentTarget: { value } }) => {
                            trackSettings.octaveShift = Number(value)
                            onSettingsChanged(settings)
                          }}
                          min={-16}
                          max={16}
                        />
                        octaves
                      </p>
                      <p>
                        {(trackSettings.octaveShift !== 0 ||
                          settings.globalNoteShift !== 0) &&
                          `New range: ` +
                            noteExtremesToString({
                              min:
                                trackExtremes[selectedTrack].min +
                                trackSettings.octaveShift * 12 +
                                settings.globalNoteShift,
                              max:
                                trackExtremes[selectedTrack].max +
                                trackSettings.octaveShift * 12 +
                                settings.globalNoteShift,
                            })}
                      </p>
                      <h4>Assign to Programmable Speaker instruments</h4>
                      <p>
                        Each note will be assigned to the first instrument that
                        can play it.
                      </p>
                      {trackInstruments.map(
                        (trackInstrument, instrumentNumber) => (
                          <p key={instrumentNumber}>
                            Instrument #{instrumentNumber + 1}
                            <select
                              className="mx-4 text-black min-w-56"
                              value={trackInstrument?.name || NONE}
                              onChange={({ currentTarget: { value } }) => {
                                if (value === NONE) {
                                  trackSettings.factorioInstruments =
                                    trackSettings.factorioInstruments.slice(
                                      0,
                                      instrumentNumber,
                                    )

                                  if (
                                    trackSettings.factorioInstruments.length ===
                                    0
                                  )
                                    trackSettings.factorioInstruments = [
                                      undefined,
                                    ]
                                } else {
                                  trackSettings.factorioInstruments[
                                    instrumentNumber
                                  ] = value as FactorioInstrumentName
                                }

                                onSettingsChanged(settings)
                              }}
                            >
                              {(
                                Object.keys(
                                  getFactorioInstrumentList(),
                                ) as FactorioInstrumentName[]
                              )
                                .filter((instrumentName) => {
                                  if (instrumentName === trackInstrument?.name)
                                    return true

                                  return ![
                                    'Drumkit',
                                    ...trackSettings.factorioInstruments,
                                  ].includes(instrumentName)
                                })
                                .map((instrument) => (
                                  <option key={instrument} value={instrument}>
                                    [
                                    {noteExtremesToString(
                                      getFactorioInstrument(instrument)
                                        ?.noteExtremes,
                                    )}
                                    ] {instrument}
                                  </option>
                                ))}
                              <option key={NONE} value={NONE}>
                                {NONE}
                              </option>
                            </select>
                          </p>
                        ),
                      )}

                      {(() => {
                        const { higher, lower } = outOfRangeNotes[selectedTrack]

                        return higher || lower ? (
                          <>
                            <p>
                              <button
                                className="button !h-auto"
                                onClick={() => {
                                  settings.tracks[
                                    selectedTrack
                                  ].factorioInstruments = [
                                    ...settings.tracks[selectedTrack]
                                      .factorioInstruments,
                                    undefined,
                                  ]
                                  onSettingsChanged(settings)
                                }}
                              >
                                Add instrument
                              </button>
                            </p>
                            <div className="panel alert-warning w-fit">
                              {(['higher', 'lower'] as const)
                                .flatMap((higherOrLower) => {
                                  const n = { higher, lower }[higherOrLower]
                                  return n
                                    ? [
                                        `${higherOrLower === 'higher' ? '↥' : '↧'} ${n} notes are ${higherOrLower}`,
                                      ]
                                    : []
                                })
                                .map((str, i, array) => (
                                  <>
                                    {str}
                                    {i === 0 && array.length === 2 && (
                                      <>
                                        ,<br />
                                      </>
                                    )}
                                  </>
                                ))}{' '}
                              than what the selected instrument
                              {trackInstruments.length === 1 ? '' : 's'} can
                              play.
                            </div>
                          </>
                        ) : (
                          <p>All notes are within range 🗸</p>
                        )
                      })()}
                    </>
                  )}
                  <h4>Configure dynamics</h4>
                  <div className="flex flex-col lg:flex-row gap-3">
                    <div className="text-justify my-3 flex-column">
                      <p>
                        The histogram shows the distribution of note velocities.
                        You can select how many velocity groups you would like
                        to round velocity values to.
                      </p>
                      <p>
                        Each Programmable Speaker is only able to play notes
                        from a single velocity group, so the more groups you add
                        the more Speakers will be included in the final
                        blueprint.
                      </p>
                      <p className="w-fit self-end">
                        Note velocity groups
                        <input
                          type="number"
                          className="ml-4"
                          value={trackSettings.velocityValues.length}
                          onInput={({ currentTarget: { value } }) => {
                            trackSettings.velocityValues = getVelocityValues(
                              track.notes,
                              Number(value),
                            )
                            onSettingsChanged(settings)
                          }}
                          min={1}
                          max={16}
                        />
                      </p>
                    </div>

                    <div className="panel-inset !bg-[#0E0E0E] min-w-[400px] box-content flex-column self-center">
                      <div className="flex flex-space-between text-gray-500">
                        <span>quiet</span>
                        <span>loud</span>
                      </div>
                      <Histogram
                        data={Object.entries(
                          track.notes.reduce(
                            (acc, note) => {
                              acc[note.velocity] = (acc[note.velocity] || 0) + 1
                              return acc
                            },
                            {} as Record<string, number>,
                          ),
                        ).toSorted(([a], [b]) => Number(a) - Number(b))}
                        clusterCenters={trackSettings.velocityValues}
                        width={400}
                        height={150}
                      />
                    </div>
                  </div>
                  {track.instrument.percussion && (
                    <div>
                      <h4>Assign Drumkit sounds</h4>
                      <div className="grid grid-cols-[max-content_max-content_1fr] w-fit gap-y-1 gap-x-3 items-center">
                        {Object.entries(
                          track.notes.reduce(
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
                          .map(([note, numberOfOccurrences]) => (
                            <>
                              <div key={`${note} name`}>
                                {noteToGmPercussion[
                                  note as keyof typeof noteToGmPercussion
                                ] || `MIDI note #${note}`}
                              </div>
                              <div key={`${note} number-of-occurrences`}>
                                {numberOfOccurrences}{' '}
                                {numberOfOccurrences === 1 ? 'note' : 'notes'}
                              </div>
                              <div key={`${note} select`}>
                                <select
                                  className="mx-4 text-black"
                                  value={(() => {
                                    const factorioNote =
                                      // Special case for drums, should be exactly 1 instrument
                                      trackInstruments[0]?.noteToFactorioNote(
                                        Number(note) as MidiNote,
                                        trackSettings,
                                        settings,
                                      ).factorioNote

                                    return factorioNote
                                      ? signalToFactorioDrumSound[
                                          factorioNote.toString() as keyof typeof signalToFactorioDrumSound
                                        ]
                                      : NONE
                                  })()}
                                  onChange={({ currentTarget: { value } }) => {
                                    if (!trackSettings.drumMapOverrides)
                                      trackSettings.drumMapOverrides = {}

                                    trackSettings.drumMapOverrides[note] =
                                      value === NONE
                                        ? undefined
                                        : (value as FactorioDrumSound)

                                    onSettingsChanged(settings)
                                  }}
                                >
                                  {Object.entries(
                                    factorioDrumSoundToNoteNumber,
                                  ).map(([drumSound, factorioNote]) => (
                                    <option
                                      key={factorioNote}
                                      value={drumSound}
                                    >
                                      {drumSound}
                                    </option>
                                  ))}
                                  <option key={NONE} value={NONE}>
                                    {NONE}
                                  </option>
                                </select>
                              </div>
                            </>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )
            })()
          )}
        </div>
      </div>
    </div>
  )
}
