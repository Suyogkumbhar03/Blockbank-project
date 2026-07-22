import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'

function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')
    try {
      const res = await api.post('/register', {
        name: username,
        email,
        phone,
        password,
      })
      setLoading(false)
      const successMessage =
        res.data?.message ||
        "Registration submitted — you'll be able to log in once an admin approves your account."
      navigate('/login', { state: { infoMessage: successMessage } })
    } catch (err) {
      setLoading(false)
      const message = err.response?.data?.message || err.message || 'Registration failed'
      setErrorMsg(message)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-margin-mobile md:p-margin-desktop bg-surface-container-low font-sans antialiased text-on-surface relative py-12">
      {/* Decorative subtle background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-primary-fixed-dim rounded-full blur-3xl opacity-20 mix-blend-multiply"></div>
        <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-secondary-fixed-dim rounded-full blur-3xl opacity-20 mix-blend-multiply"></div>
      </div>

      {/* Main Card Container */}
      <main className="auth-card w-full max-w-[420px] rounded p-lg md:p-xl z-10 flex flex-col items-center mt-8">
        {/* Header / Brand */}
        <div className="flex flex-col items-center mb-xl w-full">
          <span className="material-symbols-outlined text-[48px] text-primary mb-md" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
          <h1 className="text-[28px] leading-[1.3] font-medium text-on-surface text-center tracking-tight">Create Account</h1>
          <p className="text-sm text-on-surface-variant text-center mt-xs">Join BlockBank Today</p>
        </div>

        {/* Inline Error Display */}
        {errorMsg && (
          <div className="w-full mb-md p-md bg-error/10 border border-error/20 rounded text-error text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Register Form */}
        <form className="w-full flex flex-col gap-lg" onSubmit={handleSubmit}>
          {/* Username Field */}
          <div className="flex flex-col gap-xs w-full">
            <label className="text-[12px] font-medium tracking-wider text-on-surface-variant uppercase" htmlFor="username">Username</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-outline text-[20px]">person</span>
              <input 
                className="input-field w-full h-10 pl-10 pr-3 rounded font-mono text-sm" 
                id="username" 
                name="username" 
                placeholder="John Doe" 
                required 
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
          </div>

          {/* Email Field */}
          <div className="flex flex-col gap-xs w-full">
            <label className="text-[12px] font-medium tracking-wider text-on-surface-variant uppercase" htmlFor="email">Email Address</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-outline text-[20px]">mail</span>
              <input 
                className="input-field w-full h-10 pl-10 pr-3 rounded font-mono text-sm" 
                id="email" 
                name="email" 
                placeholder="john@example.com" 
                required 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Phone Field */}
          <div className="flex flex-col gap-xs w-full">
            <label className="text-[12px] font-medium tracking-wider text-on-surface-variant uppercase" htmlFor="phone">Phone Number</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-outline text-[20px]">phone</span>
              <input 
                className="input-field w-full h-10 pl-10 pr-3 rounded font-mono text-sm" 
                id="phone" 
                name="phone" 
                placeholder="9876543210" 
                required 
                type="tel"
                pattern="[0-9]{10}"
                title="Please enter exactly 10 digits"
                maxLength="10"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  if (val.length <= 10) setPhone(val);
                }}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-xs w-full">
            <label className="text-[12px] font-medium tracking-wider text-on-surface-variant uppercase" htmlFor="password">Password</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-outline text-[20px]">lock</span>
              <input 
                className="input-field w-full h-10 pl-10 pr-10 rounded font-mono text-sm" 
                id="password" 
                name="password" 
                placeholder="••••••••••••" 
                required 
                minLength="6"
                title="Password must be at least 6 characters long"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-outline hover:text-on-surface transition-colors" 
                onClick={() => setShowPassword(!showPassword)} 
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-sm w-full mt-sm">
            <button className="btn-primary w-full h-10 rounded flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider cursor-pointer" type="submit">
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              Register
            </button>
          </div>
          
          <div className="text-center mt-2">
            <span className="text-sm text-on-surface-variant">Already have an account? </span>
            <Link to="/login" className="text-sm font-medium text-primary hover:underline">Sign In</Link>
          </div>
        </form>
      </main>

      {/* Simple loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-surface/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-md">
            <span className="material-symbols-outlined text-primary text-4xl animate-spin">sync</span>
            <p className="font-mono text-sm text-on-surface">Creating account...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Register
