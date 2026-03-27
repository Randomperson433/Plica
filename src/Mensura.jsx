import { useNavigate } from 'react-router-dom'
import './stub.css'

export default function Mensura() {
  const navigate = useNavigate()
  return (
    <div className="stub-root">
      <div className="stub-container">
        <button className="stub-back" onClick={() => navigate('/')}>← Plica</button>
        <div className="stub-content">
          <div className="stub-decor">L · B · S · M</div>
          <h1 className="stub-title">Mensura</h1>
          <p className="stub-subtitle">Imperfection &amp; Alteration</p>
          <p className="stub-body">
            This exercise will train you to determine actual note durations
            in mensural notation — when a breve imperfects a long, when a
            semibreve is altered, and how context changes everything.
          </p>
          <div className="stub-badge">Coming Soon</div>
        </div>
      </div>
    </div>
  )
}
