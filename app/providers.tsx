'use client'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import React from 'react'

if (
  !process.env.NEXT_PUBLIC_POSTHOG_KEY ||
  !process.env.NEXT_PUBLIC_POSTHOG_HOST
) {
  throw new Error('Posthog env vars not set')
}

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
    person_profiles: 'identified_only', // or 'always' to create profiles for anonymous users as well
    persistence: 'memory',
  })
}
export function CSPostHogProvider({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return <PostHogProvider client={posthog}>{children}</PostHogProvider>
}