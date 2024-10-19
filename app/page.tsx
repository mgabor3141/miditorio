'use client'

import { useEffect, useState } from 'react'
import { SelectStage } from './components/select-stage'
import { InstrumentStage } from '@/app/components/instrument-stage'
import { ResultStage } from '@/app/components/result-stage'
import { Song } from '@/app/lib/song'
import posthog from 'posthog-js'
import { usePostHog } from 'posthog-js/react'

export type Stage = 'select' | 'instrument' | 'result'

export default function Home() {
  const postHog = usePostHog()
  const [flowStage, setFlowStage] = useState<Stage>('select')
  const [song, setSong] = useState<Song | undefined>(undefined)

  // Select --> Instrument stage
  useEffect(() => {
    if (flowStage === 'select' && song) {
      setFlowStage('instrument')
    }
  }, [flowStage, song])

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-8 xl:p-20">
      <header className="text-center">
        <a href="/" className="!text-3xl !text-[#ffe6c0] bold">
          miditorio.com
        </a>
        <p className="text-gray-300">
          Create Factorio blueprints from any song!
        </p>
      </header>
      <main className="flex flex-col gap-8 row-start-2 items-center min-w-full max-w-full">
        {flowStage === 'select' && <SelectStage setSong={setSong} />}
        {song && (
          <InstrumentStage
            song={song}
            onSettingsChanged={(newSettings) => {
              postHog.capture('Settings changed', {
                'Previous settings': song?.settings,
                'New settings': newSettings,
              })
              setSong((song) => {
                if (!song) return
                return { ...song, settings: newSettings }
              })
            }}
            onBack={() => {
              setSong(undefined)
              setFlowStage('select')
            }}
            onContinue={() => setFlowStage('result')}
            // this is just hidden instead of gone so that we can
            //  keep the state when coming back to this page
            className={flowStage === 'instrument' ? '' : 'display-none'}
          />
        )}
        {flowStage === 'result' && song && (
          <ResultStage song={song} onBack={() => setFlowStage('instrument')} />
        )}
      </main>
      <footer>
        {flowStage === 'select' && <a href="v1/">Go to miditorio v1</a>}
      </footer>
    </div>
  )
}
