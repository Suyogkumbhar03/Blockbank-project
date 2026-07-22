import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminDashboard from './pages/AdminDashboard'
import Dashboard from './pages/Dashboard'
import TransferMoney from './pages/TransferMoney'
import TransferSuccess from './pages/TransferSuccess'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* Protected Admin Route */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requireRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />
        
        {/* Protected User Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/transfer" 
          element={
            <ProtectedRoute>
              <TransferMoney />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/success" 
          element={
            <ProtectedRoute>
              <TransferSuccess />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
