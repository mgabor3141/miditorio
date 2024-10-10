import { Track } from '@tonejs/midi'
import { useEffect, useRef, useState } from 'react'
import {
  Application,
  Container,
  Graphics,
  RenderTexture,
  Sprite,
  Text,
  TextStyle,
} from 'pixi.js'
import { Song } from '@/app/components/select-stage'
import { gmInstrumentFamilies } from '@/app/lib/data/gm-instrument-families'

const getTrackColor = (track: Track) => {
  const INSTRUMENT_FAMILY_BASE_COLOR: Partial<
    Record<(typeof gmInstrumentFamilies)[number], string>
  > = {
    piano: '#016FB9',
    'chromatic percussion': '#80B3A7',
    organ: '#846be1',
    guitar: '#b65531',
    bass: '#6e0d14',
    strings: '#8A7090',
    ensemble: '#7785AC',
    brass: '#b68f29',
    reed: '#5e3925',
    pipe: '#B07156',
    'synth lead': '#aa0e8a',
    'synth pad': '#178c90',
    // 'synth effects': '#',
    // world: '#',
    // percussive: '#',
    // 'sound effects': '#',
  }

  return (
    INSTRUMENT_FAMILY_BASE_COLOR[
      track.instrument.family as (typeof gmInstrumentFamilies)[number]
    ] || '#8A817C'
  )
}

export const PianoRoll = ({
  song,
  width,
  height,
  selectedTrack,
}: {
  song: Song
  width: number
  height: number
  selectedTrack?: number
}) => {
  const pixiRootDiv = useRef<HTMLDivElement>(null)
  const [app, setApp] = useState<Application | undefined>(undefined)
  const [appInitialized, setAppInitialized] = useState(false)
  const [trackTextures, setTrackTextures] = useState<RenderTexture[]>([])

  useEffect(() => {
    if (app) {
      if (
        appInitialized &&
        (app.screen.width !== width || app.screen.height !== height)
      )
        throw new Error('Piano roll size changed, this is not supported')

      return
    }

    const newPixiApp = new Application()
    setApp(newPixiApp)
  }, [app, appInitialized, height, width])

  useEffect(() => {
    if (!app) return
    ;(async () => {
      if (!pixiRootDiv.current) return

      await app.init({
        width,
        height,
        backgroundAlpha: 0,
        resolution: window.devicePixelRatio,
        autoDensity: true,
      })

      // We check again after await
      if (!pixiRootDiv.current) {
        app.destroy()
        return
      }
      pixiRootDiv.current.appendChild(app.canvas)
      const loading = new Text({
        text: 'Rendering piano roll...',
        style: new TextStyle({
          fontFamily: ['Titillium Web', 'sans-serif'],
          fontSize: 24,
          fill: '#a8a6a2',
          dropShadow: {
            color: '#000000',
            blur: 4,
            angle: Math.PI / 6,
            distance: 2,
          },
        }),
      })
      loading.anchor.set(0.5)
      loading.x = width / 2
      loading.y = height / 2
      app.stage.addChild(loading)
      app.render()
      setAppInitialized(true)
    })()
  }, [app, height, width])

  useEffect(() => {
    ;(async () => {
      if (!app || !appInitialized) return
      console.log('Rendering piano roll...')
      const { min, max } = song.additionalInfo.noteExtremes

      const tempContainer = new Container()
      const trackRenderTextures = song.midi.tracks
        .filter((track) => !track.instrument.percussion)
        .map((track) => {
          const renderTexture = RenderTexture.create({
            width,
            height,
            antialias: true,
          })

          track.notes.forEach((note) => {
            tempContainer.addChild(
              new Graphics()
                .roundRect(
                  (note.ticks / song.midi.durationTicks) * width,
                  height - ((note.midi - min) / (max - min)) * height,
                  Math.max(
                    (note.durationTicks / song.midi.durationTicks) * width,
                    1,
                  ),
                  Math.max(height / max - min, 8),
                  1,
                )
                .fill(getTrackColor(track)),
            )
          })

          app.renderer.render({
            container: tempContainer,
            target: renderTexture,
          })

          tempContainer.children.forEach((child) => child.destroy())
          tempContainer.removeChildren()
          return renderTexture
        })

      tempContainer.destroy()
      setTrackTextures(trackRenderTextures)
      console.log('Piano roll render complete!')
    })()
  }, [app, appInitialized, width, height, song])

  useEffect(() => {
    if (!app || !appInitialized) return
    console.log('Refreshing piano roll...')
    app.stage.removeChildren()

    trackTextures.forEach((texture, trackNumber) =>
      app.stage.addChild(
        new Sprite({
          texture,
          alpha:
            selectedTrack === undefined || trackNumber === selectedTrack
              ? 1
              : 0.25,
          zIndex: trackNumber === selectedTrack ? 2 : 1,
        }),
      ),
    )
  }, [app, trackTextures, selectedTrack, appInitialized])

  return (
    <div
      ref={pixiRootDiv}
      style={{ width, height, minWidth: width, minHeight: height }}
    />
  )
}
