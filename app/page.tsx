'use client'

import { useFilePicker } from 'use-file-picker'
import { parseArrayBuffer } from 'midi-json-parser'
import { useState } from 'react'

export default function Home() {
  const [midi, setMidi] = useState()
  const { openFilePicker } = useFilePicker({
    accept: ['.mid', '.midi'],
    readAs: 'ArrayBuffer',
    onFilesSelected: async ({ filesContent }) => {
      setMidi(await parseArrayBuffer(filesContent[0].content))
    },
  })

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <button onClick={openFilePicker}>Select midi file</button>
        {JSON.stringify(midi, null, 4)}
      </main>
    </div>
  )
}
