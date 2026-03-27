import { useState, useEffect, useRef, useCallback } from 'react'
import './ligatura.css'


// ─── Canvas renderer ──────────────────────────────────────────────────────────
const W = 16, H = 12, SP = H / 2, STEP = SP, TAIL = 44, SCALE = 2

function layoutSpec(spec) {
  const notes = spec.notes, n = notes.length
  const oblFirst = new Set((spec.obliquePairs || []).map(p => p[0]))
  const rawY = [0]
  for (let i = 1; i < n; i++) rawY.push(rawY[i - 1] + notes[i].dy * STEP)
  const minY = Math.min(...rawY)
  const ny = rawY.map(y => y - minY)
  const rawX = [0]
  for (let i = 1; i < n; i++)
    rawX.push(oblFirst.has(i - 1) ? rawX[i - 1] + W + 12 : rawX[i - 1] + W)
  return { rawX, ny, noteW: rawX[n - 1] + W, minY, maxY: Math.max(...rawY) }
}

function drawSpec(ctx, spec, xOff, yOff) {
  const notes = spec.notes, n = notes.length
  const oblFirst  = new Set((spec.obliquePairs || []).map(p => p[0]))
  const oblSecond = new Set((spec.obliquePairs || []).map(p => p[1]))
  const { rawX, ny } = layoutSpec(spec)
  const NX = i => xOff + rawX[i]
  const NY = i => yOff + ny[i]
  const conn = (x, ya, yb) => { const t = Math.min(ya,yb), b = Math.max(ya,yb)+H; ctx.fillRect(x,t,1,b-t) }
  ctx.fillStyle = '#1a1108'
  for (let i = 0; i < n; i++) {
    const x = NX(i), y = NY(i)
    if (oblFirst.has(i)) {
      const x2 = NX(i+1)+W, y2 = NY(i+1)
      ctx.beginPath()
      ctx.moveTo(x,y); ctx.lineTo(x,y+H); ctx.lineTo(x2,y2+H); ctx.lineTo(x2,y2)
      ctx.closePath(); ctx.fill()
      if (i > 0 && !oblFirst.has(i-1) && !oblSecond.has(i-1)) conn(x, NY(i-1), y)
      if (i+2 < n && !oblFirst.has(i+1)) conn(x2, y2, NY(i+2))
    } else if (!oblSecond.has(i)) {
      ctx.fillRect(x, y, W, H)
      if (i > 0 && !oblFirst.has(i-1) && !oblSecond.has(i-1)) conn(x, NY(i-1), y)
    }
  }
  if (spec.upStemFirst)       ctx.fillRect(NX(0),       NY(0)-38, 1, 38)
  if (spec.downStemFirstLeft) ctx.fillRect(NX(0),       NY(0),    1, TAIL)
  if (spec.downStemLastRight) ctx.fillRect(NX(n-1)+W-1, NY(n-1),  1, TAIL)
}

function renderToCanvas(canvas, specs) {
  if (!Array.isArray(specs)) specs = [specs]
  const layouts = specs.map(layoutSpec)
  const allMinY = Math.min(...layouts.map(l => l.minY))
  const allMaxY = Math.max(...layouts.map(l => l.maxY))
  const noteRange = allMaxY - allMinY
  const PT = 7*SP, PB = TAIL+14, PL = 14, GAP = 20
  const totalNoteW = layouts.reduce((s,l) => s+l.noteW, 0) + GAP*(specs.length-1)
  const cw = totalNoteW + PL + 14
  const ch = noteRange + H + PT + PB
  canvas.width  = cw * SCALE; canvas.height = ch * SCALE
  canvas.style.width = cw+'px'; canvas.style.height = ch+'px'
  const ctx = canvas.getContext('2d')
  ctx.scale(SCALE, SCALE)
  const staffMid = PT + Math.round(noteRange/(2*SP))*SP + SP
  const staffTop = Math.round((staffMid - 2*H) / SP) * SP
  ctx.strokeStyle = 'rgba(100,80,20,0.30)'; ctx.lineWidth = 0.7
  for (let k = 0; k <= 4; k++) {
    const sy = staffTop + k*H + 0.35
    ctx.beginPath(); ctx.moveTo(PL-18, sy); ctx.lineTo(PL+totalNoteW+18, sy); ctx.stroke()
  }
  let curX = PL
  specs.forEach((spec, si) => {
    drawSpec(ctx, spec, curX, PT + (layouts[si].minY - allMinY))
    curX += layouts[si].noteW + GAP
  })
}

// ─── Answer computation ───────────────────────────────────────────────────────
function computeAnswer(spec) {
  const notes = spec.notes, n = notes.length
  const oblFirst  = new Set((spec.obliquePairs||[]).map(p=>p[0]))
  const oblSecond = new Set((spec.obliquePairs||[]).map(p=>p[1]))
  const result = new Array(n).fill('B')
  if (spec.upStemFirst) {
    result[0]='S'; result[1]='S'
    if (n>2 && !oblSecond.has(n-1)) result[n-1] = lastVal(n-1)
    return result.join('')
  }
  if (oblFirst.has(0)) {
    result[0] = spec.downStemFirstLeft ? 'B' : 'L'
    result[1] = 'B'
  } else {
    const def = notes[1].dy > 0 ? 'L' : 'B'
    result[0] = spec.downStemFirstLeft ? (def==='L' ? 'B' : 'L') : def
  }
  if (n>1 && !oblSecond.has(n-1)) result[n-1] = lastVal(n-1)
  return result.join('')
  function lastVal(i) {
    if (spec.downStemLastRight) return 'L'
    return notes[i].dy > 0 ? 'L' : 'B'
  }
}

// ─── Random generation ────────────────────────────────────────────────────────
function rInt(a,b){ return Math.floor(Math.random()*(b-a+1))+a }
function pick(arr){ return arr[Math.floor(Math.random()*arr.length)] }

function generateLigature(complexity) {
  const minN = complexity==='easy'?2:complexity==='medium'?3:4
  const maxN = complexity==='easy'?3:complexity==='medium'?5:7
  const n = rInt(minN, maxN)
  const notes = [{dy:0}]
  for (let i=1;i<n;i++) { let dy; do{dy=pick([-3,-2,-1,1,2,3])}while(dy===0); notes.push({dy}) }
  let obliquePairs = []
  if (Math.random()<0.4 && n>=3) {
    const ms = n-3
    if (ms>=0) { const s=rInt(0,ms); obliquePairs=[[s,s+1]] }
  }
  const oblFS = new Set(obliquePairs.map(p=>p[0]))
  const oblSS = new Set(obliquePairs.map(p=>p[1]))
  let upStemFirst=false, downStemFirstLeft=false, downStemLastRight=false
  const roll = Math.random()
  if (roll<0.25) upStemFirst=true
  else if (roll<0.45) downStemFirstLeft=true
  else if (roll<0.58 && !oblSS.has(n-1) && notes[n-1].dy<0) downStemLastRight=true
  const spec = {notes,obliquePairs,upStemFirst,downStemFirstLeft,downStemLastRight}
  const answer = computeAnswer(spec)
  const parts = []
  if (upStemFirst) parts.push('upward stem → S S')
  else if (downStemFirstLeft) parts.push(oblFS.has(0)?'oblique + left tail → B':notes[1].dy>0?'desc box + left tail → B':'asc box + left tail → L')
  else parts.push(oblFS.has(0)?'oblique → first L':notes[1].dy>0?'desc first → L':'asc first → B')
  for (let i=1;i<n-1;i++) parts.push('middle → B')
  if (n>1) {
    if (upStemFirst&&n===2){}
    else if (oblSS.has(n-1)) parts.push('oblique second → B')
    else if (downStemLastRight) parts.push('asc last + right tail → L')
    else parts.push(notes[n-1].dy>0?'desc last → L':'asc last → B')
  }
  const hint = upStemFirst?'There is an upward stem — special rule applies to the first two notes.'
    :downStemFirstLeft?'There is a left downward tail on the first note.'
    :downStemLastRight?'There is a right downward tail on the last note.'
    :'Apply the first-note and last-note rules; middles are automatic.'
  return {
    difficulty: complexity==='easy'?'Random·Easy':complexity==='medium'?'Random·Medium':'Random·Hard',
    hint, ligs:[spec], answers:[answer],
    explanation:'<strong>'+answer+'.</strong> '+parts.join('; ')+'.'
  }
}

function generateRandomQuestion(idx) {
  const tier = idx<5?'easy':idx<10?'medium':'hard'
  if (tier==='easy') return generateLigature('easy')
  if (tier==='medium') {
    const count=rInt(1,2), ligs=[], answers=[], expParts=[], labels=['i','ii']
    for (let k=0;k<count;k++) {
      const q=generateLigature('medium')
      ligs.push(q.ligs[0]); answers.push(q.answers[0])
      expParts.push((count>1?`<strong>${labels[k]}:</strong> `:'')+q.explanation.replace(/<\/?strong>/g,''))
    }
    return { difficulty:'Random·Medium', hint:count>1?'2 ligatures. Type both answers separated by a space.':'Apply the rules — first note, last note, middles.',
      ligs, multiLabel:count>1?labels.slice(0,count):undefined, answers:[answers.join(' ')], explanation:expParts.join('<br>') }
  }
  const count=rInt(2,3), ligs=[], answers=[], expParts=[], labels=['i','ii','iii']
  for (let k=0;k<count;k++) {
    const q=generateLigature('hard')
    ligs.push(q.ligs[0]); answers.push(q.answers[0])
    expParts.push(`<strong>${labels[k]}:</strong> `+q.explanation.replace(/<\/?strong>/g,''))
  }
  return { difficulty:'Random·Hard', hint:`${count} ligatures. Type all answers separated by spaces.`,
    ligs, multiLabel:labels.slice(0,count), answers:[answers.join(' ')], explanation:expParts.join('<br>') }
}

// ─── Question banks ───────────────────────────────────────────────────────────
const EASY_QUESTIONS = [
  { difficulty:'Simple', hint:'Plain descending box — no modifiers.',
    ligs:[{notes:[{dy:0},{dy:2}]}], answers:['LL'],
    explanation:'<strong>L L.</strong> Box descending: first note descends → L; last note descends → L.' },
  { difficulty:'Simple', hint:'Plain ascending box — no modifiers.',
    ligs:[{notes:[{dy:0},{dy:-2}]}], answers:['BB'],
    explanation:'<strong>B B.</strong> Box ascending: first note ascends → B; last note ascends → B.' },
  { difficulty:'Simple', hint:'Oblique ligature — direction does not change the default.',
    ligs:[{notes:[{dy:0},{dy:2}],obliquePairs:[[0,1]]}], answers:['LB'],
    explanation:'<strong>L B.</strong> Oblique: always L B by default, regardless of direction.' },
  { difficulty:'Simple', hint:'Ascending oblique — same rule as descending.',
    ligs:[{notes:[{dy:0},{dy:-3}],obliquePairs:[[0,1]]}], answers:['LB'],
    explanation:'<strong>L B.</strong> Oblique ascending: still L B. Direction is irrelevant.' },
  { difficulty:'Moderate', hint:'There is a tail on the right side of the last note.',
    ligs:[{notes:[{dy:0},{dy:-2}],downStemLastRight:true}], answers:['BL'],
    explanation:'<strong>B L.</strong> Box ascending default B B; right tail on last note overrides → L.' },
  { difficulty:'Moderate', hint:'There is a tail on the left side of the first note.',
    ligs:[{notes:[{dy:0},{dy:2}],downStemFirstLeft:true}], answers:['BL'],
    explanation:'<strong>B L.</strong> Box descending default L L; left tail on first flips it → B.' },
  { difficulty:'Moderate', hint:'Ascending box with a left tail on the first note — podatus form.',
    ligs:[{notes:[{dy:0},{dy:-2}],downStemFirstLeft:true}], answers:['LB'],
    explanation:'<strong>L B.</strong> Box ascending default B B; left tail on first flips it → L. This is the podatus.' },
  { difficulty:'Moderate', hint:'Oblique with a left tail on the first note.',
    ligs:[{notes:[{dy:0},{dy:3}],obliquePairs:[[0,1]],downStemFirstLeft:true}], answers:['BB'],
    explanation:'<strong>B B.</strong> Oblique default L B; left tail flips first → B.' },
  { difficulty:'Moderate', hint:'The stem on the left points upward.',
    ligs:[{notes:[{dy:0},{dy:-2}],upStemFirst:true}], answers:['SS'],
    explanation:'<strong>S S.</strong> Upward stem: both notes are Semibreves.' },
  { difficulty:'Moderate', hint:'Three notes. Apply first-note rule, last-note rule, then fill the middle.',
    ligs:[{notes:[{dy:0},{dy:2},{dy:-2}]}], answers:['LBB'],
    explanation:'<strong>L B B.</strong> Desc first → L; asc last → B; middle → B.' },
  { difficulty:'Moderate', hint:'Three notes, all descending.',
    ligs:[{notes:[{dy:0},{dy:2},{dy:2}]}], answers:['LBL'],
    explanation:'<strong>L B L.</strong> Desc first → L; desc last → L; middle → B.' },
  { difficulty:'Tricky', hint:'Four notes. First-note rule, last-note rule, middles automatic.',
    ligs:[{notes:[{dy:0},{dy:2},{dy:-1},{dy:2}]}], answers:['LBBL'],
    explanation:'<strong>L B B L.</strong> Desc first → L; desc last → L; two middles → B B.' },
  { difficulty:'Tricky', hint:'Three notes with a left tail on the first.',
    ligs:[{notes:[{dy:0},{dy:2},{dy:-2}],downStemFirstLeft:true}], answers:['BBB'],
    explanation:'<strong>B B B.</strong> Desc first default L; left tail flips → B; asc last → B; middle → B.' },
]

const MEDIUM_QUESTIONS = [
  { difficulty:'Hard', hint:'Upward stem covers only the first two notes.',
    ligs:[{notes:[{dy:0},{dy:-2},{dy:-2}],upStemFirst:true}], answers:['SSB'],
    explanation:'<strong>S S B.</strong> Upward stem → S S; last note ascends → B.' },
  { difficulty:'Hard', hint:'Oblique pair at the start, then two more box notes.',
    ligs:[{notes:[{dy:0},{dy:3},{dy:2},{dy:-2}],obliquePairs:[[0,1]]}], answers:['LBBB'],
    explanation:'<strong>L B B B.</strong> Oblique → first L; two middles → B B; asc last → B.' },
  { difficulty:'Hard', hint:'Left tail on the first note, right tail on the last.',
    ligs:[{notes:[{dy:0},{dy:2},{dy:-1},{dy:-2}],downStemFirstLeft:true,downStemLastRight:true}], answers:['BBBL'],
    explanation:'<strong>B B B L.</strong> Desc first default L; left tail → B; two middles → B B; asc last + right tail → L.' },
  { difficulty:'Hard', hint:'Five notes with an upward stem on the first.',
    ligs:[{notes:[{dy:0},{dy:-2},{dy:1},{dy:-2},{dy:1}],upStemFirst:true}], answers:['SSBBL'],
    explanation:'<strong>S S B B L.</strong> Upward stem → S S; two middles → B B; desc last → L.' },
  { difficulty:'Hard', hint:'Oblique start, then two box notes.',
    ligs:[{notes:[{dy:0},{dy:3},{dy:-2},{dy:2}],obliquePairs:[[0,1]]}], answers:['LBBL'],
    explanation:'<strong>L B B L.</strong> Oblique → first L; middle → B; desc last → L.' },
  { difficulty:'Hard', hint:'Oblique with left tail, followed by one box note.',
    ligs:[{notes:[{dy:0},{dy:3},{dy:-2}],obliquePairs:[[0,1]],downStemFirstLeft:true}], answers:['BBB'],
    explanation:'<strong>B B B.</strong> Oblique + left tail → B; middle → B; asc last → B.' },
  { difficulty:'Hard', hint:'Upward stem, oblique pair in the middle, one final note.',
    ligs:[{notes:[{dy:0},{dy:-2},{dy:2},{dy:3},{dy:1}],upStemFirst:true,obliquePairs:[[2,3]]}], answers:['SSBBL'],
    explanation:'<strong>S S B B L.</strong> Upward stem → S S; oblique middle → B B; desc last → L.' },
  { difficulty:'Hard', hint:'Two ligatures. Type both answers separated by a space.',
    ligs:[{notes:[{dy:0},{dy:2}]},{notes:[{dy:0},{dy:-2}],downStemLastRight:true}],
    multiLabel:['i','ii'], answers:['LL BL'],
    explanation:'<strong>i: L L.</strong> Box desc → L L.&nbsp; <strong>ii: B L.</strong> Box asc + right tail → B L.' },
  { difficulty:'Hard', hint:'Two ligatures. Type both separated by a space.',
    ligs:[{notes:[{dy:0},{dy:3}],obliquePairs:[[0,1]],downStemFirstLeft:true},{notes:[{dy:0},{dy:2},{dy:-2}]}],
    multiLabel:['i','ii'], answers:['BB LBB'],
    explanation:'<strong>i: B B.</strong> Oblique + left tail → B B.&nbsp; <strong>ii: L B B.</strong> Desc first → L; asc last → B; middle → B.' },
  { difficulty:'Very Hard', hint:'Five notes: upward stem, then three box notes.',
    ligs:[{notes:[{dy:0},{dy:-2},{dy:2},{dy:-1},{dy:2}],upStemFirst:true}], answers:['SSBBL'],
    explanation:'<strong>S S B B L.</strong> Upward stem → S S; two middles → B B; desc last → L.' },
  { difficulty:'Very Hard', hint:'Three ligatures. Type all three separated by spaces.',
    ligs:[{notes:[{dy:0},{dy:-2}],upStemFirst:true},{notes:[{dy:0},{dy:2},{dy:-2}],downStemFirstLeft:true},{notes:[{dy:0},{dy:2}],obliquePairs:[[0,1]]}],
    multiLabel:['i','ii','iii'], answers:['SS BBB LB'],
    explanation:'<strong>i: S S.</strong> Upward stem.&nbsp; <strong>ii: B B B.</strong> Desc + left tail → B; asc last → B; middle → B.&nbsp; <strong>iii: L B.</strong> Oblique default.' },
  { difficulty:'Very Hard', hint:'Six notes. There is a right tail on the last note.',
    ligs:[{notes:[{dy:0},{dy:2},{dy:2},{dy:-1},{dy:2},{dy:-2}],downStemLastRight:true}], answers:['LBBBBL'],
    explanation:'<strong>L B B B B L.</strong> Desc first → L; four middles → B B B B; asc last + right tail → L.' },
]

const HARD_QUESTIONS = [
  { difficulty:'Expert', hint:'Four ligatures. Type all four answers separated by spaces.',
    ligs:[{notes:[{dy:0},{dy:2}]},{notes:[{dy:0},{dy:-2}],upStemFirst:true},{notes:[{dy:0},{dy:3}],obliquePairs:[[0,1]],downStemFirstLeft:true},{notes:[{dy:0},{dy:2},{dy:-2}],downStemFirstLeft:true}],
    multiLabel:['i','ii','iii','iv'], answers:['LL SS BB BBB'],
    explanation:'<strong>i: L L.</strong> Box desc.&nbsp; <strong>ii: S S.</strong> Upward stem.&nbsp; <strong>iii: B B.</strong> Oblique + left tail.&nbsp; <strong>iv: B B B.</strong> Desc + left tail → B; asc last → B; middle B.' },
  { difficulty:'Expert', hint:'Seven notes. First-note rule, last-note rule, everything else is automatic.',
    ligs:[{notes:[{dy:0},{dy:2},{dy:-1},{dy:2},{dy:-2},{dy:1},{dy:-3}]}], answers:['LBBBBBB'],
    explanation:'<strong>L B B B B B B.</strong> Desc first → L; five middles → B; asc last → B.' },
  { difficulty:'Expert', hint:'Two 4-note ligatures. Type both answers separated by a space.',
    ligs:[{notes:[{dy:0},{dy:2},{dy:2},{dy:-2}],downStemFirstLeft:true},{notes:[{dy:0},{dy:-2},{dy:-1},{dy:2}],upStemFirst:true}],
    multiLabel:['i','ii'], answers:['BBBB SSBL'],
    explanation:'<strong>i: B B B B.</strong> Desc + left tail → B; two middles B; asc last → B.&nbsp; <strong>ii: S S B L.</strong> Upward stem → S S; middle → B; desc last → L.' },
  { difficulty:'Expert', hint:'Six notes. Oblique pair at the start with a left tail, then four box notes.',
    ligs:[{notes:[{dy:0},{dy:3},{dy:2},{dy:-1},{dy:2},{dy:-2}],obliquePairs:[[0,1]],downStemFirstLeft:true}], answers:['BBBBBB'],
    explanation:'<strong>B B B B B B.</strong> Oblique + left tail → B; four middles → B; asc last → B.' },
  { difficulty:'Expert', hint:'Three ligatures, including two long ones. Separate answers with spaces.',
    ligs:[{notes:[{dy:0},{dy:2},{dy:-1},{dy:2}]},{notes:[{dy:0},{dy:-3}],obliquePairs:[[0,1]]},{notes:[{dy:0},{dy:2},{dy:2},{dy:-2}],downStemLastRight:true}],
    multiLabel:['i','ii','iii'], answers:['LBBL LB LBBL'],
    explanation:'<strong>i: L B B L.</strong> Desc first → L; two middles → B; desc last → L.&nbsp; <strong>ii: L B.</strong> Oblique default.&nbsp; <strong>iii: L B B L.</strong> Desc first → L; two middles → B; asc last + right tail → L.' },
  { difficulty:'Expert', hint:'Five notes. Left tail on an ascending first note.',
    ligs:[{notes:[{dy:0},{dy:-2},{dy:2},{dy:2},{dy:-1}],downStemFirstLeft:true}], answers:['LBBBB'],
    explanation:'<strong>L B B B B.</strong> Asc first + left tail → L; three middles → B; asc last → B.' },
  { difficulty:'Expert', hint:'Two long ligatures. Type both answers separated by a space.',
    ligs:[{notes:[{dy:0},{dy:-2},{dy:2},{dy:3},{dy:1}],upStemFirst:true,obliquePairs:[[2,3]]},{notes:[{dy:0},{dy:2},{dy:-2},{dy:2}],downStemFirstLeft:true,downStemLastRight:true}],
    multiLabel:['i','ii'], answers:['SSBBL BBBL'],
    explanation:'<strong>i: S S B B L.</strong> Upward stem → S S; oblique middle → B B; desc last → L.&nbsp; <strong>ii: B B B L.</strong> Desc + left tail → B; two middles → B; asc last + right tail → L.' },
  { difficulty:'Expert', hint:'Four notes. The oblique pair is in the middle.',
    ligs:[{notes:[{dy:0},{dy:2},{dy:-1},{dy:3}],obliquePairs:[[1,2]]}], answers:['LBBL'],
    explanation:'<strong>L B B L.</strong> Desc first → L; oblique middle pair → B B; desc last → L.' },
  { difficulty:'Expert', hint:'Four ligatures — the last one is long. Separate all answers with spaces.',
    ligs:[{notes:[{dy:0},{dy:-2}]},{notes:[{dy:0},{dy:2}],downStemFirstLeft:true},{notes:[{dy:0},{dy:3}],obliquePairs:[[0,1]]},{notes:[{dy:0},{dy:2},{dy:2},{dy:-1},{dy:-2}],downStemLastRight:true}],
    multiLabel:['i','ii','iii','iv'], answers:['BB BL LB LBBBL'],
    explanation:'<strong>i: B B.</strong> Box asc.&nbsp; <strong>ii: B L.</strong> Desc + left tail → B; desc last → L.&nbsp; <strong>iii: L B.</strong> Oblique.&nbsp; <strong>iv: L B B B L.</strong> Desc first → L; three middles → B; asc last + right tail → L.' },
  { difficulty:'Expert', hint:'Six notes. Upward stem, and an oblique pair in the middle.',
    ligs:[{notes:[{dy:0},{dy:-2},{dy:2},{dy:3},{dy:-1},{dy:2}],upStemFirst:true,obliquePairs:[[2,3]]}], answers:['SSBBBL'],
    explanation:'<strong>S S B B B L.</strong> Upward stem → S S; oblique middle → B B; last middle → B; desc last → L.' },
  { difficulty:'Expert', hint:'Two 5-note ligatures. Type both answers separated by a space.',
    ligs:[{notes:[{dy:0},{dy:2},{dy:-1},{dy:2},{dy:-2}]},{notes:[{dy:0},{dy:-2},{dy:2},{dy:2},{dy:1}],downStemFirstLeft:true}],
    multiLabel:['i','ii'], answers:['LBBBB LBBBL'],
    explanation:'<strong>i: L B B B B.</strong> Desc first → L; three middles → B; asc last → B.&nbsp; <strong>ii: L B B B L.</strong> Asc + left tail → L; three middles → B; desc last → L.' },
  { difficulty:'Expert', hint:'Three 4-note ligatures. Separate all answers with spaces.',
    ligs:[{notes:[{dy:0},{dy:2},{dy:2},{dy:2}]},{notes:[{dy:0},{dy:-2},{dy:-1},{dy:-2}],upStemFirst:true},{notes:[{dy:0},{dy:3},{dy:-2},{dy:2}],obliquePairs:[[0,1]],downStemLastRight:true}],
    multiLabel:['i','ii','iii'], answers:['LBBL SSBB LBBL'],
    explanation:'<strong>i: L B B L.</strong> Desc first → L; two middles → B; desc last → L.&nbsp; <strong>ii: S S B B.</strong> Upward stem → S S; middle → B; asc last → B.&nbsp; <strong>iii: L B B L.</strong> Oblique → L; middle → B; asc last + right tail → L.' },
]

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length-1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]] }
  return a
}

const TOTAL_RANDOM = 15
const MODE_META = {
  easy:   { title:'Easy Mode',   subtitle:'Binary & Ternary Ligatures' },
  medium: { title:'Medium Mode', subtitle:'Complex Forms & Sequences' },
  hard:   { title:'Hard Mode',   subtitle:'Expert Forms & Dense Sequences' },
  random: { title:'Random Mode', subtitle:'Procedurally Generated' },
}

// ─── LigatureCanvas ───────────────────────────────────────────────────────────
function LigatureCanvas({ specs }) {
  const ref = useRef(null)
  useEffect(() => { if (ref.current) renderToCanvas(ref.current, specs) }, [specs])
  return <canvas ref={ref} className="lig-canvas" />
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Ligatura() {
  const [screen, setScreen]       = useState('mode')
  const [mode, setMode]           = useState('easy')
  const [questions, setQuestions] = useState([])
  const [current, setCurrent]     = useState(0)
  const [correct, setCorrect]     = useState(0)
  const [streak, setStreak]       = useState(0)
  const [answered, setAnswered]   = useState(false)
  const [inputVal, setInputVal]   = useState('')
  const [inputState, setInputState] = useState('idle')
  const [showHint, setShowHint]   = useState(false)
  const [feedback, setFeedback]   = useState('')
  const [showExp, setShowExp]     = useState(false)
  const [showEnterHint, setShowEnterHint] = useState(false)
  const [results, setResults]     = useState([])  // per-question pip colours
  const inputRef = useRef(null)

  const q     = questions[current]
  const total = mode === 'random' ? TOTAL_RANDOM : questions.length

  const startQuiz = useCallback((m) => {
    let qs
    if (m==='easy')   qs = shuffle([...EASY_QUESTIONS])
    else if (m==='medium') qs = shuffle([...MEDIUM_QUESTIONS])
    else if (m==='hard')   qs = shuffle([...HARD_QUESTIONS])
    else { qs = []; for (let i=0;i<TOTAL_RANDOM;i++) qs.push(generateRandomQuestion(i)) }
    setMode(m); setQuestions(qs); setCurrent(0); setCorrect(0); setStreak(0)
    setAnswered(false); setInputVal(''); setInputState('idle')
    setShowHint(false); setFeedback(''); setShowExp(false); setShowEnterHint(false)
    setResults(new Array(m==='random'?TOTAL_RANDOM:qs.length).fill(null))
    setScreen('quiz')
  }, [])

  // Reset per-question UI when question changes
  useEffect(() => {
    setAnswered(false); setInputVal(''); setInputState('idle')
    setShowHint(false); setFeedback(''); setShowExp(false); setShowEnterHint(false)
    setTimeout(() => inputRef.current?.focus(), 30)
  }, [current, screen])

  const advance = useCallback(() => {
    if (current + 1 >= total) setScreen('summary')
    else setCurrent(c => c + 1)
  }, [current, total])

  // After answering, arm Enter-to-advance: wait for key release then listen for next press
  useEffect(() => {
    if (!answered || screen !== 'quiz') return
    function onKeyup(e) {
      if (e.key !== 'Enter') return
      document.removeEventListener('keyup', onKeyup)
      document.addEventListener('keydown', onKeydown)
    }
    function onKeydown(e) {
      if (e.key !== 'Enter') return
      document.removeEventListener('keydown', onKeydown)
      advance()
    }
    document.addEventListener('keyup', onKeyup)
    return () => {
      document.removeEventListener('keyup', onKeyup)
      document.removeEventListener('keydown', onKeydown)
    }
  }, [answered, screen, advance])

  const submit = useCallback(() => {
    if (answered || !inputVal.trim() || !q) return
    const got  = inputVal.replace(/\s+/g,'').toUpperCase()
    const want = q.answers[0].replace(/\s+/g,'').toUpperCase()
    const ok = got === want
    setAnswered(true)
    setInputState(ok ? 'correct' : 'wrong')
    setShowExp(true); setShowEnterHint(true)
    setResults(r => { const nr=[...r]; nr[current]=ok; return nr })
    if (ok) {
      setCorrect(c => c+1)
      setStreak(s => { const ns=s+1; setFeedback(ns>=3?`Correct! ${ns} in a row ✦`:'Correct!'); return ns })
    } else {
      setStreak(0)
      setFeedback(`Not quite — the answer is ${q.answers[0]}.`)
    }
  }, [answered, inputVal, q, current])

  const handleKeyDown = useCallback((e) => {
    if (e.key==='Enter' && !answered && inputVal.trim()) { e.preventDefault(); submit() }
  }, [answered, inputVal, submit])

  const inputCls = `lig-input${inputState==='correct'?' lig-input-correct':inputState==='wrong'?' lig-input-wrong':''}`
  const meta = MODE_META[mode] || MODE_META.easy
  const MSGS = [[90,'Worthy of Franco of Cologne himself.'],[70,'A fine scribe in the making.'],[50,'The treatises await further study.'],[0,'Return to the scriptorium.']]
  const pct = total > 0 ? Math.round(correct/total*100) : 0

  return (
    <>
      <div className="lig-root">
        <div className="lig-container">

          {/* Mode screen */}
          {screen === 'mode' && (
            <div className="lig-mode-screen">
              <h1>Ligatura</h1>
              <p className="lig-tagline">A quiz in mensural notation</p>
              <div className="lig-mode-cards">
                {[
                  {id:'easy',   cls:'lig-mode-easy',   label:'Easy',   desc:'Binary ligatures and simple three- and four-note forms.',                    count:'13 Questions · Foundations'},
                  {id:'medium', cls:'lig-mode-medium',  label:'Medium', desc:'Long ligatures, semibreve pairs, and sequences of multiple ligatures.',       count:'12 Questions · Complex Forms'},
                  {id:'hard',   cls:'lig-mode-hard',    label:'Hard',   desc:'Dense multi-ligature sequences, rare forms, and ambiguous modifiers.',        count:'12 Questions · Expert'},
                  {id:'random', cls:'lig-mode-random',  label:'Random', desc:'Procedurally generated ligatures — endless practice, never the same twice.',  count:'∞ Questions · Generated'},
                ].map(({id,cls,label,desc,count}) => (
                  <div key={id} className={`lig-mode-card ${cls}`} onClick={() => startQuiz(id)}>
                    <h2>{label}</h2><p>{desc}</p>
                    <span className="lig-mode-count">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quiz screen */}
          {screen === 'quiz' && q && (
            <>
              <header className="lig-header">
                <h1 className="lig-quiz-title">{meta.title}</h1>
                <p className="lig-subtitle">{meta.subtitle}</p>
              </header>
              <div className="lig-scorebar">
                <span className="lig-score-label">Score</span>
                <span className="lig-score-val">{correct} / {answered ? current+1 : current}</span>
                {streak >= 2 && <span className="lig-streak">{streak} streak</span>}
              </div>
              <div className="lig-progress-row">
                {Array.from({length:total},(_,i) => (
                  <div key={i} className={`lig-pip${results[i]===true?' lig-pip-correct':results[i]===false?' lig-pip-wrong':i===current?' lig-pip-current':''}`} />
                ))}
              </div>

              <div className="lig-card" key={current}>
                <div className="lig-difficulty">{q.difficulty}</div>
                <div className="lig-ligature-row">
                  <LigatureCanvas specs={q.ligs} />
                </div>
                <div className="lig-hint-row">
                  <span className="lig-hint-text" style={{opacity: showHint?1:0}}>{q.hint}</span>
                  <button className="lig-btn-hint" disabled={showHint} onClick={() => setShowHint(true)}>Hint</button>
                </div>
                <div className="lig-answer-area">
                  <input
                    ref={inputRef}
                    className={inputCls}
                    type="text"
                    value={inputVal}
                    placeholder={q.ligs.length>1 ? `e.g. ${q.answers[0]}` : 'e.g. LBL'}
                    autoComplete="off"
                    spellCheck={false}
                    disabled={answered}
                    onChange={e => setInputVal(e.target.value)}
                    onKeyDown={handleKeyDown}
                  />
                  <button className="lig-btn" disabled={answered} onClick={submit}>Submit</button>
                </div>
                {feedback && (
                  <div className={`lig-feedback${inputState==='correct'?' lig-feedback-correct':' lig-feedback-wrong'}`}>
                    {feedback}
                  </div>
                )}
                {showExp && <div className="lig-explanation" dangerouslySetInnerHTML={{__html: q.explanation}} />}
                {answered && (
                  <button className="lig-btn-next" onClick={advance}>
                    {current < total-1 ? 'Next →' : 'See Results'}
                  </button>
                )}
                {showEnterHint && <div className="lig-enter-hint">Press Enter to continue</div>}
              </div>
            </>
          )}

          {/* Summary screen */}
          {screen === 'summary' && (
            <div className="lig-card lig-summary">
              <div className="lig-summary-title">Finis</div>
              <div className="lig-summary-score">{correct} / {total}</div>
              <div className="lig-summary-sub">
                {pct}% — {MSGS.find(([t]) => pct >= t)[1]}
              </div>
              <div className="lig-summary-btns">
                <button className="lig-btn-again" onClick={() => startQuiz(mode)}>Try Again</button>
                <button className="lig-btn" onClick={() => setScreen('mode')}>Change Mode</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}