import Reveal from 'reveal.js'
import RevealNotes from 'reveal.js/plugin/notes'
import 'reveal.js/reset.css'
import 'reveal.js/reveal.css'
import './theme.css'
import { initLoopSpine } from './loop-spine.js'

const deck = new Reveal({
  hash: true,
  controls: true,
  progress: true,
  slideNumber: 'c/t',
  transition: 'slide',
  transitionSpeed: 'default',
  width: 1280,
  height: 720,
  margin: 0.06,
  // The presenter view ('S') gives us next-slide + notes + a timer, which we
  // want with two presenters.
  plugins: [RevealNotes],
})

// A slide can suppress the persistent corner logo with data-logo="off"
// (used on the title slide, which shows its own large logo).
function applyLogo(section) {
  const logo = document.getElementById('dtu-logo')
  if (logo) logo.style.opacity = section && section.dataset.logo === 'off' ? '0' : '1'
}

deck.initialize().then(() => {
  initLoopSpine(deck)
  deck.on('slidechanged', (e) => applyLogo(e.currentSlide))
  applyLogo(deck.getCurrentSlide())
})
