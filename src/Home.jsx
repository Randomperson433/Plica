import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import './home.css'

// ─── Shared constants ─────────────────────────────────────────────────────────
const SCALE = 2  // draw at 2x, display at 1x for crispness

// Snap a value to the nearest 0.5 (pixel centre) for crisp strokes,
// or to integer for crisp fills.
const px  = v => Math.round(v)          // for fills
const spx = v => Math.floor(v) + 0.5   // for strokes (sits on pixel boundary)

// ─── Note drawing helpers ─────────────────────────────────────────────────────
// All coordinates are logical (pre-scale). Canvas is already scaled 2x.

const NW = 14   // note width
const NH = 10   // note height (breve / longa body)
const DW = NH   // diamond width = note height (makes it square-ish)
const DH = NH   // diamond height

// Filled rectangle (breve body, longa body)
function fillRect(ctx, x, y, w, h) {
  ctx.fillRect(px(x), px(y), px(w), px(h))
}

// Hollow rectangle
function strokeRect(ctx, x, y, w, h, lw) {
  ctx.lineWidth = lw
  ctx.strokeRect(spx(x), spx(y), px(w), px(h))
}

// Filled diamond (semibreve, minim body)
function fillDiamond(ctx, cx, cy, hw, hh) {
  ctx.beginPath()
  ctx.moveTo(px(cx),      px(cy - hh))
  ctx.lineTo(px(cx + hw), px(cy))
  ctx.lineTo(px(cx),      px(cy + hh))
  ctx.lineTo(px(cx - hw), px(cy))
  ctx.closePath()
  ctx.fill()
}

// Hollow diamond
function strokeDiamond(ctx, cx, cy, hw, hh, lw) {
  ctx.lineWidth = lw
  ctx.beginPath()
  ctx.moveTo(px(cx),      px(cy - hh))
  ctx.lineTo(px(cx + hw), px(cy))
  ctx.lineTo(px(cx),      px(cy + hh))
  ctx.lineTo(px(cx - hw), px(cy))
  ctx.closePath()
  ctx.stroke()
}

// Stem (vertical line)
function stem(ctx, x, y1, y2, lw) {
  ctx.lineWidth = lw
  ctx.beginPath()
  ctx.moveTo(spx(x), px(y1))
  ctx.lineTo(spx(x), px(y2))
  ctx.stroke()
}

// Draw a single note at position (x, y = top of body area)
// type: 'L' | 'B' | 'S' | 'M'
// style: 'black' | 'white'
// color: css color string
function drawNote(ctx, type, x, y, style, color) {
  ctx.fillStyle = color
  ctx.strokeStyle = color
  const lw = 1.5
  const stemLen = 22

  if (type === 'L') {
    // Longa: wide rectangle + downward stem on right
    const bw = NW + 6
    if (style === 'black') {
      fillRect(ctx, x, y, bw, NH)
    } else {
      strokeRect(ctx, x, y, bw, NH, lw)
    }
    stem(ctx, x + bw - 1, y + NH, y + NH + stemLen, lw)

  } else if (type === 'B') {
    // Breve: rectangle, no stem
    if (style === 'black') {
      fillRect(ctx, x, y, NW, NH)
    } else {
      strokeRect(ctx, x, y, NW, NH, lw)
    }

  } else if (type === 'S') {
    // Semibreve: diamond, no stem
    const cx = x + DW / 2, cy = y + DH / 2
    if (style === 'black') {
      fillDiamond(ctx, cx, cy, DW / 2, DH / 2)
    } else {
      strokeDiamond(ctx, cx, cy, DW / 2, DH / 2, lw)
    }

  } else if (type === 'M') {
    // Minim: diamond + upward stem from top vertex
    const cx = x + DW / 2, cy = y + DH / 2
    if (style === 'black') {
      fillDiamond(ctx, cx, cy, DW / 2, DH / 2)
    } else {
      strokeDiamond(ctx, cx, cy, DW / 2, DH / 2, lw)
    }
    stem(ctx, cx, cy, cy - DH / 2 - stemLen, lw)
  }
}

// ─── Ligature drawing (integer-snapped) ──────────────────────────────────────
const LW = 14, LH = 10, LSP = LH / 2, LTAIL = 34

function layoutLigSpec(spec) {
  const notes = spec.notes, n = notes.length
  const oblFirst = new Set((spec.obliquePairs || []).map(p => p[0]))
  const rawY = [0]
  for (let i = 1; i < n; i++) rawY.push(rawY[i - 1] + notes[i].dy * LSP)
  const minY = Math.min(...rawY)
  const ny = rawY.map(y => y - minY)
  const rawX = [0]
  for (let i = 1; i < n; i++)
    rawX.push(oblFirst.has(i - 1) ? rawX[i - 1] + LW + 10 : rawX[i - 1] + LW)
  return { rawX, ny, noteW: rawX[n - 1] + LW, minY, maxY: Math.max(...rawY) }
}

function drawLigSpec(ctx, spec, xOff, yOff, color) {
  const notes = spec.notes, n = notes.length
  const oblFirst  = new Set((spec.obliquePairs || []).map(p => p[0]))
  const oblSecond = new Set((spec.obliquePairs || []).map(p => p[1]))
  const { rawX, ny } = layoutLigSpec(spec)
  const NX = i => px(xOff + rawX[i])
  const NY = i => px(yOff + ny[i])

  ctx.fillStyle = color || '#1a1108'
  ctx.strokeStyle = color || '#1a1108'

  const conn = (x, ya, yb) => {
    const t = Math.min(ya, yb), b = Math.max(ya, yb) + LH
    ctx.fillRect(px(x), px(t), 1, px(b - t))
  }

  for (let i = 0; i < n; i++) {
    const x = NX(i), y = NY(i)
    if (oblFirst.has(i)) {
      // Oblique parallelogram — all corners integer-snapped
      const x2 = px(NX(i + 1) + LW), y2 = NY(i + 1)
      ctx.beginPath()
      ctx.moveTo(x,  y)
      ctx.lineTo(x,  y + LH)
      ctx.lineTo(x2, y2 + LH)
      ctx.lineTo(x2, y2)
      ctx.closePath()
      ctx.fill()
      if (i > 0 && !oblFirst.has(i - 1) && !oblSecond.has(i - 1)) conn(x, NY(i - 1), y)
      if (i + 2 < n && !oblFirst.has(i + 1)) conn(x2, y2, NY(i + 2))
    } else if (!oblSecond.has(i)) {
      ctx.fillRect(x, y, LW, LH)
      if (i > 0 && !oblFirst.has(i - 1) && !oblSecond.has(i - 1)) conn(x, NY(i - 1), y)
    }
  }

  if (spec.upStemFirst) {
    ctx.fillRect(NX(0), NY(0) - 28, 1, 28)
  }
  if (spec.downStemFirstLeft) {
    ctx.fillRect(NX(0), NY(0), 1, LTAIL)
  }
  if (spec.downStemLastRight) {
    ctx.fillRect(NX(n - 1) + LW - 1, NY(n - 1), 1, LTAIL)
  }
}

function drawLigatures(canvas, specs, colors) {
  if (!Array.isArray(specs)) specs = [specs]
  const layouts = specs.map(layoutLigSpec)
  const allMinY = Math.min(...layouts.map(l => l.minY))
  const allMaxY = Math.max(...layouts.map(l => l.maxY))
  const noteRange = allMaxY - allMinY
  const PT = 6 * LSP, PB = LTAIL + 12, PL = 10, GAP = 16
  const totalNoteW = layouts.reduce((s, l) => s + l.noteW, 0) + GAP * (specs.length - 1)
  const cw = totalNoteW + PL * 2
  const ch = noteRange + LH + PT + PB

  canvas.width  = px(cw * SCALE)
  canvas.height = px(ch * SCALE)
  canvas.style.width  = cw + 'px'
  canvas.style.height = ch + 'px'

  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)

  // Staff lines
  const staffMid = PT + Math.round(noteRange / (2 * LSP)) * LSP + LSP
  const staffTop = Math.round((staffMid - 2 * LH) / LSP) * LSP
  ctx.strokeStyle = 'rgba(100,80,20,0.22)'
  ctx.lineWidth = 0.5
  for (let k = 0; k <= 4; k++) {
    const sy = spx(staffTop + k * LH)
    ctx.beginPath(); ctx.moveTo(PL - 6, sy); ctx.lineTo(PL + totalNoteW + 6, sy); ctx.stroke()
  }

  let curX = PL
  specs.forEach((spec, si) => {
    const yOff = PT + (layouts[si].minY - allMinY)
    drawLigSpec(ctx, spec, curX, yOff, colors ? colors[si] : null)
    curX += layouts[si].noteW + GAP
  })
}

// ─── Decoration drawers ───────────────────────────────────────────────────────

function drawLigaturaDecor(canvas) {
  drawLigatures(canvas, [
    { notes: [{ dy: 0 }, { dy: 2 }, { dy: -1 }] },
    { notes: [{ dy: 0 }, { dy: 3 }], obliquePairs: [[0, 1]] },
    { notes: [{ dy: 0 }, { dy: -2 }], upStemFirst: true },
    { notes: [{ dy: 0 }, { dy: 2 }, { dy: 2 }, { dy: -1 }], downStemFirstLeft: true },
  ])
}

function drawMensuraDecor(canvas) {
  // Show L B S M in black mensural style on a staff
  const noteTypes = ['L', 'B', 'S', 'M']
  const spacing = 38
  const cw = spacing * noteTypes.length + 20
  const ch = 100

  canvas.width  = px(cw * SCALE)
  canvas.height = px(ch * SCALE)
  canvas.style.width  = cw + 'px'
  canvas.style.height = ch + 'px'

  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)

  // Staff
  const staffTop = 18
  ctx.strokeStyle = 'rgba(100,80,20,0.22)'
  ctx.lineWidth = 0.5
  for (let k = 0; k <= 4; k++) {
    const sy = spx(staffTop + k * LH)
    ctx.beginPath(); ctx.moveTo(6, sy); ctx.lineTo(cw - 6, sy); ctx.stroke()
  }

  ctx.fillStyle = '#1a1108'
  ctx.strokeStyle = '#1a1108'

  const noteY = staffTop + LH  // sit on second line from top
  noteTypes.forEach((type, i) => {
    const x = 14 + i * spacing
    drawNote(ctx, type, x, noteY, 'black', '#1a1108')
  })

  // Labels
  ctx.fillStyle = 'rgba(100,80,20,0.55)'
  ctx.font = `${7 * SCALE / SCALE}px "Crimson Pro", Georgia, serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  noteTypes.forEach((type, i) => {
    const cx = 14 + i * spacing + (type === 'L' ? (NW + 6) / 2 : DW / 2)
    ctx.fillText(type, cx, noteY + NH + 12)
  })
}

function drawSignaDecor(canvas) {
  // Draw the four mensuration signs using canvas paths — all consistent
  const signs = [
    { label: 'O',  circle: true,  dot: false, open: false },
    { label: 'O·', circle: true,  dot: true,  open: false },
    { label: 'C',  circle: false, dot: false, open: true  },
    { label: 'C·', circle: false, dot: true,  open: true  },
  ]
  const spacing = 46
  const cw = spacing * signs.length + 10
  const ch = 100

  canvas.width  = px(cw * SCALE)
  canvas.height = px(ch * SCALE)
  canvas.style.width  = cw + 'px'
  canvas.style.height = ch + 'px'

  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)

  // Staff
  const staffTop = 14
  ctx.strokeStyle = 'rgba(100,80,20,0.22)'
  ctx.lineWidth = 0.5
  for (let k = 0; k <= 4; k++) {
    const sy = spx(staffTop + k * LH)
    ctx.beginPath(); ctx.moveTo(4, sy); ctx.lineTo(cw - 4, sy); ctx.stroke()
  }

  const cy = staffTop + LH * 2  // centre vertically on staff
  const r  = LH * 1.3           // radius of circle/C

  ctx.strokeStyle = '#1a1108'
  ctx.fillStyle   = '#1a1108'
  ctx.lineWidth   = 1.5

  signs.forEach((sign, i) => {
    const cx = px(12 + i * spacing + spacing / 2)

    if (sign.open) {
      // C shape: arc from ~40° to ~320° (leaves a gap on the right)
      ctx.beginPath()
      ctx.arc(px(cx), px(cy), r, 0.7, 2 * Math.PI - 0.7, false)
      ctx.stroke()
    } else {
      // Full circle
      ctx.beginPath()
      ctx.arc(px(cx), px(cy), r, 0, 2 * Math.PI)
      ctx.stroke()
    }

    if (sign.dot) {
      // Small filled dot in centre
      ctx.beginPath()
      ctx.arc(px(cx), px(cy), 1.8, 0, 2 * Math.PI)
      ctx.fill()
    }
  })

  // Labels
  ctx.fillStyle = 'rgba(100,80,20,0.55)'
  ctx.font = `7px "Crimson Pro", Georgia, serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  signs.forEach((sign, i) => {
    const cx = px(12 + i * spacing + spacing / 2)
    ctx.fillText(sign.label, cx, staffTop + LH * 4 + LH + 4)
  })
}

function drawColoresDecor(canvas) {
  // Show same ligature sequence in three colorations:
  // black filled, black hollow (white notation), red hollow
  const spec = { notes: [{ dy: 0 }, { dy: 2 }, { dy: -1 }] }

  const variants = [
    { color: '#1a1108', hollow: false, label: 'Black' },
    { color: '#1a1108', hollow: true,  label: 'White' },
    { color: '#8b1a1a', hollow: false, label: 'Red'   },
  ]

  const layouts = [layoutLigSpec(spec)]
  const lw = layouts[0].noteW
  const GAP = 20
  const totalNoteW = lw * variants.length + GAP * (variants.length - 1)
  const allMinY = layouts[0].minY
  const allMaxY = layouts[0].maxY
  const noteRange = allMaxY - allMinY
  const PT = 6 * LSP, PB = LTAIL + 12, PL = 10
  const cw = totalNoteW + PL * 2
  const ch = noteRange + LH + PT + PB

  canvas.width  = px(cw * SCALE)
  canvas.height = px(ch * SCALE)
  canvas.style.width  = cw + 'px'
  canvas.style.height = ch + 'px'

  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)

  // Staff
  const staffMid = PT + Math.round(noteRange / (2 * LSP)) * LSP + LSP
  const staffTop = Math.round((staffMid - 2 * LH) / LSP) * LSP
  ctx.strokeStyle = 'rgba(100,80,20,0.22)'
  ctx.lineWidth = 0.5
  for (let k = 0; k <= 4; k++) {
    const sy = spx(staffTop + k * LH)
    ctx.beginPath(); ctx.moveTo(PL - 6, sy); ctx.lineTo(PL + totalNoteW + 6, sy); ctx.stroke()
  }

  let curX = PL
  variants.forEach(({ color, hollow }) => {
    const yOff = PT + (layouts[0].minY - allMinY)
    const notes = spec.notes, n = notes.length
    const { rawX, ny } = layouts[0]
    const NX = i => px(curX + rawX[i])
    const NY = i => px(yOff + ny[i])
    const oblFirst  = new Set((spec.obliquePairs || []).map(p => p[0]))
    const oblSecond = new Set((spec.obliquePairs || []).map(p => p[1]))
    const strokeLW = 1.2

    ctx.fillStyle   = color
    ctx.strokeStyle = color

    const connFill = (x, ya, yb) => {
      const t = Math.min(ya, yb), b = Math.max(ya, yb) + LH
      if (hollow) {
        ctx.lineWidth = strokeLW
        ctx.beginPath(); ctx.moveTo(spx(x), px(t)); ctx.lineTo(spx(x), px(b)); ctx.stroke()
      } else {
        ctx.fillRect(px(x), px(t), 1, px(b - t))
      }
    }

    for (let i = 0; i < n; i++) {
      const x = NX(i), y = NY(i)
      if (oblFirst.has(i)) {
        const x2 = px(NX(i + 1) + LW), y2 = NY(i + 1)
        ctx.lineWidth = strokeLW
        ctx.beginPath()
        ctx.moveTo(x,  y)
        ctx.lineTo(x,  y + LH)
        ctx.lineTo(x2, y2 + LH)
        ctx.lineTo(x2, y2)
        ctx.closePath()
        if (hollow) ctx.stroke(); else ctx.fill()
        if (i > 0 && !oblFirst.has(i - 1) && !oblSecond.has(i - 1)) connFill(x, NY(i - 1), y)
        if (i + 2 < n && !oblFirst.has(i + 1)) connFill(x2, y2, NY(i + 2))
      } else if (!oblSecond.has(i)) {
        if (hollow) {
          ctx.lineWidth = strokeLW
          ctx.strokeRect(spx(x), spx(y), px(LW), px(LH))
        } else {
          ctx.fillRect(px(x), px(y), px(LW), px(LH))
        }
        if (i > 0 && !oblFirst.has(i - 1) && !oblSecond.has(i - 1)) connFill(x, NY(i - 1), y)
      }
    }

    curX += lw + GAP
  })

  // Labels
  ctx.fillStyle = 'rgba(100,80,20,0.55)'
  ctx.font = `7px "Crimson Pro", Georgia, serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  curX = PL
  variants.forEach(({ label }) => {
    ctx.fillText(label, px(curX + lw / 2), px(ch - 12))
    curX += lw + GAP
  })
}

// ─── Card component ───────────────────────────────────────────────────────────
function AppCard({ title, subtitle, desc, accentColor, drawFn, onClick }) {
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
      title: 'Ligatura',
      subtitle: 'Ligature Reading',
      desc: 'Identify the rhythmic values of ligatures — box, oblique, and their modifications.',
      accentColor: '#a07820',
      drawFn: drawLigaturaDecor,
      path: '/ligatura',
    },
    {
      title: 'Mensura',
      subtitle: 'Imperfection & Alteration',
      desc: 'Determine actual note durations when imperfection, alteration, and modification rules apply.',
      accentColor: '#7a2a2a',
      drawFn: drawMensuraDecor,
      path: '/mensura',
    },
    {
      title: 'Signa',
      subtitle: 'Mensuration Signs',
      desc: 'Read and interpret the four mensuration signs governing tempus and prolation.',
      accentColor: '#2a5c6a',
      drawFn: drawSignaDecor,
      path: '/signa',
    },
    {
      title: 'Colores',
      subtitle: 'Coloration',
      desc: 'Recognize black, white, and red notation and calculate their effect on note values.',
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
            <AppCard key={card.title} {...card} onClick={() => navigate(card.path)} />
          ))}
        </div>

        <footer className="home-footer">
          <span>Ars Nova · Ars Antiqua · Trecento</span>
        </footer>
      </div>
    </div>
  )
}