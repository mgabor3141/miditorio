import { useCallback, useState } from 'react'
import { Song } from '@/app/components/select-stage'
import { songToBlueprint } from '@/app/lib/song-to-blueprint'

export type ResultStageProps = {
  song: Song
}
export const ResultStage = ({ song }: ResultStageProps) => {
  const [blueprintString, setBlueprintString] = useState('')

  const getBlueprint = useCallback(() => {
    setBlueprintString(songToBlueprint(song))
  }, [song])

  return (
    <div>
      <button className="button button-green" onClick={getBlueprint}>
        Get blueprint!
      </button>
      <textarea
        value={blueprintString}
        readOnly={true}
        className="bg-gray-900"
        cols={50}
        rows={6}
      />
    </div>
  )
}
