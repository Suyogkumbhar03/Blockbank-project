import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminDashboard from './pages/AdminDashboard'
import AdminProfile from './pages/AdminProfile'
import Dashboard from './pages/Dashboard'
import TransferMoney from './pages/TransferMoney'
import TransferSuccess from './pages/TransferSuccess'
import Profile from './pages/Profile'
import Transactions from './pages/Transactions'
import Balance from './pages/Balance'
import ProtectedRoute from './components/ProtectedRoute'
import AppShell from './components/AppShell'

function App() {
  return (
    <BrowserRouter>
      <AppShell>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected Admin Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute requireRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/profile" 
            element={
              <ProtectedRoute requireRole="admin">
                <AdminProfile />
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
            path="/balance" 
            element={
              <ProtectedRoute>
                <Balance />
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
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/transactions" 
            element={
              <ProtectedRoute>
                <Transactions />
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
      </AppShell>
    </BrowserRouter>
  )
}

export default App
