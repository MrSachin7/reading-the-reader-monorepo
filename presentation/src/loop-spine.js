/*
 * Loop-spine: the recurring "adaptive loop" device.
 *
 * A slide declares which loop stage(s) it is talking about with a data
 * attribute on its <section>:
 *
 *   data-loop-stage="sense"                 -> lights one stage
 *   data-loop-stage="decide,intervene"      -> lights several
 *   data-loop-stage="all"                   -> whole loop (closure / overview)
 *   (no attribute)                          -> spine hidden
 *
 * The four stages sit at top / right / bottom / left, so the widget reads as a
 * cycle. The active stage name is echoed in the caption underneath.
 */

const STAGES = [
  { id: 'sense',     label: 'Sense',     x: 60, y: 16 },
  { id: 'analyse',   label: 'Analyse',   x: 104, y: 60 },
  { id: 'decide',    label: 'Decide',    x: 60, y: 104 },
  { id: 'intervene', label: 'Intervene', x: 16, y: 60 },
]

const TITLES = {
  sense: 'Sense', analyse: 'Analyse', decide: 'Decide', intervene: 'Intervene',
}

function buildSvg() {
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  svg.setAttribute('viewBox', '0 0 120 120')

  const ring = document.createElementNS(ns, 'circle')
  ring.setAttribute('class', 'ring')
  ring.setAttribute('cx', '60')
  ring.setAttribute('cy', '60')
  ring.setAttribute('r', '44')
  svg.appendChild(ring)

  for (const s of STAGES) {
    const node = document.createElementNS(ns, 'circle')
    node.setAttribute('class', 'node')
    node.setAttribute('data-stage', s.id)
    node.setAttribute('cx', s.x)
    node.setAttribute('cy', s.y)
    node.setAttribute('r', '10')
    svg.appendChild(node)
  }
  return svg
}

export function initLoopSpine(deck) {
  const root = document.getElementById('loop-spine')
  if (!root) return

  root.appendChild(buildSvg())
  const caption = document.createElement('div')
  caption.className = 'caption'
  root.appendChild(caption)

  const nodes = root.querySelectorAll('.node')

  function apply(section) {
    const raw = section && section.getAttribute('data-loop-stage')
    if (!raw) {
      root.classList.remove('visible')
      return
    }
    const stages = raw === 'all'
      ? STAGES.map((s) => s.id)
      : raw.split(',').map((s) => s.trim())

    nodes.forEach((n) => {
      n.classList.toggle('active', stages.includes(n.getAttribute('data-stage')))
    })
    caption.textContent = raw === 'all'
      ? 'The adaptive loop'
      : stages.map((s) => TITLES[s] || s).join(' → ')
    root.classList.add('visible')
  }

  deck.on('slidechanged', (e) => apply(e.currentSlide))
  apply(deck.getCurrentSlide())
}
