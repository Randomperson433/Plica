import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './home.css'

// ─── Mini canvas renderer (shared drawing primitives) ────────────────────────
const W = 14, H = 10, SP = H / 2, STEP = SP, TAIL = 36, SCALE = 2

function drawNote(ctx, x, y, filled = true) {
  if (filled) ctx.fillRect(x, y, W, H)
  else {
    ctx.strokeStyle = '#1a1108'
    ctx.lineWidth = 1.5
    ctx.strokeRect(x + 0.75, y + 0.75, W - 1.5, H - 1.5)
  }
}

// Draw a small sequence of ligatures for the Ligatura card
function drawLigaturaDecor(canvas) {
  const specs = [
    { notes: [{ dy: 0 }, { dy: 2 }, { dy: -1 }] },
    { notes: [{ dy: 0 }, { dy: 3 }], obliquePairs: [[0, 1]] },
    { notes: [{ dy: 0 }, { dy: -2 }], upStemFirst: true },
    { notes: [{ dy: 0 }, { dy: 2 }, { dy: 2 }, { dy: -1 }], downStemFirstLeft: true },
  ]

  const GAP = 18, PL = 10, PT = 32, PB = 48
  const SCALE = 2

  // Layout each spec
  function layout(spec) {
    const notes = spec.notes, n = notes.length
    const oblFirst = new Set((spec.obliquePairs || []).map(p => p[0]))
    const rawY = [0]
    for (let i = 1; i < n; i++) rawY.push(rawY[i - 1] + notes[i].dy * STEP)
    const minY = Math.min(...rawY)
    const ny = rawY.map(y => y - minY)
    const rawX = [0]
    for (let i = 1; i < n; i++)
      rawX.push(oblFirst.has(i - 1) ? rawX[i - 1] + W + 10 : rawX[i - 1] + W)
    return { rawX, ny, noteW: rawX[n - 1] + W, minY, maxY: Math.max(...rawY) }
  }

  const layouts = specs.map(layout)
  const allMinY = Math.min(...layouts.map(l => l.minY))
  const allMaxY = Math.max(...layouts.map(l => l.maxY))
  const noteRange = allMaxY - allMinY
  const totalNoteW = layouts.reduce((s, l) => s + l.noteW, 0) + GAP * (specs.length - 1)
  const cw = totalNoteW + PL * 2
  const ch = noteRange + H + PT + PB

  canvas.width = cw * SCALE
  canvas.height = ch * SCALE
  canvas.style.width = cw + 'px'
  canvas.style.height = ch + 'px'

  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)

  // Staff lines
  const staffMid = PT + Math.round(noteRange / (2 * SP)) * SP + SP
  const staffTop = Math.round((staffMid - 2 * H) / SP) * SP
  ctx.strokeStyle = 'rgba(100,80,20,0.25)'
  ctx.lineWidth = 0.6
  for (let k = 0; k <= 4; k++) {
    const sy = staffTop + k * H + 0.35
    ctx.beginPath(); ctx.moveTo(PL - 8, sy); ctx.lineTo(PL + totalNoteW + 8, sy); ctx.stroke()
  }

  ctx.fillStyle = '#1a1108'
  let curX = PL
  specs.forEach((spec, si) => {
    const l = layouts[si]
    const yOff = PT + (l.minY - allMinY)
    const notes = spec.notes, n = notes.length
    const oblFirst = new Set((spec.obliquePairs || []).map(p => p[0]))
    const oblSecond = new Set((spec.obliquePairs || []).map(p => p[1]))
    const NX = i => curX + l.rawX[i]
    const NY = i => yOff + l.ny[i]
    const conn = (x, ya, yb) => { const t = Math.min(ya, yb), b = Math.max(ya, yb) + H; ctx.fillRect(x, t, 1, b - t) }

    for (let i = 0; i < n; i++) {
      const x = NX(i), y = NY(i)
      if (oblFirst.has(i)) {
        const x2 = NX(i + 1) + W, y2 = NY(i + 1)
        ctx.beginPath()
        ctx.moveTo(x, y); ctx.lineTo(x, y + H); ctx.lineTo(x2, y2 + H); ctx.lineTo(x2, y2)
        ctx.closePath(); ctx.fill()
        if (i > 0 && !oblFirst.has(i - 1) && !oblSecond.has(i - 1)) conn(x, NY(i - 1), y)
        if (i + 2 < n && !oblFirst.has(i + 1)) conn(x2, y2, NY(i + 2))
      } else if (!oblSecond.has(i)) {
        ctx.fillRect(x, y, W, H)
        if (i > 0 && !oblFirst.has(i - 1) && !oblSecond.has(i - 1)) conn(x, NY(i - 1), y)
      }
    }
    if (spec.upStemFirst) ctx.fillRect(NX(0), NY(0) - 30, 1, 30)
    if (spec.downStemFirstLeft) ctx.fillRect(NX(0), NY(0), 1, TAIL)
    curX += l.noteW + GAP
  })
}

// Draw L B S M note sequence for Mensura card
function drawMensuraDecor(canvas) {
  const cw = 200, ch = 110
  canvas.width = cw * SCALE; canvas.height = ch * SCALE
  canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px'
  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)

  // Staff
  ctx.strokeStyle = 'rgba(100,80,20,0.25)'; ctx.lineWidth = 0.6
  const staffTop = 28
  for (let k = 0; k <= 4; k++) {
    const sy = staffTop + k * H + 0.35
    ctx.beginPath(); ctx.moveTo(8, sy); ctx.lineTo(cw - 8, sy); ctx.stroke()
  }

  ctx.fillStyle = '#1a1108'
  const noteY = staffTop + H  // sit on second line
  const notes = [
    { x: 14,  w: 22, h: H,     stem: null,    label: 'L' },
    { x: 50,  w: W,  h: H,     stem: null,    label: 'B' },
    { x: 82,  w: W,  h: H,     stem: 'up',    label: 'S' },  // S = up stem left
    { x: 116, w: W,  h: H,     stem: 'right', label: 'M' },  // M = up stem right
    { x: 150, w: W,  h: H,     stem: 'both',  label: 'Sm' }, // Sm = stems both sides
  ]

  notes.forEach(({ x, w, h, stem }) => {
    ctx.fillRect(x, noteY, w, h)
    if (stem === 'up')    ctx.fillRect(x, noteY - 28, 1, 28)           // S: left upward stem
    if (stem === 'right') ctx.fillRect(x + w - 1, noteY - 28, 1, 28)  // M: right upward stem
    if (stem === 'both') {
      ctx.fillRect(x, noteY - 28, 1, 28)
      ctx.fillRect(x + w - 1, noteY - 28, 1, 28)
    }
  })

  // Labels
  ctx.fillStyle = 'rgba(122,106,74,0.7)'
  ctx.font = '7px "Crimson Pro", serif'
  ctx.textAlign = 'center'
  const labelNotes = [
    { x: 14 + 11, label: 'L' },
    { x: 50 + W/2, label: 'B' },
    { x: 82 + W/2, label: 'S' },
    { x: 116 + W/2, label: 'M' },
    { x: 150 + W/2, label: 'Sm' },
  ]
  labelNotes.forEach(({ x, label }) => ctx.fillText(label, x, noteY + H + 10))
}

// Draw mensuration signs for Signa card
function drawSignaDecor(canvas) {
  const cw = 220, ch = 110
  canvas.width = cw * SCALE; canvas.height = ch * SCALE
  canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px'
  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)

  // Staff
  ctx.strokeStyle = 'rgba(100,80,20,0.25)'; ctx.lineWidth = 0.6
  const staffTop = 20
  for (let k = 0; k <= 4; k++) {
    const sy = staffTop + k * H + 0.35
    ctx.beginPath(); ctx.moveTo(8, sy); ctx.lineTo(cw - 8, sy); ctx.stroke()
  }

  const signs = [
    { x: 20,  symbol: '𝇋', label: 'O·' },   // perfect tempus, major prolation
    { x: 68,  symbol: '𝇌', label: 'C·' },   // imperfect tempus, major prolation
    { x: 116, symbol: '○', label: 'O'  },   // perfect tempus, minor prolation
    { x: 164, symbol: 'C', label: 'C'  },   // imperfect tempus, minor prolation
  ]

  const cy = staffTop + H * 2 + H / 2  // centre on staff

  signs.forEach(({ x, symbol, label }) => {
    ctx.fillStyle = '#1a1108'
    ctx.font = `bold 22px "Crimson Pro", Georgia, serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(symbol, x + 14, cy)

    ctx.fillStyle = 'rgba(122,106,74,0.7)'
    ctx.font = '7px "Crimson Pro", serif'
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(label, x + 14, staffTop + H * 4 + H + 10)
  })
}

// Draw colored notation for Colores card
function drawColoresDecor(canvas) {
  const specs = [
    { notes: [{ dy: 0 }, { dy: 2 }], color: '#1a1108' },
    { notes: [{ dy: 0 }, { dy: -2 }], obliquePairs: [[0, 1]], color: '#8b1a1a' },
    { notes: [{ dy: 0 }, { dy: 2 }, { dy: -1 }], color: '#1a1108' },
    { notes: [{ dy: 0 }, { dy: -2 }], color: '#8b1a1a', void: true },
  ]

  const GAP = 16, PL = 10, PT = 28, PB = 44
  function layout(spec) {
    const notes = spec.notes, n = notes.length
    const oblFirst = new Set((spec.obliquePairs || []).map(p => p[0]))
    const rawY = [0]
    for (let i = 1; i < n; i++) rawY.push(rawY[i - 1] + notes[i].dy * STEP)
    const minY = Math.min(...rawY)
    const ny = rawY.map(y => y - minY)
    const rawX = [0]
    for (let i = 1; i < n; i++)
      rawX.push(oblFirst.has(i - 1) ? rawX[i - 1] + W + 10 : rawX[i - 1] + W)
    return { rawX, ny, noteW: rawX[n - 1] + W, minY, maxY: Math.max(...rawY) }
  }

  const layouts = specs.map(layout)
  const allMinY = Math.min(...layouts.map(l => l.minY))
  const allMaxY = Math.max(...layouts.map(l => l.maxY))
  const noteRange = allMaxY - allMinY
  const totalNoteW = layouts.reduce((s, l) => s + l.noteW, 0) + GAP * (specs.length - 1)
  const cw = totalNoteW + PL * 2
  const ch = noteRange + H + PT + PB

  canvas.width = cw * SCALE; canvas.height = ch * SCALE
  canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px'

  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)

  const staffMid = PT + Math.round(noteRange / (2 * SP)) * SP + SP
  const staffTop = Math.round((staffMid - 2 * H) / SP) * SP
  ctx.strokeStyle = 'rgba(100,80,20,0.25)'; ctx.lineWidth = 0.6
  for (let k = 0; k <= 4; k++) {
    const sy = staffTop + k * H + 0.35
    ctx.beginPath(); ctx.moveTo(PL - 8, sy); ctx.lineTo(PL + totalNoteW + 8, sy); ctx.stroke()
  }

  let curX = PL
  specs.forEach((spec, si) => {
    const l = layouts[si]
    const yOff = PT + (l.minY - allMinY)
    const notes = spec.notes, n = notes.length
    const oblFirst = new Set((spec.obliquePairs || []).map(p => p[0]))
    const oblSecond = new Set((spec.obliquePairs || []).map(p => p[1]))
    const NX = i => curX + l.rawX[i]
    const NY = i => yOff + l.ny[i]
    const conn = (x, ya, yb) => {
      const t = Math.min(ya, yb), b = Math.max(ya, yb) + H
      if (spec.void) {
        ctx.strokeStyle = spec.color; ctx.lineWidth = 1
        ctx.beginPath(); ctx.moveTo(x + 0.5, t); ctx.lineTo(x + 0.5, b); ctx.stroke()
      } else {
        ctx.fillStyle = spec.color; ctx.fillRect(x, t, 1, b - t)
      }
    }

    ctx.fillStyle = spec.color
    for (let i = 0; i < n; i++) {
      const x = NX(i), y = NY(i)
      if (oblFirst.has(i)) {
        const x2 = NX(i + 1) + W, y2 = NY(i + 1)
        ctx.beginPath()
        ctx.moveTo(x, y); ctx.lineTo(x, y + H); ctx.lineTo(x2, y2 + H); ctx.lineTo(x2, y2)
        ctx.closePath()
        if (spec.void) { ctx.strokeStyle = spec.color; ctx.lineWidth = 1.5; ctx.stroke() }
        else ctx.fill()
        if (i > 0 && !oblFirst.has(i - 1) && !oblSecond.has(i - 1)) conn(x, NY(i - 1), y)
        if (i + 2 < n && !oblFirst.has(i + 1)) conn(x2, y2, NY(i + 2))
      } else if (!oblSecond.has(i)) {
        if (spec.void) {
          ctx.strokeStyle = spec.color; ctx.lineWidth = 1.5
          ctx.strokeRect(x + 0.75, y + 0.75, W - 1.5, H - 1.5)
        } else {
          ctx.fillRect(x, y, W, H)
        }
        if (i > 0 && !oblFirst.has(i - 1) && !oblSecond.has(i - 1)) conn(x, NY(i - 1), y)
      }
    }
    curX += l.noteW + GAP
  })
}

// ─── Card component ───────────────────────────────────────────────────────────
function AppCard({ id, title, subtitle, desc, accentColor, drawFn, onClick }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    if (canvasRef.current) drawFn(canvasRef.current)
  }, [drawFn])

  return (
    <div className="home-card" style={{ '--accent': accentColor }} onClick={onClick}>
      <div className="home-card-decor">
        <canvas ref={canvasRef} className="home-card-canvas" />
      </div>
      <div className="home-card-body">
        <div className="home-card-title">{title}</div>
        <div className="home-card-subtitle">{subtitle}</div>
        <p className="home-card-desc">{desc}</p>
      </div>
      <div className="home-card-arrow">→</div>
    </div>
  )
}

// ─── Home ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate()

  const cards = [
    {
      id: 'ligatura',
      title: 'Ligatura',
      subtitle: 'Ligature Reading',
      desc: 'Identify the rhythmic values of ligatures — box, oblique, and their modifications.',
      accentColor: '#a07820',
      drawFn: drawLigaturaDecor,
      path: '/ligatura',
    },
    {
      id: 'mensura',
      title: 'Mensura',
      subtitle: 'Imperfection & Alteration',
      desc: 'Determine actual note durations when imperfection, alteration, and modification rules apply.',
      accentColor: '#7a2a2a',
      drawFn: drawMensuraDecor,
      path: '/mensura',
    },
    {
      id: 'signa',
      title: 'Signa',
      subtitle: 'Mensuration Signs',
      desc: 'Read and interpret the four mensuration signs governing tempus and prolation.',
      accentColor: '#2a5c6a',
      drawFn: drawSignaDecor,
      path: '/signa',
    },
    {
      id: 'colores',
      title: 'Colores',
      subtitle: 'Coloration',
      desc: 'Recognize black, red, and void notation and calculate their effect on note values.',
      accentColor: '#6a1a1a',
      drawFn: drawColoresDecor,
      path: '/colores',
    },
  ]

  return (
    <div className="home-root">
      <div className="home-container">
        <header className="home-header">
          <h1 className="home-title">Plica</h1>
          <p className="home-tagline">Exercises in mensural notation</p>
          <div className="home-rule" />
        </header>

        <div className="home-cards">
          {cards.map(card => (
            <AppCard
              key={card.id}
              {...card}
              onClick={() => navigate(card.path)}
            />
          ))}
        </div>

        <footer className="home-footer">
          <span>Ars Nova · Ars Antiqua · Trecento</span>
        </footer>
      </div>
    </div>
  )
}
