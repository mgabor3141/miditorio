import GitHub from '@/app/assets/icons/github.svg'
import YouTube from '@/app/assets/icons/youtube.svg'
import KoFi from '@/app/assets/icons/kofi.svg'

export const Info = () => (
  <main
    className="px-20 max-w-3xl m-auto"
    role="complementary"
    aria-label="Help and Documentation"
  >
    <div className="panel mt0">
      <h1 className="text-l text-center mb-8" id="faq-title">
        Questions and Answers
      </h1>

      <section className="faq-section" aria-labelledby="what-is">
        <h2 className="faq-heading" id="what-is">
          What is Miditorio?
        </h2>
        <p className="faq-paragraph">
          Miditorio allows you to create Factorio blueprints that play your
          favorite songs in-game using programmable speakers.
        </p>
      </section>

      <section className="faq-section" aria-labelledby="how-works">
        <h2 className="faq-heading" id="how-works">
          How does it work?
        </h2>
        <p className="faq-paragraph">
          Simply select a MIDI file of the song you want to convert. Miditorio
          will automatically assign each track to a programmable speaker
          instrument, then generate Factorio signals that contain the musical
          information for each note.
        </p>
        <p className="faq-paragraph">
          The default settings work well for most songs, but you can fine-tune
          parameters like instrument assignment and note velocity groups if
          desired.
        </p>
      </section>

      <section className="faq-section" aria-labelledby="what-is-midi">
        <h2 className="faq-heading" id="what-is-midi">
          What is a MIDI file?
        </h2>
        <p className="faq-paragraph">
          A MIDI file is a standard file format that contains musical data
          &ndash; such as notes, timing, and instrument information &ndash; but
          not actual audio recordings. This allows software like Miditorio to
          read and convert the music into programmable speaker events. You can
          find MIDI files for many songs online by searching for the song name
          followed by &#34;MIDI&#34;. There are websites dedicated to sharing
          MIDI files, or you can create your own using music composition
          software.
        </p>
      </section>

      <section className="faq-section" aria-labelledby="note-ranges">
        <h2 className="faq-heading" id="note-ranges">
          What are note ranges and why do they matter?
        </h2>
        <p className="faq-paragraph">
          Each instrument in Factorio has a limited note range, meaning it
          cannot play notes that are too high or too low. To ensure no notes are
          missing from your song, assign an instrument that covers the full
          range of notes in the track. If a single instrument doesn&#39;t cover
          all notes, you can assign multiple instruments to a track. This way,
          if the first instrument cannot play a note, the second one might, and
          so on.
        </p>
      </section>

      <section className="faq-section" aria-labelledby="space-age-dlc">
        <h2 className="faq-heading" id="space-age-dlc">
          Can I use this without buying the Space Age DLC?
        </h2>
        <p className="faq-paragraph">
          Yes! The Space Age DLC is not required to use Miditorio. However, if
          you do have it, Miditorio can utilize the extra signals provided by
          the DLC to make the resulting blueprint smaller. Be sure to select the
          correct option at the final step when exporting your blueprint.
        </p>
      </section>

      <section className="faq-section" aria-labelledby="mute-speakers">
        <h2 className="faq-heading" id="mute-speakers">
          How can I mute all programmable speakers?
        </h2>
        <p className="faq-paragraph">
          If you&#39;re experiencing spam from programmable speakers in a
          multiplayer game, you can mute them by using the following command in
          the console:
        </p>
        <pre aria-label="Console command for muting speakers">
          <code>/mute-programmable-speaker mute</code>
        </pre>
        <p className="faq-paragraph">
          If you&#39;re an admin and want to mute speakers for all players, you
          can use:
        </p>
        <pre aria-label="Console command for muting speakers for all players">
          <code>/mute-programmable-speaker mute everyone</code>
        </pre>
        <p className="faq-paragraph">
          Running these commands does not disable achievements.
        </p>
      </section>
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
