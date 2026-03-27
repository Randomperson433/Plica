import { useNavigate } from 'react-router-dom'
import './stub.css'

export default function Signa() {
  const navigate = useNavigate()
  return (
    <div className="stub-root">
      <div className="stub-container">
        <button className="stub-back" onClick={() => navigate('/')}>← Plica</button>
        <div className="stub-content">
          <div className="stub-decor stub-decor-signa">○ · C · 𝇋 · 𝇌</div>
          <h1 className="stub-title">Signa</h1>
          <p className="stub-subtitle">Mensuration Signs</p>
          <p className="stub-body">
            This exercise will drill the four mensuration signs and what
            they indicate about tempus and prolation — perfect and imperfect,
            major and minor, and their combinations.
          </p>
          <div className="stub-badge">Coming Soon</div>
        </div>
      </div>
    </div>
  )
}
