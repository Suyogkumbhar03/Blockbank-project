import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

function Profile() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [copied, setCopied] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  // Profile Form States
  const [user, setUser] = useState({
    name: 'Alex Thorne',
    email: 'alex.thorne@corporate.net',
    phone: '+1 (555) 012-3456',
    dateOfBirth: '1985-05-12',
    paymentId: 'BB-8892-XT-9102-LDR',
    accountNumber: 'ACC-9842104921',
  })

  const [formData, setFormData] = useState({
    name: 'Alex Thorne',
    email: 'alex.thorne@corporate.net',
    phone: '+1 (555) 012-3456',
    dateOfBirth: '1985-05-12',
  })

  useEffect(() => {
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr)
        if (parsed) {
          const loadedUser = {
            name: parsed.name || 'Alex Thorne',
            email: parsed.email || 'alex.thorne@corporate.net',
            phone: parsed.phone || '+1 (555) 012-3456',
            dateOfBirth: parsed.dateOfBirth || '1985-05-12',
            paymentId: parsed.paymentId || 'BB-8892-XT-9102-LDR',
            accountNumber: parsed.accountNumber || 'ACC-9842104921',
          }
          setUser(loadedUser)
          setFormData({
            name: loadedUser.name,
            email: loadedUser.email,
            phone: loadedUser.phone,
            dateOfBirth: loadedUser.dateOfBirth,
          })
        }
      } catch (err) {
        console.error('Failed to parse user data from localStorage', err)
      }
    }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = (e) => {
    e.preventDefault()
    const updatedUser = {
      ...user,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      dateOfBirth: formData.dateOfBirth,
    }
    setUser(updatedUser)
    localStorage.setItem('user', JSON.stringify(updatedUser))
    setSavedSuccess(true)
    setTimeout(() => setSavedSuccess(false), 3000)
  }

  const handleCopyPaymentId = () => {
    navigator.clipboard.writeText(user.paymentId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={`font-sans antialiased min-h-screen flex ${
        isDarkMode ? 'dark bg-slate-950 text-slate-100' : 'bg-surface text-on-surface'
      }`}
    >
      {/* Shared User Sidebar */}
      <Sidebar role="user" />

      {/* Main Content Area */}
      <div className="ml-64 w-full flex flex-col min-h-screen">
        {/* TopNavBar */}
        <header className="h-16 fixed top-0 right-0 left-64 z-40 bg-surface border-b border-outline-variant flex justify-between items-center px-lg">
          <div className="flex-1 flex items-center">
            <div className="relative w-96">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
                search
              </span>
              <input
                className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant rounded font-sans text-sm text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-tertiary-fixed-dim/10 transition-all"
                placeholder="Search secure ledger..."
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center gap-md">
            <button className="p-2 text-on-surface-variant hover:text-on-surface transition-colors rounded-full hover:bg-surface-container relative">
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
            </button>
            <button
              className="p-2 text-on-surface-variant hover:text-on-surface transition-colors rounded-full hover:bg-surface-container"
              onClick={() => setIsDarkMode(!isDarkMode)}
            >
              <span className="material-symbols-outlined text-[22px]">
                {isDarkMode ? 'light_mode' : 'dark_mode'}
              </span>
            </button>
            <div className="h-6 w-px bg-outline-variant mx-2"></div>
            
            {/* Top Right Profile Button */}
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-opacity cursor-pointer focus:outline-none"
            >
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center overflow-hidden border border-outline-variant font-bold text-xs">
                {user.name ? user.name.split(' ').map(n => n[0]).join('').substring(0,2) : 'AT'}
              </div>
              <span className="text-xs font-semibold tracking-wider">
                {user.name}
              </span>
            </button>
          </div>
        </header>

        {/* User Profile Canvas */}
        <main className="flex-1 mt-16 p-margin-desktop bg-background overflow-y-auto">
          <div className="max-w-[1280px] mx-auto flex flex-col gap-xl">
            {/* Header Section */}
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-3xl font-bold text-on-surface tracking-tight">
                  User Profile
                </h1>
                <p className="text-sm text-on-surface-variant mt-1">
                  Manage your account credentials and security preferences.
                </p>
              </div>
              <button
                onClick={handleSave}
                type="button"
                className="bg-black text-white hover:bg-slate-800 transition-colors px-6 py-2.5 rounded text-xs font-semibold uppercase tracking-wider cursor-pointer shadow-sm"
              >
                Save All Changes
              </button>
            </div>

            {/* Notification Toast */}
            {savedSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded text-sm flex items-center gap-2 animate-fadeIn">
                <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
                <span>Profile changes saved successfully!</span>
              </div>
            )}

            {/* Content Grid */}
            <div className="grid grid-cols-12 gap-gutter">
              {/* Left Column - Personal Information */}
              <div className="col-span-12 lg:col-span-7 bg-surface-container-lowest border border-outline-variant rounded-lg p-lg flex flex-col justify-between">
                <div>
                  {/* Card Header */}
                  <div className="flex justify-between items-center mb-lg pb-sm border-b border-outline-variant/40">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-on-surface text-[22px]">
                        person
                      </span>
                      <h2 className="text-lg font-bold text-on-surface">
                        Personal Information
                      </h2>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 text-[11px] font-semibold uppercase tracking-wider px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">check_circle</span>
                      KYC VERIFIED
                    </span>
                  </div>

                  {/* Form Inputs Grid */}
                  <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-md">
                    {/* Full Name */}
                    <div className="flex flex-col gap-xs">
                      <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="input-field w-full h-10 px-3 rounded font-mono text-sm"
                      />
                    </div>

                    {/* Email Address */}
                    <div className="flex flex-col gap-xs">
                      <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="input-field w-full h-10 px-3 rounded font-mono text-sm"
                      />
                    </div>

                    {/* Phone Number */}
                    <div className="flex flex-col gap-xs mt-2">
                      <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                        Phone Number
                      </label>
                      <input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="input-field w-full h-10 px-3 rounded font-mono text-sm"
                      />
                    </div>

                    {/* Date of Birth */}
                    <div className="flex flex-col gap-xs mt-2">
                      <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                        Date of Birth
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          name="dateOfBirth"
                          value={formData.dateOfBirth}
                          onChange={handleChange}
                          className="input-field w-full h-10 px-3 rounded font-mono text-sm pr-8"
                        />
                      </div>
                    </div>
                  </form>
                </div>

                {/* Unique Payment ID Box */}
                <div className="bg-surface-container-low border border-outline-variant/60 rounded-md p-md mt-lg flex justify-between items-center">
                  <div>
                    <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider block mb-1">
                      Unique Payment ID
                    </span>
                    <span className="font-mono font-bold text-sm text-on-surface">
                      {user.paymentId}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPaymentId}
                    className="bg-surface-container-lowest border border-outline-variant rounded px-3 py-1.5 text-xs font-medium text-on-surface hover:bg-surface-container transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[16px]">content_copy</span>
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              {/* Right Column - Account Security & Profile Card */}
              <div className="col-span-12 lg:col-span-5 flex flex-col gap-lg">
                {/* Account Security Card */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-lg">
                  <div className="flex items-center gap-2 mb-md pb-xs border-b border-outline-variant/40">
                    <span className="material-symbols-outlined text-on-surface text-[22px]">
                      security
                    </span>
                    <h2 className="text-lg font-bold text-on-surface">
                      Account Security
                    </h2>
                  </div>

                  <div className="flex flex-col gap-sm">
                    {/* Item 1: Update Password */}
                    <div className="border border-outline-variant/60 rounded-md p-md flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer group">
                      <div className="flex items-center gap-md">
                        <div className="w-9 h-9 rounded bg-surface-container flex items-center justify-center text-on-surface">
                          <span className="material-symbols-outlined text-[20px]">lock</span>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-on-surface">Update Password</div>
                          <div className="text-xs text-on-surface-variant">Last changed 4 months ago</div>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-outline group-hover:text-on-surface transition-colors">
                        chevron_right
                      </span>
                    </div>

                    {/* Item 2: Two-Factor Auth */}
                    <div className="border border-outline-variant/60 rounded-md p-md flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer">
                      <div className="flex items-center gap-md">
                        <div className="w-9 h-9 rounded bg-surface-container flex items-center justify-center text-on-surface">
                          <span className="material-symbols-outlined text-[20px]">phonelink_lock</span>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-on-surface">Two-Factor Auth</div>
                          <div className="text-xs text-emerald-600 font-semibold">Active: Authenticator App</div>
                        </div>
                      </div>
                      <button className="text-on-surface-variant hover:text-on-surface transition-colors">
                        <span className="material-symbols-outlined text-[20px]">settings</span>
                      </button>
                    </div>

                    {/* Item 3: Active Sessions */}
                    <div className="border border-outline-variant/60 rounded-md p-md flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer group">
                      <div className="flex items-center gap-md">
                        <div className="w-9 h-9 rounded bg-surface-container flex items-center justify-center text-on-surface">
                          <span className="material-symbols-outlined text-[20px]">devices</span>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-on-surface">Active Sessions</div>
                          <div className="text-xs text-on-surface-variant">2 devices currently connected</div>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-outline group-hover:text-on-surface transition-colors">
                        chevron_right
                      </span>
                    </div>
                  </div>
                </div>

                {/* Dark Client Tier Card */}
                <div className="bg-slate-900 text-white rounded-lg p-6 flex flex-col items-center justify-center relative overflow-hidden min-h-[220px] shadow-lg">
                  {/* Subtle dark pattern overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-800/40 to-slate-950 pointer-events-none" />

                  {/* Avatar Container */}
                  <div className="relative mb-3 z-10">
                    <div className="w-20 h-20 rounded-xl bg-slate-800 border-2 border-slate-700 overflow-hidden flex items-center justify-center shadow-md">
                      <span className="material-symbols-outlined text-[42px] text-slate-300">
                        account_circle
                      </span>
                    </div>
                    <button
                      type="button"
                      className="absolute -bottom-1 -right-1 w-7 h-7 bg-white text-slate-900 rounded-full flex items-center justify-center shadow-md hover:bg-slate-200 transition-colors cursor-pointer"
                      title="Edit Avatar"
                    >
                      <span className="material-symbols-outlined text-[15px]">edit</span>
                    </button>
                  </div>

                  {/* Name & Tier */}
                  <h3 className="text-xl font-bold tracking-tight text-white z-10">
                    {user.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium tracking-wide mt-1 z-10">
                    Premium Tier Client
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Status Footer */}
            <div className="bg-surface-container-low border border-outline-variant rounded-lg p-md grid grid-cols-2 md:grid-cols-4 gap-md items-center text-xs">
              <div className="flex flex-col gap-1 border-r border-outline-variant/40 pr-md">
                <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">
                  Account Status
                </span>
                <span className="font-bold text-emerald-600">OPERATIONAL</span>
              </div>

              <div className="flex flex-col gap-1 border-r border-outline-variant/40 pr-md">
                <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">
                  Last Login
                </span>
                <span className="font-mono font-medium text-on-surface">Oct 24, 2023 - 09:12 AM</span>
              </div>

              <div className="flex flex-col gap-1 border-r border-outline-variant/40 pr-md">
                <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">
                  Ledger Node
                </span>
                <span className="font-mono font-medium text-on-surface">LN-NORTH-04</span>
              </div>

              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">
                  Encryption
                </span>
                <div className="flex items-center gap-2 font-mono font-medium text-on-surface">
                  <span>AES-256-GCM</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

export default Profile
