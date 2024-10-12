import { Dispatch, useCallback, useState } from 'react'
import { Song } from '@/app/components/select-stage'
import { songToFactorio } from '@/app/lib/song-to-factorio'

export type ResultStageProps = {
  song: Song
  onBack?: Dispatch<void>
}
export const ResultStage = ({ song, onBack }: ResultStageProps) => {
  const [blueprintString, setBlueprintString] = useState('')

  const getBlueprint = useCallback(() => {
    setBlueprintString(songToFactorio(song))
  }, [song])

  return (
    <div className="panel">
      <div className="panel-inset">
        <button className="button" onClick={() => onBack && onBack()}>
          Back
        </button>
        <button className="button button-green" onClick={getBlueprint}>
          Get blueprint!
        </button>
        <textarea
          value={blueprintString}
          readOnly={true}
          cols={50}
          rows={6}
          className="text-"
        />
      </div>
    </div>
  )
}
