import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import api from '../services/api'
import UserProfileButton from '../components/UserProfileButton'
import NotificationBell from '../components/NotificationBell'

function Profile() {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [copied, setCopied] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Update Password Modal States
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [passwordStep, setPasswordStep] = useState(1) // 1: Old Password, 2: New Password & Confirm
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('')
  const [isVerifyingPassword, setIsVerifyingPassword] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  const handleOpenPasswordModal = () => {
    setShowPasswordModal(true)
    setPasswordStep(1)
    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setPasswordError('')
  }

  const handleClosePasswordModal = () => {
    if (!isVerifyingPassword && !isUpdatingPassword) {
      setShowPasswordModal(false)
      setPasswordStep(1)
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordError('')
    }
  }

  const handleVerifyOldPassword = async (e) => {
    if (e) e.preventDefault()
    if (!oldPassword) {
      setPasswordError('Please enter your current password')
      return
    }

    setIsVerifyingPassword(true)
    setPasswordError('')

    try {
      const res = await api.post('/verify-old-password', { oldPassword })
      if (res.data && res.data.valid) {
        setPasswordStep(2)
        setPasswordError('')
      } else {
        setPasswordError(res.data?.message || 'Incorrect current password')
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Incorrect current password')
    } finally {
      setIsVerifyingPassword(false)
    }
  }

  const handleUpdatePassword = async (e) => {
    if (e) e.preventDefault()
    if (!newPassword || !confirmPassword) {
      setPasswordError('Please fill in both new password fields')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }

    setIsUpdatingPassword(true)
    setPasswordError('')

    try {
      const res = await api.put('/update-password', {
        oldPassword,
        newPassword,
        confirmPassword,
      })
      handleClosePasswordModal()
      setPasswordSuccessMsg(res.data?.message || 'Password changed successfully!')
      setTimeout(() => setPasswordSuccessMsg(''), 4000)
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Failed to update password. Please try again.')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  // Profile Form States
  const [user, setUser] = useState({
    name: 'Alex Thorne',
    email: 'alex.thorne@corporate.net',
    phone: '+1 (555) 012-3456',
    dateOfBirth: '1985-05-12',
    paymentId: 'BB-8892-XT-9102-LDR',
    accountNumber: 'ACC-9842104921',
    profilePhoto: '',
  })

  const [formData, setFormData] = useState({
    name: 'Alex Thorne',
    email: 'alex.thorne@corporate.net',
    phone: '+1 (555) 012-3456',
    dateOfBirth: '1985-05-12',
  })

  useEffect(() => {
    let isMounted = true

    // Seed from localStorage immediately so UI is not blank
    const userStr = localStorage.getItem('user')
    if (userStr) {
      try {
        const parsed = JSON.parse(userStr)
        if (parsed && isMounted) {
          const loadedUser = {
            name: parsed.name || '',
            email: parsed.email || '',
            phone: parsed.phone || '',
            dateOfBirth: parsed.dateOfBirth
              ? new Date(parsed.dateOfBirth).toISOString().split('T')[0]
              : '',
            paymentId: parsed.paymentId || '',
            accountNumber: parsed.accountNumber || '',
            profilePhoto: parsed.profilePhoto || '',
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

    // Fetch authoritative data from backend
    api.get('/profile')
      .then((res) => {
        if (res.data && isMounted) {
          const dobStr = res.data.dateOfBirth
            ? new Date(res.data.dateOfBirth).toISOString().split('T')[0]
            : ''
          const existingStored = JSON.parse(localStorage.getItem('user') || '{}')
          const fresh = {
            ...existingStored,
            name: res.data.name || existingStored.name || '',
            email: res.data.email || existingStored.email || '',
            phone: res.data.phone || existingStored.phone || '',
            dateOfBirth: dobStr,
            paymentId: res.data.paymentId || existingStored.paymentId || '',
            accountNumber: res.data.accountNumber || existingStored.accountNumber || '',
            balance: res.data.balance !== undefined ? res.data.balance : (existingStored.balance || 0),
            profilePhoto: existingStored?.profilePhoto || '',
          }
          setUser(fresh)
          setFormData({
            name: fresh.name,
            email: fresh.email,
            phone: fresh.phone,
            dateOfBirth: fresh.dateOfBirth,
          })
          // Keep localStorage in sync without losing balance or other properties
          localStorage.setItem('user', JSON.stringify({ ...fresh, token: localStorage.getItem('token') }))
        }
      })
      .catch((err) => console.error('Failed to fetch profile:', err))

    return () => { isMounted = false }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const photoUrl = reader.result
        setUser((prev) => {
          const updated = { ...prev, profilePhoto: photoUrl }
          localStorage.setItem('user', JSON.stringify(updated))
          return updated
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async (e) => {
    if (e) e.preventDefault()
    setIsSaving(true)
    setSaveError('')
    try {
      const payload = {
        name: formData.name,
        phone: formData.phone,
      }
      const res = await api.put('/profile', payload)
      const dobStr = res.data.dateOfBirth
        ? new Date(res.data.dateOfBirth).toISOString().split('T')[0]
        : formData.dateOfBirth
      const stored = JSON.parse(localStorage.getItem('user') || '{}')
      const updatedUser = {
        ...stored,
        ...user,
        name: res.data.name || formData.name,
        email: res.data.email || user.email,
        phone: res.data.phone || formData.phone,
        dateOfBirth: dobStr,
        balance: res.data.balance !== undefined ? res.data.balance : (stored.balance || user.balance || 0),
      }
      setUser(updatedUser)
      setFormData({
        name: updatedUser.name,
        email: updatedUser.email,
        phone: updatedUser.phone,
        dateOfBirth: updatedUser.dateOfBirth,
      })
      localStorage.setItem('user', JSON.stringify(updatedUser))
      window.dispatchEvent(new Event('profileUpdated'))
      setIsEditing(false)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    } catch (err) {
      console.error('Failed to save profile:', err)
      const errMsg = err.response?.data?.message || err.message || 'Failed to save'
      setSaveError(`Save failed: ${errMsg}`)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopyPaymentId = () => {
    navigator.clipboard.writeText(user.paymentId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="font-sans antialiased min-h-screen flex bg-surface text-on-surface">
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
            <NotificationBell />
            <div className="h-6 w-px bg-outline-variant mx-2"></div>

            {/* Top Right Profile Button */}
            <UserProfileButton user={user} />
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
                type="button"
                onClick={isEditing ? handleSave : () => setIsEditing(true)}
                disabled={isSaving}
                className="bg-black text-white hover:bg-slate-800 transition-colors px-5 py-2.5 rounded text-xs font-semibold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {isSaving ? 'hourglass_empty' : isEditing ? 'check' : 'edit'}
                </span>
                {isSaving ? 'Saving…' : isEditing ? 'Save Profile' : 'Edit Profile'}
              </button>
            </div>

            {/* Password Success Toast */}
            {passwordSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-sm flex items-center gap-2 animate-fadeIn shadow-sm">
                <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
                <span className="font-semibold">{passwordSuccessMsg}</span>
              </div>
            )}

            {/* Success Toast */}
            {savedSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded text-sm flex items-center gap-2 animate-fadeIn">
                <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
                <span>Profile changes saved successfully!</span>
              </div>
            )}

            {/* Error Banner */}
            {saveError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-red-500">error</span>
                <span className="font-mono text-xs">{saveError}</span>
              </div>
            )}

            {/* Content Grid */}
            <div className="grid grid-cols-12 gap-gutter">
              {/* Left Column - Profile Card & Account Security */}
              <div className="col-span-12 lg:col-span-5 flex flex-col gap-lg">
                {/* Profile Card */}
                <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-6 flex flex-col items-center justify-center shadow-sm">
                  {/* Avatar & Photo Upload */}
                  <div className="flex flex-col items-center gap-3 mb-4 mt-2">
                    <div className="relative">
                      <div className="w-28 h-28 rounded-2xl bg-slate-900 border-2 border-outline-variant overflow-hidden flex items-center justify-center shadow-md">
                        {user.profilePhoto ? (
                          <img src={user.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <span className="material-symbols-outlined text-[64px] text-slate-200">
                            person
                          </span>
                        )}
                      </div>
                      <label
                        className="absolute -bottom-1 -right-1 w-7 h-7 bg-white text-slate-900 border border-outline-variant rounded-full flex items-center justify-center shadow-md hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Change Profile Photo"
                      >
                        <span className="material-symbols-outlined text-[15px]">photo_camera</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoChange}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {/* Change Profile Photo Button */}
                    <label className="mt-1 bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant rounded-md px-3.5 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors shadow-2xs">
                      <span className="material-symbols-outlined text-[18px]">photo_camera</span>
                      <span>Change Profile Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Name */}
                  <h3 className="text-xl font-bold text-on-surface text-center mt-1">
                    {user.name}
                  </h3>
                </div>

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
                    <div
                      onClick={handleOpenPasswordModal}
                      className="border border-outline-variant/60 rounded-md p-md flex items-center justify-between hover:bg-surface-container-low transition-colors cursor-pointer group"
                    >
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

                    {/* Item 2: Active Sessions */}
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
              </div>

              {/* Right Column - Personal Information */}
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
                        disabled={!isEditing}
                        value={formData.name}
                        onChange={handleChange}
                        className={`input-field w-full h-10 px-3 rounded font-mono text-sm ${!isEditing ? 'bg-surface-container-low text-on-surface cursor-default' : ''
                          }`}
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
                        disabled={!isEditing}
                        value={formData.email}
                        onChange={handleChange}
                        className={`input-field w-full h-10 px-3 rounded font-mono text-sm ${!isEditing ? 'bg-surface-container-low text-on-surface cursor-default' : ''
                          }`}
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
                        disabled={!isEditing}
                        value={formData.phone}
                        onChange={handleChange}
                        className={`input-field w-full h-10 px-3 rounded font-mono text-sm ${!isEditing ? 'bg-surface-container-low text-on-surface cursor-default' : ''
                          }`}
                      />
                    </div>

                    {/* Date of Birth (Read-only after registration) */}
                    <div className="flex flex-col gap-xs mt-2">
                      <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                        Date of Birth
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          name="dateOfBirth"
                          disabled={true}
                          value={formData.dateOfBirth}
                          className="input-field w-full h-10 px-3 rounded font-mono text-sm pr-8 bg-surface-container-low text-on-surface cursor-not-allowed opacity-80"
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
                    <span className="font-mono font-bold text-sm text-on-surface flex items-center gap-1">
                      {user.paymentId}
                      <button
                        type="button"
                        onClick={handleCopyPaymentId}
                        title={copied ? "Copied!" : "Copy Payment ID"}
                        className="ml-0.5 p-0.5 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded cursor-pointer inline-flex items-center justify-center transition-colors active:scale-90"
                      >
                        {copied ? (
                          <svg className="w-2.5 h-2.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                          </svg>
                        )}
                      </button>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Update Password Modal */}
      {showPasswordModal && (
        <div
          id="update-password-modal"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Backdrop */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              backdropFilter: 'blur(4px)',
            }}
            onClick={handleClosePasswordModal}
          />

          {/* Modal Card */}
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              background: '#fff',
              borderRadius: '20px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
              width: '100%',
              maxWidth: '440px',
              padding: '32px 28px',
              display: 'flex',
              flexDirection: 'column',
              margin: '0 16px',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 14, background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ color: '#fff', fontSize: 22 }}>lock</span>
                </div>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: '#111', margin: 0, lineHeight: 1.3 }}>Update Password</h3>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '2px 0 0' }}>
                    Step {passwordStep} of 2 — {passwordStep === 1 ? 'Verify Current Password' : 'Create New Password'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClosePasswordModal}
                disabled={isVerifyingPassword || isUpdatingPassword}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>close</span>
              </button>
            </div>

            {/* Step Progress indicator */}
            <div style={{ width: '100%', height: 4, background: '#f3f4f6', borderRadius: 2, marginBottom: 20, overflow: 'hidden' }}>
              <div style={{ width: passwordStep === 1 ? '50%' : '100%', height: '100%', background: '#0f172a', transition: 'width 0.3s' }} />
            </div>

            {/* Error Notice */}
            {passwordError && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#ef4444' }}>error</span>
                <span>{passwordError}</span>
              </div>
            )}

            {passwordStep === 1 ? (
              /* Step 1 Form */
              <form onSubmit={handleVerifyOldPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    autoFocus
                    placeholder="Enter current password"
                    value={oldPassword}
                    onChange={(e) => {
                      setOldPassword(e.target.value)
                      if (passwordError) setPasswordError('')
                    }}
                    style={{
                      width: '100%',
                      background: '#f9fafb',
                      border: '1px solid #d1d5db',
                      borderRadius: 12,
                      padding: '12px 14px',
                      fontSize: 14,
                      fontFamily: 'monospace',
                      color: '#111827',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={handleClosePasswordModal}
                    disabled={isVerifyingPassword}
                    style={{
                      flex: 1,
                      border: '2px solid #e5e7eb',
                      background: '#fff',
                      color: '#374151',
                      fontSize: 14,
                      fontWeight: 700,
                      padding: '12px 0',
                      borderRadius: 12,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!oldPassword || isVerifyingPassword}
                    style={{
                      flex: 1,
                      background: oldPassword && !isVerifyingPassword ? '#111' : '#9ca3af',
                      color: '#fff',
                      fontSize: 14,
                      fontWeight: 700,
                      padding: '12px 0',
                      borderRadius: 12,
                      cursor: oldPassword && !isVerifyingPassword ? 'pointer' : 'not-allowed',
                      border: 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6
                    }}
                  >
                    {isVerifyingPassword ? 'Verifying...' : 'Next Step'}
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                  </button>
                </div>
              </form>
            ) : (
              /* Step 2 Form */
              <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    autoFocus
                    placeholder="Enter new password (min. 6 chars)"
                    value={newPassword}
                    onChange={(e) => {
                      setNewPassword(e.target.value)
                      if (passwordError) setPasswordError('')
                    }}
                    style={{
                      width: '100%',
                      background: '#f9fafb',
                      border: '1px solid #d1d5db',
                      borderRadius: 12,
                      padding: '12px 14px',
                      fontSize: 14,
                      fontFamily: 'monospace',
                      color: '#111827',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value)
                      if (passwordError) setPasswordError('')
                    }}
                    style={{
                      width: '100%',
                      background: '#f9fafb',
                      border: '1px solid #d1d5db',
                      borderRadius: 12,
                      padding: '12px 14px',
                      fontSize: 14,
                      fontFamily: 'monospace',
                      color: '#111827',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => { setPasswordStep(1); setPasswordError(''); }}
                    disabled={isUpdatingPassword}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#6b7280',
                      fontWeight: 600,
                      fontSize: 13,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span>
                    Back
                  </button>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      onClick={handleClosePasswordModal}
                      disabled={isUpdatingPassword}
                      style={{
                        border: '2px solid #e5e7eb',
                        background: '#fff',
                        color: '#374151',
                        fontSize: 13,
                        fontWeight: 700,
                        padding: '10px 16px',
                        borderRadius: 12,
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!newPassword || !confirmPassword || isUpdatingPassword}
                      style={{
                        background: newPassword && confirmPassword && !isUpdatingPassword ? '#111' : '#9ca3af',
                        color: '#fff',
                        fontSize: 13,
                        fontWeight: 700,
                        padding: '10px 20px',
                        borderRadius: 12,
                        border: 'none',
                        cursor: newPassword && confirmPassword && !isUpdatingPassword ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span>
                      {isUpdatingPassword ? 'Updating...' : 'Change Password'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Profile
