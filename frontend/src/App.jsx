import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import TransferMoney from './pages/TransferMoney'
import TransferSuccess from './pages/TransferSuccess'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/transfer" element={<TransferMoney />} />
        <Route path="/success" element={<TransferSuccess />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
