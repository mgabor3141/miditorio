import { useCallback, useState } from 'react'
import { songToFactorio } from '@/app/lib/song-to-factorio'
import signals from '@/app/lib/data/signals.json'
import signalsDlc from '@/app/lib/data/signals-dlc.json'
import { usePostHog } from 'posthog-js/react'
import { Song } from '@/app/lib/song'

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
    console.warn(`Could not copy to clipboard. Update your browser.`, e)
    return false
  }
}

type Version = '1' | '2' | '2SA'
const versionOptions: Record<Version, string> = {
  '1': 'Factorio 1.x',
  '2': 'Factorio 2.x',
  '2SA': 'Factorio 2.x with Space Age DLC',
}

export type ResultStageProps = {
  song: Song
}
export const ResultStage = ({ song }: ResultStageProps) => {
  const postHog = usePostHog()

  const [targetVersion, setTargetVersion] = useState<Version>('2')
  const [copySuccess, setCopySuccess] = useState<boolean>(false)
  const [blueprintString, setBlueprintString] = useState('')
  const [warnings, setWarnings] = useState<string[]>([])

  const resetResults = () => {
    setCopySuccess(false)
    setWarnings([])
    setBlueprintString('')
  }

  const getBlueprint = useCallback(async () => {
    setCopySuccess(false)
    const signalSet = targetVersion === '2SA' ? signalsDlc : signals

    const { blueprint, warnings } = songToFactorio(song, signalSet)
    const copyAttempt = await copyToClipboard(blueprint)
    setWarnings(warnings)
    setCopySuccess(copyAttempt)
    setBlueprintString(blueprint)
    postHog?.capture('Generated blueprint', {
      Title: song.midi.name,
      'Song Settings': song.settings,
      'Factorio Version': targetVersion,
      Blueprint: blueprint,
      Warnings: warnings,
      'Clipboard Success': copyAttempt,
    })
  }, [postHog, song, targetVersion])

  return (
    <div className="flex-column items-start gap-4">
      <div className="flex-column gap-2">
        <p className="mb-2">I am going to use this blueprint in:</p>
        {Object.entries(versionOptions).map(([value, title]) => (
          <div className="flex gap-2 ml-4" key={value}>
            <label>
              <input
                type="radio"
                name="target-version"
                onChange={({ target: { value } }) => {
                  resetResults()
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

      <div
        className={`  ${targetVersion !== '1' ? 'hidden' : 'panel m0 alert-success w-full'}`}
      >
        To create blueprints for Factorio 1.x, please use{' '}
        <a href="v1/" className="underline">
          Miditorio v1
        </a>
        .
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

      {blueprintString && (
        <>
          <div className="panel alert-success flex-column gap-2 m0 w-full max-w-lg mx-auto">
            <h3 className="text-center mb-2">
              🎵 Enjoying the new and improved Miditorio?
            </h3>
            <p className="!mt-0 text-center mb-4">
              The app was recently rebuilt from scratch for the release of
              Factorio 2.0! If you find it useful, consider supporting its
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
                  before:animate-[shimmer_3s_linear_infinite]
                  before:bg-[linear-gradient(110deg,transparent,45%,#ffffff33,55%,transparent)]
                  before:bg-[length:200%_100%]
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
          <p>
            As a reminder, click this button on your in-game shortcut bar to
            import blueprints:{' '}
            <img
              alt="ImportString.png"
              src="https://wiki.factorio.com/images/thumb/ImportString.png/25px-ImportString.png"
              decoding="async"
              width="25"
              height="24"
              srcSet="https://wiki.factorio.com/images/thumb/ImportString.png/38px-ImportString.png 1.5x, https://wiki.factorio.com/images/thumb/ImportString.png/50px-ImportString.png 2x"
              className="inline align-middle"
            />
          </p>
        </>
      )}
    </div>
  )
}
