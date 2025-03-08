import { PianoRoll, PixiProvider } from '@/app/components/piano-roll'
import React, { Dispatch, useCallback, useMemo, useRef, useState } from 'react'
import { Settings } from '@/app/components/select-stage'
import { getOutOfRangeNotes, Song } from '@/app/lib/song'
import { NumberInputWithLabel } from '@/app/components/number-input-with-label'
import { TrackSettings } from './track-settings'
import { OutOfRangeWarning } from '@/app/components/out-of-range-warning'
import { ResultStage } from '@/app/components/result-stage'

export type InstrumentStageProps = {
  song: Song
  onBack: Dispatch<void>
  onSettingsChanged: Dispatch<Settings>
  className?: string
}
export const InstrumentStage = ({
  song,
  onBack,
  className,
  onSettingsChanged,
}: InstrumentStageProps) => {
  const panel = useRef<HTMLDivElement>(null)
  const [selectedTrack, setSelectedTrack] = useState<number | undefined>(
    undefined,
  )
  const { midi, additionalInfo, settings } = song

  const { trackExtremes, totalNotes, trackNoteDistribution } = additionalInfo

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

  const onDoneRender = useCallback(() => {
    if (!panel.current) return
    window.scrollTo({
      top: window.scrollY + panel.current.getBoundingClientRect().top - 16,
      behavior: 'smooth',
    })
  }, [])

  return (
    <div className={`panel pt0 !mt-8 !mb-24 ${className}`} ref={panel}>
      <div className="panel-inset !pl-0 !bg-[#0E0E0E]">
        <PixiProvider>
          <PianoRoll
            midi={midi}
            additionalInfo={additionalInfo}
            settings={settings}
            selectedTrack={
              selectedTrack === midi.tracks.length ? undefined : selectedTrack
            }
            onDoneRender={onDoneRender}
          />
        </PixiProvider>
      </div>

      {/* Title */}
      <div className="flex justify-between items-center gap-3 w-full flex-col sm:flex-row">
        <button
          className="button !text-center !min-w-[140px]"
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
          className={`button-green-right !mr-3 !min-w-[140px] !text-center ${selectedTrack === midi.tracks.length ? 'invisible' : ''}`}
          onClick={() =>
            setSelectedTrack((track) => (track !== undefined ? track + 1 : 0))
          }
          aria-hidden={selectedTrack === midi.tracks.length}
          tabIndex={selectedTrack === midi.tracks.length ? -1 : undefined}
        >
          {selectedTrack === undefined
            ? 'Continue'
            : selectedTrack === midi.tracks.length - 1
              ? 'Export blueprint'
              : 'Next track'}
        </button>
      </div>

      {/* Main section */}
      <div className="flex flex-col sm:flex-row gap-x-3 w-full min-h-[40dvh]">
        {/* Sidebar */}
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
          <hr className="m-0" />
          <div
            key="results"
            className={`mr0 max-w-full !min-w-0 text-ellipsis overflow-hidden ${selectedTrack === midi.tracks.length ? 'button-green' : 'button'}`}
            onClick={() => setSelectedTrack(midi.tracks.length)}
          >
            Blueprint
          </div>
        </div>
        {/* Track settings */}
        <div className="flex-1 basis-4/5 panel-inset">
          {selectedTrack === undefined ? (
            <>
              <h2>Conversion settings – Overview</h2>
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
              <NumberInputWithLabel
                value={settings.globalNoteShift}
                onChange={(value) => {
                  settings.globalNoteShift = Number(value)
                  onSettingsChanged(settings)
                }}
                clampValueOnBlur={false}
                width={16}
                min={-128}
                max={128}
                labelAfter="semitones"
              />
              {(() => {
                const summedOutOfRangeNotes = outOfRangeNotes.reduce(
                  (previousValue, { higher, lower }) => ({
                    higher: previousValue.higher + higher,
                    lower: previousValue.lower + lower,
                  }),
                )

                return (
                  <OutOfRangeWarning outOfRangeNotes={summedOutOfRangeNotes} />
                )
              })()}
              <h3>Playback speed</h3>
              <p>This allows playback on different game speeds.</p>
              <NumberInputWithLabel
                value={settings.speedMultiplier}
                onChange={(value) => {
                  settings.speedMultiplier = Number(value)
                  onSettingsChanged(settings)
                }}
                width={16}
                min={0.001}
                step={0.1}
                max={100}
                labelAfter="times normal speed"
              />
              <p>
                Song BPM:{' '}
                {(() => {
                  const printBpm = (bpm: number, multiply = 1) =>
                    Number(bpm * multiply).toFixed()

                  const printBpmRange = (bpm: number[], multiply = 1) => {
                    if (bpm.length === 1) {
                      return printBpm(bpm[0], multiply)
                    } else {
                      const minBpm = bpm.reduce((a, b) => Math.min(a, b))
                      const maxBpm = bpm.reduce((a, b) => Math.max(a, b))

                      return `${printBpm(minBpm)}-${printBpm(maxBpm)}`
                    }
                  }

                  const bpm = song.midi.header.tempos.map(({ bpm }) => bpm)

                  if (bpm.length === 0) return 'unknown'

                  return `${printBpmRange(bpm)}${settings.speedMultiplier !== 1 ? ` => ${printBpmRange(bpm, settings.speedMultiplier)}` : ''}`
                })()}
              </p>
            </>
          ) : selectedTrack === midi.tracks.length ? (
            <ResultStage song={song} />
          ) : (
            /* Track settings */
            <TrackSettings
              track={midi.tracks[selectedTrack]}
              selectedTrack={selectedTrack}
              trackSettings={settings.tracks[selectedTrack]}
              trackExtremes={trackExtremes[selectedTrack]}
              settings={settings}
              outOfRangeNotes={outOfRangeNotes[selectedTrack]}
              onSettingsChanged={onSettingsChanged}
            />
          )}
        </div>
      </div>
    </div>
  )
}
