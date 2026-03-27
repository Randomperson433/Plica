import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './Home'
import Ligatura from './ligatura'
import Mensura from './Mensura'
import Signa from './Signa'
import Colores from './Colores'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/ligatura" element={<Ligatura />} />
        <Route path="/mensura" element={<Mensura />} />
        <Route path="/signa" element={<Signa />} />
        <Route path="/colores" element={<Colores />} />
      </Routes>
    </BrowserRouter>
  )
}
