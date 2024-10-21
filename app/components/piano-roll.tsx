import {
  Application,
  Container,
  Graphics,
  RenderTexture,
  Sprite,
  Text,
  TextStyle,
} from 'pixi.js'
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { Midi, Track } from '@tonejs/midi'
import { gmInstrumentFamilies } from '@/app/lib/data/gm-instrument-families'
import { Settings } from '@/app/components/select-stage'
import { NoteExtremes } from '@/app/lib/song'

const PixiContext = createContext<Application>(null!)

export const PixiProvider = ({
  children,
}: Readonly<{
  children: ReactNode
}>) => {
  const appRef = useRef<Application | null>(null)
  const pixiRootDiv = useRef<HTMLDivElement | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let isThisUseEffectReady = false
    let isCancelled = false

    ;(async () => {
      const app = new Application()
      await app.init({
        backgroundAlpha: 0,
        resolution: window.devicePixelRatio,
        autoDensity: true,
      })

      if (isCancelled && app) {
        app.destroy()
      } else {
        appRef.current = app
        isThisUseEffectReady = true
        setIsReady(true)
      }
    })()

    return () => {
      if (isThisUseEffectReady && appRef.current) {
        setIsReady(false)
        appRef.current.destroy()
      } else {
        isCancelled = true
      }
    }
  }, [])

  useEffect(() => {
    if (isReady && appRef.current && pixiRootDiv.current) {
      appRef.current.resizeTo = pixiRootDiv.current
      pixiRootDiv.current?.replaceChildren()
      pixiRootDiv.current?.appendChild(appRef.current.canvas)
    }
  }, [isReady])

  return (
    <div ref={pixiRootDiv} className="w-full min-h-[30svh] max-h-[30svh]">
      {isReady && appRef.current && (
        <PixiContext.Provider value={appRef.current}>
          {children}
        </PixiContext.Provider>
      )}
    </div>
  )
}

const getTrackColor = (track: Track) => {
  const INSTRUMENT_FAMILY_BASE_COLOR: Partial<
    Record<(typeof gmInstrumentFamilies)[number], string>
  > = {
    piano: '#36638a',
    'chromatic percussion': '#b39f80',
    organ: '#846be1',
    guitar: '#d85c2e',
    bass: '#7eb6c3',
    strings: '#8A7090',
    ensemble: '#4c755c',
    brass: '#b68f29',
    reed: '#5e3925',
    pipe: '#B07156',
    'synth lead': '#8c297a',
    'synth pad': '#4c2b91',
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

export type PianoRollProps = {
  midi: Midi
  settings: Settings
  noteExtremes: NoteExtremes
  selectedTrack?: number
}
export const PianoRoll = ({
  midi,
  settings: _,
  noteExtremes,
  selectedTrack,
}: PianoRollProps) => {
  const app = useContext(PixiContext)
  const [initialWidth, setInitialWidth] = useState<
    { width: number; height: number } | undefined
  >()
  const [trackTextures, setTrackTextures] = useState<RenderTexture[]>([])
  const [lastResizeTimestamp, setLastResizeTimestamp] = useState(0)

  useEffect(() => {
    const width = app.canvas.clientWidth
    const height = app.canvas.clientHeight

    setInitialWidth({ width, height })
  }, [app])

  useEffect(() => {
    if (!initialWidth) return
    const { width, height } = initialWidth

    console.log('Rendering piano roll...')

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

    requestAnimationFrame(() => {
      app.render()

      requestAnimationFrame(() => {
        const { min, max } = noteExtremes

        const tempContainer = new Container()
        const trackRenderTextures = midi.tracks
          .filter((track) => !track.instrument.percussion)
          .map((track) => {
            const renderTexture = RenderTexture.create({
              width,
              height,
              antialias: true,
              resolution: 2 * window.devicePixelRatio,
            })

            track.notes.forEach((note) => {
              tempContainer.addChild(
                new Graphics()
                  .roundRect(
                    (note.ticks / midi.durationTicks) * width,
                    height - ((note.midi - min) / (max - min)) * height,
                    Math.max(
                      (note.durationTicks / midi.durationTicks) * width,
                      1,
                    ),
                    height / (max - min),
                    2,
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
      })
    })
  }, [app, initialWidth, midi, noteExtremes])

  useEffect(() => {
    const width = app.canvas.clientWidth
    const height = app.canvas.clientHeight

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
          width,
          height,
        }),
      ),
    )
  }, [trackTextures, selectedTrack, app, lastResizeTimestamp])

  useEffect(() => {
    const handleResize = ({ timeStamp }: Event) =>
      setLastResizeTimestamp(timeStamp)

    window.addEventListener('resize', handleResize)

    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return <></>
}
