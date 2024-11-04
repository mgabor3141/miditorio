'use client'

import { useEffect, useState } from 'react'
import { SelectStage } from './components/select-stage'
import { InstrumentStage } from '@/app/components/instrument-stage'
import { Song } from '@/app/lib/song'
import { usePostHog } from 'posthog-js/react'
import { Info } from '@/app/components/info'

export type Stage = 'select' | 'instrument'

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
    <>
      <div
        className={`${flowStage === 'select' && 'min-h-[85dvh]'} flex flex-col box-content mx-8 xl:mx-20 2xl:mx-40`}
      >
        <header className="text-center mt-14">
          <a href="/" className="!text-3xl !text-[#ffe6c0] bold">
            Miditorio
          </a>
          <p className="text-gray-300">
            Create Factorio blueprints from any song!
          </p>
        </header>
        <>
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
                  // Unwrap to copy, make sure dependencies change
                  return { ...song, settings: { ...newSettings } }
                })
              }}
              onBack={() => {
                setSong(undefined)
                setFlowStage('select')
              }}
              // this is just hidden instead of gone so that we can
              //  keep the state when coming back to this page
              className={flowStage === 'instrument' ? '' : 'display-none'}
            />
          )}
        </>
      </div>
      <Info />
    </>
  )
}
