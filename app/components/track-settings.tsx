import React, { Dispatch, Fragment } from 'react'
import { Settings } from './select-stage'
import { Track } from '@tonejs/midi/dist/Track'
import {
  getFactorioInstrument,
  getFactorioInstrumentList,
} from '../lib/factorio-instrument'
import { noteToGmPercussion } from '../lib/data/gm-percussion-note-names'
import { FactorioInstrumentName } from '../lib/data/factorio-instruments-by-id'
import {
  FactorioDrumSound,
  factorioDrumSoundToNoteNumber,
  signalToFactorioDrumSound,
} from '../lib/data/factorio-drumkit-sounds-by-id'
import { MidiNote } from 'tone/build/esm/core/type/NoteUnits'
import { noteExtremesToString } from '../lib/song'
import { NumberInputWithLabel } from './number-input-with-label'
import { Histogram } from './histogram'
import { getVelocityValues } from './instrument-stage'
import { OutOfRangeWarning } from '@/app/components/out-of-range-warning'
import { assignInstruments } from '../lib/instrument-assignment'

const NONE = 'None'

type TrackSettingsProps = {
  track: Track
  selectedTrack: number
  trackSettings: Settings['tracks'][number]
  trackExtremes: { min: number; max: number }
  settings: Settings
  outOfRangeNotes: { higher: number; lower: number }
  onSettingsChanged: Dispatch<Settings>
}

export const TrackSettings = ({
  track,
  selectedTrack,
  trackSettings,
  trackExtremes,
  settings,
  outOfRangeNotes,
  onSettingsChanged,
}: TrackSettingsProps) => {
  const trackInstruments = trackSettings.factorioInstruments.map(
    getFactorioInstrument,
  )

  const autoAssignInstruments = () => {
    settings.tracks[selectedTrack].factorioInstruments = assignInstruments(
      track,
      trackSettings,
      settings,
    )
    onSettingsChanged(settings)
  }

  const wouldAutoAssignmentChange = () => {
    const autoAssignedInstruments = assignInstruments(
      track,
      trackSettings,
      settings,
    )

    // If lengths are different, there would be a change
    if (
      autoAssignedInstruments.length !==
      trackSettings.factorioInstruments.length
    ) {
      return true
    }

    // Check if any instruments are different
    return autoAssignedInstruments.some(
      (instrument, index) =>
        instrument !== trackSettings.factorioInstruments[index],
    )
  }

  return (
    <>
      <div className="flex items-baseline gap-4">
        <h2>{track.name}</h2>
        <p className="smaller">
          {track.notes.length} notes
          {!track.instrument.percussion && (
            <span> {noteExtremesToString(trackExtremes)}</span>
          )}
        </p>
      </div>
      {!track.instrument.percussion && (
        <>
          <h4>Shift notes of this track by</h4>
          <div className="flex items-center gap-8 my-3 items-baseline">
            <NumberInputWithLabel
              value={trackSettings.octaveShift}
              onChange={(value) => {
                trackSettings.octaveShift = Number(value)
                onSettingsChanged(settings)
              }}
              width={16}
              min={-16}
              max={16}
              labelAfter="octaves"
              className="m0"
            />
            <p className="text-sm opacity-75">
              {(trackSettings.octaveShift !== 0 ||
                settings.globalNoteShift !== 0) &&
                `New range: ` +
                  noteExtremesToString({
                    min:
                      trackExtremes.min +
                      trackSettings.octaveShift * 12 +
                      settings.globalNoteShift,
                    max:
                      trackExtremes.max +
                      trackSettings.octaveShift * 12 +
                      settings.globalNoteShift,
                  })}
            </p>
          </div>
          <h4>Assign to programmable speaker instruments</h4>
          <p className="mb-4">
            Each note will be played by the first instrument that can play it
            from the following list.
          </p>
          {trackInstruments.map((trackInstrument, instrumentNumber) => {
            // Calculate how many notes this instrument can play
            const notesPlayedByThisInstrument = track.notes.filter((note) => {
              // Check all previous instruments first
              for (let i = 0; i < instrumentNumber; i++) {
                const previousInstrument = trackInstruments[i]
                if (!previousInstrument) continue

                const result = previousInstrument.noteToFactorioNote(
                  note.midi as MidiNote,
                  trackSettings,
                  settings,
                )

                // If a previous instrument can play it, this note won't be played by current instrument
                if (result.valid) return false
              }

              // Check if current instrument can play it
              if (!trackInstrument) return false
              return trackInstrument.noteToFactorioNote(
                note.midi as MidiNote,
                trackSettings,
                settings,
              ).valid
            }).length

            const coveragePercentage = Math.round(
              (notesPlayedByThisInstrument / track.notes.length) * 100,
            )

            return (
              <p key={instrumentNumber} className="flex items-center gap-1">
                <button
                  className="text-gray-400 hover:text-white p-2"
                  onClick={() => {
                    trackSettings.factorioInstruments = [
                      ...trackSettings.factorioInstruments.slice(
                        0,
                        instrumentNumber,
                      ),
                      ...trackSettings.factorioInstruments.slice(
                        instrumentNumber + 1,
                      ),
                    ]

                    if (trackSettings.factorioInstruments.length === 0) {
                      trackSettings.factorioInstruments = [undefined]
                    }

                    onSettingsChanged(settings)
                  }}
                >
                  ✕
                </button>
                <select
                  className="text-black min-w-56 mr-2"
                  value={trackInstrument?.name || NONE}
                  onChange={({ currentTarget: { value } }) => {
                    if (value === NONE) {
                      trackSettings.factorioInstruments =
                        trackSettings.factorioInstruments.slice(
                          0,
                          instrumentNumber,
                        )

                      if (trackSettings.factorioInstruments.length === 0)
                        trackSettings.factorioInstruments = [undefined]
                    } else {
                      trackSettings.factorioInstruments[instrumentNumber] =
                        value as FactorioInstrumentName
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
                      if (instrumentName === trackInstrument?.name) return true

                      return ![
                        'Drumkit',
                        ...trackSettings.factorioInstruments,
                      ].includes(instrumentName)
                    })
                    .map((instrument) => (
                      <option key={instrument} value={instrument}>
                        [
                        {noteExtremesToString(
                          getFactorioInstrument(instrument)?.noteExtremes,
                        )}
                        ] {instrument}
                      </option>
                    ))}
                  <option key={NONE} value={NONE}>
                    Mute
                  </option>
                </select>

                {trackInstrument && notesPlayedByThisInstrument > 0 && (
                  <span className="text-sm opacity-75">
                    {notesPlayedByThisInstrument} notes ({coveragePercentage}%)
                  </span>
                )}
              </p>
            )
          })}

          {!(
            trackInstruments.length === 1 && trackInstruments[0] === undefined
          ) && (
            <>
              <div className="flex mt-3">
                {outOfRangeNotes.higher || outOfRangeNotes.lower ? (
                  <button
                    className="button m0"
                    onClick={() => {
                      settings.tracks[selectedTrack].factorioInstruments = [
                        ...settings.tracks[selectedTrack].factorioInstruments,
                        undefined,
                      ]
                      onSettingsChanged(settings)
                    }}
                  >
                    Add instrument
                  </button>
                ) : (
                  ''
                )}

                {wouldAutoAssignmentChange() && (
                  <button className="button m0" onClick={autoAssignInstruments}>
                    Auto-assign best instruments
                  </button>
                )}
              </div>

              {outOfRangeNotes.higher || outOfRangeNotes.lower ? (
                <OutOfRangeWarning
                  outOfRangeNotes={outOfRangeNotes}
                  instrumentText={`the selected instrument${trackInstruments.length === 1 ? '' : 's'}`}
                />
              ) : (
                <p>All notes are within range 🗸</p>
              )}
            </>
          )}
        </>
      )}
      <h4>Configure dynamics</h4>
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="text-justify my-3 flex-column">
          <p>
            The histogram shows the distribution of note velocities. You can
            select how many velocity groups you would like to round velocity
            values to.
          </p>
          <p>
            Each programmable speaker is only able to play notes from a single
            velocity group, so the more groups you add the more Speakers will be
            included in the final blueprint.
          </p>
          <NumberInputWithLabel
            labelBefore="Note velocity groups"
            className="w-fit self-end"
            value={trackSettings.velocityValues.length}
            onChange={(value) => {
              trackSettings.velocityValues = getVelocityValues(
                track.notes,
                Number(value),
              )
              onSettingsChanged(settings)
            }}
            width={16}
            min={1}
            max={32}
          />
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
          <div className="mt-4 mb-2">
            <button
              onClick={() => {
                trackSettings.drumMapOverrides = {}
                onSettingsChanged(settings)
              }}
              className="button"
            >
              Reset to defaults
            </button>
          </div>
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
              .map(([note, numberOfOccurrences], i) => (
                <Fragment key={i}>
                  <div key={`${note} name`}>
                    {noteToGmPercussion[
                      note as keyof typeof noteToGmPercussion
                    ] || `MIDI note #${note}`}
                  </div>
                  <div key={`${note} select`}>
                    <select
                      className="mx-4 text-black"
                      value={(() => {
                        const factorioNote =
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
                      {Object.entries(factorioDrumSoundToNoteNumber).map(
                        ([drumSound, factorioNote]) => (
                          <option key={factorioNote} value={drumSound}>
                            {drumSound}
                          </option>
                        ),
                      )}
                      <option key={NONE} value={NONE}>
                        Mute
                      </option>
                    </select>
                  </div>
                  <p
                    key={`${note} number-of-occurrences`}
                    className="text-sm opacity-75"
                  >
                    {numberOfOccurrences}{' '}
                    {numberOfOccurrences === 1 ? 'note' : 'notes'}
                  </p>
                </Fragment>
              ))}
          </div>
        </div>
      )}
    </>
  )
}
