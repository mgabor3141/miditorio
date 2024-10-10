'use client'

import { useEffect, useState } from 'react'
import { SelectStage, Song } from './components/select-stage'
import { InstrumentStage } from '@/app/components/instrument-stage'
import { ResultStage } from '@/app/components/result-stage'

export type Stage = 'select' | 'instrument' | 'result'

export default function Home() {
  const [flowStage, setFlowStage] = useState<Stage>('select')
  const [song, setSong] = useState<Song | undefined>(undefined)

  // Select --> Instrument stage
  useEffect(() => {
    if (flowStage === 'select' && song) {
      setFlowStage('instrument')
    }
  }, [flowStage, song])

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-8 sm:p-20">
      <header>
        <a href="/" className="!text-3xl !text-[#ffe6c0] bold">
          miditorio.com
        </a>
      </header>
      <main className="flex flex-col gap-8 row-start-2 items-start">
        {flowStage === 'select' && <SelectStage setSong={setSong} />}
        {song && (
          <InstrumentStage
            song={song}
            onBack={() => {
              setSong(undefined)
              setFlowStage('select')
            }}
            onContinue={() => setFlowStage('result')}
            // this is hidden so that we can keep the state when coming back to this page
            className={flowStage === 'instrument' ? '' : 'display-none'}
          />
        )}
        {flowStage === 'result' && song && (
          <ResultStage song={song} onBack={() => setFlowStage('instrument')} />
        )}
      </main>
    </div>
  )
}
