'use client'
import posthog from 'posthog-js'
import { PostHogProvider } from 'posthog-js/react'
import React from 'react'
import packageJson from '@/package.json'
import { ChakraProvider, extendTheme } from '@chakra-ui/react'

if (typeof window !== 'undefined') {
  if (
    !process.env.NEXT_PUBLIC_POSTHOG_KEY ||
    !process.env.NEXT_PUBLIC_POSTHOG_HOST
  ) {
    console.error('Posthog env vars not set')
  } else {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      person_profiles: 'identified_only',
      persistence: 'memory',
    })

    posthog.register({
      version: packageJson.version,
    })
  }
}

const theme = extendTheme({
  components: {
    NumberInput: {
      baseStyle: {
        stepper: {
          borderStart: 0,
          _active: {
            background: 'radial-gradient(closest-side, #aaa, transparent)',
          },
        },
      },
    },
  },
})

export function Providers({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <PostHogProvider client={posthog}>
      <ChakraProvider theme={theme} disableGlobalStyle={true}>
        {children}
      </ChakraProvider>
    </PostHogProvider>
  )
}
