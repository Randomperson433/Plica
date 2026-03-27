import { useNavigate } from 'react-router-dom'
import './stub.css'

export default function Colores() {
  const navigate = useNavigate()
  return (
    <div className="stub-root">
      <div className="stub-container">
        <button className="stub-back" onClick={() => navigate('/')}>← Plica</button>
        <div className="stub-content">
          <div className="stub-decor">
            <span style={{ color: '#1a1108' }}>■</span>
            {' · '}
            <span style={{ color: '#8b1a1a' }}>■</span>
            {' · '}
            <span style={{ color: '#8b1a1a', WebkitTextStroke: '1px #8b1a1a', WebkitTextFillColor: 'transparent' }}>□</span>
          </div>
          <h1 className="stub-title">Colores</h1>
          <p className="stub-subtitle">Coloration</p>
          <p className="stub-body">
            This exercise will teach you to recognize black, red, and void
            notation and calculate how coloration alters note values —
            typically reducing them by a third, but with important exceptions.
          </p>
          <div className="stub-badge">Coming Soon</div>
        </div>
      </div>
    </div>
  )
}
