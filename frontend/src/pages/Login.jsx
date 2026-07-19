import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      navigate('/dashboard')
    }, 1200)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-margin-mobile md:p-margin-desktop bg-surface-container-low font-sans antialiased text-on-surface relative">
      {/* Decorative subtle background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-primary-fixed-dim rounded-full blur-3xl opacity-20 mix-blend-multiply"></div>
        <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-secondary-fixed-dim rounded-full blur-3xl opacity-20 mix-blend-multiply"></div>
      </div>

      {/* Main Card Container */}
      <main className="auth-card w-full max-w-[420px] rounded p-lg md:p-xl z-10 flex flex-col items-center">
        {/* Header / Brand */}
        <div className="flex flex-col items-center mb-xl w-full">
          <span className="material-symbols-outlined text-[48px] text-primary mb-md" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
          <h1 className="text-[28px] leading-[1.3] font-medium text-on-surface text-center tracking-tight">BlockBank</h1>
          <p className="text-sm text-on-surface-variant text-center mt-xs">Secure Ledger Access</p>
        </div>

        {/* Login Form */}
        <form className="w-full flex flex-col gap-lg" onSubmit={handleSubmit}>
          {/* Email Field */}
          <div className="flex flex-col gap-xs w-full">
            <label className="text-[12px] font-medium tracking-wider text-on-surface-variant uppercase" htmlFor="email">Institutional Email</label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-outline text-[20px]">mail</span>
              <input 
                className="input-field w-full h-10 pl-10 pr-3 rounded font-mono text-sm" 
                id="email" 
                name="email" 
                placeholder="admin@organization.com" 
                required 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-xs w-full">
            <div className="flex justify-between items-end">
              <label className="text-[12px] font-medium tracking-wider text-on-surface-variant uppercase" htmlFor="password">Hardware Key / Password</label>
              <a className="text-[12px] font-medium text-primary hover:underline" href="#">Recover Access</a>
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-outline text-[20px]">lock</span>
              <input 
                className="input-field w-full h-10 pl-10 pr-10 rounded font-mono text-sm" 
                id="password" 
                name="password" 
                placeholder="••••••••••••" 
                required 
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

          {/* Options Row */}
          <div className="flex items-center justify-between w-full mt-xs">
            <label className="flex items-center gap-2 cursor-pointer group select-none">
              <div className="relative flex items-center justify-center">
                <input 
                  className="peer appearance-none w-4 h-4 border border-outline-variant rounded-sm bg-surface-container-lowest checked:bg-primary checked:border-primary transition-colors cursor-pointer focus:ring-2 focus:ring-primary/20 focus:ring-offset-0" 
                  id="remember" 
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span className="material-symbols-outlined absolute text-[14px] text-white opacity-0 peer-checked:opacity-100 pointer-events-none transition-opacity" style={{ fontVariationSettings: "'FILL' 1" }}>check</span>
              </div>
              <span className="text-sm text-on-surface-variant group-hover:text-on-surface transition-colors">Trust this device</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-sm w-full mt-sm">
            <button className="btn-primary w-full h-10 rounded flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider cursor-pointer" type="submit">
              <span className="material-symbols-outlined text-[18px]">login</span>
              Authenticate
            </button>
            <button 
              className="btn-ghost w-full h-10 rounded flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider cursor-pointer border border-transparent" 
              type="button"
              onClick={() => {
                setLoading(true)
                setTimeout(() => {
                  setLoading(false)
                  navigate('/dashboard')
                }, 1000)
              }}
            >
              Use SSO / Hardware Token
            </button>
          </div>
        </form>

        {/* Footer Info */}
        <div className="w-full flex items-center justify-center gap-2 mt-xl pt-lg border-t border-outline-variant/30">
          <span className="material-symbols-outlined text-outline text-[16px]">gpp_good</span>
          <p className="font-mono text-[11px] text-outline text-center">Protected by End-to-End Encryption • v2.4.1</p>
        </div>
      </main>

      {/* Simple loading overlay simulated on submit */}
      {loading && (
        <div className="fixed inset-0 bg-surface/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-md">
            <span className="material-symbols-outlined text-primary text-4xl animate-spin">sync</span>
            <p className="font-mono text-sm text-on-surface">Verifying credentials...</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login
