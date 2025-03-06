import { useCallback, useState } from 'react'
import { songToFactorio } from '@/app/lib/song-to-factorio'
import signals from '@/app/lib/data/signals.json'
import signalsDlc from '@/app/lib/data/signals-dlc.json'
import { usePostHog } from 'posthog-js/react'
import { Song } from '@/app/lib/song'
import { PlaybackMode } from '@/app/lib/factorio-blueprint-schema'

/**
 * @param text
 * @returns boolean: success
 */
const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    const type = 'text/plain'
    const blob = new Blob([text], { type })
    const data = [new ClipboardItem({ [type]: blob })]
    await navigator.clipboard.write(data)
    return true
  } catch (e: unknown) {
    console.warn(`Could not copy to clipboard.`, e)
    return false
  }
}

type Version = '1' | '2' | '2SA'
const versionOptions: Record<Version, string> = {
  '1': 'Factorio 1.x (versions before October 2024)',
  '2': 'Factorio 2.x',
  '2SA': 'Factorio 2.x with Space Age DLC',
}

const playbackModeOptions: Record<PlaybackMode, [string, string]> = {
  'global': ['Global' ,'The song can be heard everywhere'],
  'surface': ['Surface', 'The song can be heard on speaker\'s surface'],
  'local': ['Local', 'The song can be heard within the audible range around the speaker'],
}

export type ResultStageProps = {
  song: Song
}
export const ResultStage = ({ song }: ResultStageProps) => {
  const postHog = usePostHog()

  const [targetVersion, setTargetVersion] = useState<Version>('2')
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('global')
  const [copySuccess, setCopySuccess] = useState<boolean>(false)
  const [blueprintString, setBlueprintString] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])

  const getBlueprint = useCallback(async () => {
    setCopySuccess(false)
    const signalSet = targetVersion === '2SA' ? signalsDlc : signals

    const { blueprint, warnings } = songToFactorio(song, signalSet, playbackMode)
    const copyAttempt = await copyToClipboard(blueprint)
    setWarnings(warnings)
    setCopySuccess(copyAttempt)
    setBlueprintString(blueprint)
    postHog?.capture('Generated blueprint', {
      Title: song.midi.name,
      'Song Settings': song.settings,
      'Factorio Version': targetVersion,
      'Playback Mode': playbackMode,
      Blueprint: blueprint,
      Warnings: warnings,
      'Clipboard Success': copyAttempt,
    })
  }, [postHog, song, targetVersion, playbackMode])

  return (
    <div className="flex-column items-start gap-4">
      <div className="flex-column gap-2">
        <h2 className="mb0">Export blueprint</h2>
        <p>Factorio version:</p>
        {Object.entries(versionOptions).map(([value, title]) => (
          <div className="flex gap-2 ml-4" key={value}>
            <label>
              <input
                type="radio"
                name="target-version"
                onChange={({ target: { value } }) => {
                  setCopySuccess(false)
                  setTargetVersion(value as Version)
                }}
                value={value}
                checked={value === targetVersion}
              />
              {title}
            </label>
          </div>
        ))}
      </div>

      {targetVersion === '1' && (
        <div className="panel m0 alert-success max-w-lg">
          To create blueprints for Factorio 1.x, please use{' '}
          <a href="v1/" className="underline">
            Miditorio v1
          </a>
          .
        </div>
      )}

      <div className="flex-column gap-2">
        <p>Playback mode:</p>
        {Object.entries(playbackModeOptions).map(([value, texts]) => (
          <div className="flex gap-2 ml-4" key={value} title={texts[1]}>
            <label>
              <input
                type="radio"
                name="playback-mode"
                onChange={({ target: { value } }) => {
                  setCopySuccess(false)
                  setPlaybackMode(value as PlaybackMode)
                }}
                value={value}
                disabled={targetVersion === '1'}
                checked={value === playbackMode}
              />
              {texts[0]}
            </label>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <button
          className={`button button-green box-border ${targetVersion === '1' ? 'disabled' : ''}`}
          onClick={getBlueprint}
          disabled={targetVersion === '1'}
        >
          Copy blueprint
        </button>
        <p>{copySuccess && 'Copied to clipboard 🗸'}</p>
      </div>
      {warnings.length > 0 && (
        <div className="panel alert-warning flex-column gap-2 m0 w-full">
          {warnings.map((warning, i) => (
            <div key={i} className="flex items-start gap-2">
              <p>⚠️</p>
              <p className="!mt-0">{warning}</p>
            </div>
          ))}
        </div>
      )}

      <div
        className={`
          flex-column gap-2 m0 w-full max-w-lg mx-auto
          transition-all duration-500 ease-out
          ${blueprintString ? 'opacity-100 visible animate-fade-in-up' : 'opacity-0 invisible'}
        `}
      >
        <div className="panel alert-success flex-column gap-2 m0 w-full">
          <h3 className="text-center mb-2">
            🎵 Enjoying the new and improved Miditorio?
          </h3>
          <p className="!mt-0 text-center mb-4">
            The app was recently rebuilt from scratch for the release of
            Factorio: Space Age. If you find it useful, consider supporting its
            development with a small donation.
          </p>
          <div className="flex justify-center">
            <a
              href="https://ko-fi.com/mgabor"
              target="_blank"
              className="
                button button-green w-fit
                transform transition-all hover:scale-105
                relative
                before:absolute before:inset-0
                before:animate-shimmer
                before:bg-[linear-gradient(110deg,transparent,45%,#ffffff33,55%,transparent)]
                before:bg-[length:400%_100%]
                before:content-['']
                before:mix-blend-screen
                before:transition-[background-image]
                hover:before:bg-[linear-gradient(110deg,transparent,45%,#ffffff55,55%,transparent)]
              "
              onClick={() => postHog?.capture('Clicked Donate')}
            >
              ☕ Buy me a coffee
            </a>
          </div>
        </div>
        <textarea
          value={blueprintString}
          readOnly={true}
          cols={50}
          rows={3}
          className="mt-2"
        />
      </div>
    </div>
  )
}
