import GitHub from '@/app/assets/icons/github.svg'
import YouTube from '@/app/assets/icons/youtube.svg'
import KoFi from '@/app/assets/icons/kofi.svg'

export const Info = ({}) => (
  <>
    <div className="panel mt0">
      <h1>What is miditorio?</h1>
      <p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua
      </p>
      <h1>What is miditorio.com?</h1>
      <p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua
      </p>
      <h1>What is miditorio.com?</h1>
      <p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua
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
  </>
)
