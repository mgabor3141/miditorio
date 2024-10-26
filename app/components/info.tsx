import GitHub from '@/app/assets/icons/github.svg'
import YouTube from '@/app/assets/icons/youtube.svg'
import KoFi from '@/app/assets/icons/kofi.svg'

export const Info = ({}) => (
  <main className="px-20 max-w-3xl m-auto">
    <div className="panel mt0 !pb-8">
      <h1>What is miditorio?</h1>
      <p>
        With miditorio you can create Factorio blueprints to play your favorite
        songs in-game, with programmable speakers.
      </p>
      <h1>How does it work?</h1>
      <p>
        Simply upload a MIDI file with the song that you would like to convert.
        Follow the instructions to set your desired parameters for each track in
        the original song.
      </p>
      <p>
        You can select which programmable speaker instrument should play each
        track, set how many levels of note velocities (loudness values) the
        result should play, and more. Miditorio chooses good defaults for each
        of these parameters, but you can always tune them to make the result
        sound just the way you like it.
      </p>
      <h1>What is a MIDI file?</h1>
      <p>[TODO: Explain what they are and where you can find them]</p>
      <h1>What are note ranges and why do they matter?</h1>
      <p>
        The instruments in Factorio have limited note ranges, which means a
        specific instrument cannot play notes that are too high or too low for
        it. To make sure that no notes will be missing from the result, you
        should assign an instrument that matches the range of notes in the track
        in question.
      </p>
      <p>
        You can also assign multiple instruments to a track, so that if there
        are any notes that the first instrument cannot play the second one will
        be able to, then the third, and so on.
      </p>
      <h1>Can I use this without buying the Space Age DLC?</h1>
      <p>
        Yes! Space Age is not required, but if you do have it, miditorio can use
        the extra signals to make the resulting blueprint smaller.
      </p>
      <p>
        Make sure to select the correct option at the last step, when exporting
        your blueprint.
      </p>
    </div>

    <footer className="flex gap-8 justify-center mb-8 mt-16 text-gray-300">
      <a href="https://github.com/mgabor3141/miditorio">
        <GitHub
          fill="currentColor"
          className="inline-block align-middle mr-1.5"
        />
        <span className="align-middle">GitHub</span>
      </a>
      <a href="https://www.youtube.com/@mgaborio">
        <YouTube
          fill="currentColor"
          className="inline-block align-middle mr-1.5"
        />
        <span className="align-middle">YouTube</span>
      </a>
      <a href="https://ko-fi.com/mgabor">
        <KoFi
          fill="currentColor"
          className="inline-block align-middle mr-1.5"
        />
        <span className="align-middle">Support</span>
      </a>
    </footer>
  </main>
)
