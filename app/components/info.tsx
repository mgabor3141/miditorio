import GitHub from '@/app/assets/icons/github.svg'
import YouTube from '@/app/assets/icons/youtube.svg'
import KoFi from '@/app/assets/icons/kofi.svg'

export const Info = () => (
  <main className="px-20 max-w-3xl m-auto">
    <div className="panel mt0 !pb-8">
      <h1 className="text-l text-center">Questions and Answers</h1>

      <h2>What is Miditorio?</h2>
      <p>
        Miditorio allows you to create Factorio blueprints that play your
        favorite songs in-game using programmable speakers.
      </p>

      <h2>How does it work?</h2>
      <p>
        Simply upload a MIDI file of the song you want to convert. Follow the
        instructions to set your desired parameters for each track.
      </p>
      <p>
        You can select which Programmable Speaker instrument should play each
        track, set the number of note velocity levels (loudness values) for
        playback, and more. Miditorio provides good default settings for these
        parameters, but you can adjust them to make the result sound just the
        way you like it.
      </p>

      <h2>What is a MIDI file?</h2>
      <p>
        A MIDI file is a standard file format that contains musical data &ndash;
        such as notes, timing, and instrument information &ndash; but not actual
        audio recordings. This allows software like Miditorio to read and
        convert the music into Programmable Speaker events. You can find MIDI
        files for many songs online by searching for the song name followed by
        &#34;MIDI&#34;. There are websites dedicated to sharing MIDI files, or
        you can create your own using music composition software.
      </p>

      <h2>What are note ranges and why do they matter?</h2>
      <p>
        Each instrument in Factorio has a limited note range, meaning it cannot
        play notes that are too high or too low. To ensure no notes are missing
        from your song, assign an instrument that covers the range of notes in
        the track. If a single instrument doesn&#39;t cover all the notes, you
        can assign multiple instruments to a track. This way, if the first
        instrument cannot play a note, the second one might, and so on.
      </p>

      <h2>Can I use this without buying the Space Age DLC?</h2>
      <p>
        Yes! The Space Age DLC is not required to use Miditorio. However, if you
        do have it, Miditorio can utilize the extra signals provided by the DLC
        to make the resulting blueprint smaller. Be sure to select the correct
        option at the final step when exporting your blueprint.
      </p>

      <h2>How can I mute all programmable speakers?</h2>
      <p>
        If you&#39;re experiencing spam from programmable speakers in a
        multiplayer game, you can mute them by using the following command in
        the console:
      </p>
      <pre>
        <code>/mute-programmable-speaker mute</code>
      </pre>
      <p>
        If you&#39;re an admin and want to mute speakers for all players, you
        can use:
      </p>
      <pre>
        <code>/mute-programmable-speaker mute everyone</code>
      </pre>
      <p>Running these commands does not disable achievements.</p>
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
