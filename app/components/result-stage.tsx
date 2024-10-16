import { Dispatch, useCallback, useState } from 'react'
import { Song } from '@/app/components/select-stage'
import { songToFactorio } from '@/app/lib/song-to-factorio'
import signals from '@/app/lib/data/signals.json'
import signalsDlc from '@/app/lib/data/signals-dlc.json'
import { usePostHog } from 'posthog-js/react'

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
  onBack: Dispatch<void>
}
export const ResultStage = ({ song, onBack }: ResultStageProps) => {
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
      'Factorio Version': targetVersion,
      Blueprint: blueprint,
      Warnings: warnings,
      'Clipboard Success': copyAttempt,
    })
  }, [postHog, song, targetVersion])

  return (
    <div className="panel w-[500px]">
      <div className="panel-inset flex-column items-start gap-4">
        <button className="button" onClick={() => onBack()}>
          Back
        </button>

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
          <a href="v1/">miditorio v1</a>.
        </div>

        <div className="flex items-center gap-4">
          <button
            className={`button button-green box-border ${targetVersion === '1' ? 'disabled' : ''}`}
            onClick={getBlueprint}
            disabled={targetVersion === '1'}
          >
            Get blueprint!
          </button>
          <p>{copySuccess && 'Copied 🗸'}</p>
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
        <textarea value={blueprintString} readOnly={true} cols={50} rows={6} />
      </div>
    </div>
  )
}
