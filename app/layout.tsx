import './globals.css'
import './factorio.css'
import { Titillium_Web } from 'next/font/google'

import type { Metadata } from 'next'
import { CSPostHogProvider } from './providers'
import React from 'react'

const titilliumWeb = Titillium_Web({
  weight: ['400', '700'],
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'miditorio – Factorio music converter',
  description: 'Create Factorio blueprints from any song!',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <CSPostHogProvider>
        <body className={`antialiased ${titilliumWeb.className}`}>
          {children}
        </body>
      </CSPostHogProvider>
    </html>
  )
}
