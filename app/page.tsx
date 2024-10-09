'use client'

import { useEffect, useState } from 'react'
import { Midi } from '@tonejs/midi'
import { SelectStage } from './components/select-stage'
import { InstrumentStage } from '@/app/components/instrument-stage'

export type Stage = 'select' | 'instrument' | 'options'

export default function Home() {
  const [flowStage, setFlowStage] = useState<Stage>('select')
  const [song, setSong] = useState<Midi | undefined>(undefined)

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
        {flowStage === 'instrument' && song && <InstrumentStage song={song} />}
        {/*{blueprintString && (*/}
        {/*  <textarea*/}
        {/*    value={blueprintString}*/}
        {/*    readOnly={true}*/}
        {/*    className="bg-gray-900"*/}
        {/*    cols={50}*/}
        {/*    rows={6}*/}
        {/*  />*/}
        {/*)}*/}
      </main>
    </div>
  )
}
