'use client'

import { useFilePicker } from 'use-file-picker'
import { parseArrayBuffer } from 'midi-json-parser'
import { midiToBlueprint } from '@/app/lib/midi-to-blueprint'
import { useState } from 'react'

export default function Home() {
  const [blueprintString, setBlueprintString] = useState('')
  const { openFilePicker } = useFilePicker({
    accept: ['.mid', '.midi'],
    readAs: 'ArrayBuffer',
    onFilesSelected: async ({ filesContent }) => {
      const midi = await parseArrayBuffer(filesContent[0].content)
      setBlueprintString(midiToBlueprint(midi))
    },
  })

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <button onClick={openFilePicker}>Select midi file</button>
        <textarea
          value={blueprintString}
          readOnly={true}
          className="bg-gray-900"
          cols={50}
          rows={6}
        />
      </main>
    </div>
  )
}
