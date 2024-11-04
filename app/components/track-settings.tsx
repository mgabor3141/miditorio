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
          />
          <p>
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
          <h4>Assign to Programmable Speaker instruments</h4>
          <p>
            Each note will be assigned to the first instrument that can play it.
          </p>
          {trackInstruments.map((trackInstrument, instrumentNumber) => (
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
            </p>
          ))}

          {!(trackInstruments.length === 1 && trackInstruments[0] === undefined) && (
            <>
              {outOfRangeNotes.higher || outOfRangeNotes.lower ? (
                <>
                  <p>
                    <button
                      className="button !h-auto"
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
                  </p>
                  <OutOfRangeWarning 
                    outOfRangeNotes={outOfRangeNotes}
                    instrumentText={`the selected instrument${trackInstruments.length === 1 ? '' : 's'}`}
                  />
                </>
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
            Each Programmable Speaker is only able to play notes from a single
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
                  <div key={`${note} number-of-occurrences`}>
                    {numberOfOccurrences}{' '}
                    {numberOfOccurrences === 1 ? 'note' : 'notes'}
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
                </Fragment>
              ))}
          </div>
        </div>
      )}
    </>
  )
}
