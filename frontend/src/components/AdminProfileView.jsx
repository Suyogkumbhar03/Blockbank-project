import { useState, useEffect } from 'react'
import api from '../services/api'

function AdminProfileView() {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [savedNotice, setSavedNotice] = useState(false)
  const [loginHistory, setLoginHistory] = useState([])
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [apiError, setApiError] = useState('')

  const [adminData, setAdminData] = useState({
    fullName: 'System Admin',
    email: 'admin@blockbank.com',
    phone: '',
    dateOfBirth: '',
    status: 'APPROVED',
    profilePhoto: '',
  })

  useEffect(() => {
    let isMounted = true

    const loadProfile = async () => {
      setLoadingProfile(true)
      setApiError('')

      // 1. Check localStorage 'user' as immediate baseline
      try {
        const storedUserStr = localStorage.getItem('user')
        if (storedUserStr) {
          const u = JSON.parse(storedUserStr)
          if (u && isMounted) {
            setAdminData((prev) => ({
              ...prev,
              fullName: u.name || prev.fullName,
              email: u.email || prev.email,
            }))
            if (Array.isArray(u.loginHistory) && u.loginHistory.length > 0) {
              setLoginHistory(u.loginHistory)
            }
          }
        }
      } catch (err) {
        console.error('Error reading stored user', err)
      }

      // 2. Check localStorage 'adminUser' for photo/edits
      try {
        const savedPhoto = localStorage.getItem('adminUser')
        if (savedPhoto) {
          const parsedPhoto = JSON.parse(savedPhoto)
          if (parsedPhoto && isMounted) {
            setAdminData((prev) => ({ ...prev, ...parsedPhoto }))
          }
        }
      } catch (err) {
        console.error('Error reading stored admin photo', err)
      }

      // 3. Fetch authoritative data from backend API
      try {
        const res = await api.get('/admin/profile')
        if (res.data && isMounted) {
          console.log('Fetched admin profile:', res.data)
          setAdminData((prev) => ({
            ...prev,
            fullName: res.data.name || prev.fullName,
            email: res.data.email || prev.email,
            phone: res.data.phone || prev.phone,
            dateOfBirth: res.data.dateOfBirth ? new Date(res.data.dateOfBirth).toISOString().split('T')[0] : prev.dateOfBirth,
            status: res.data.status ? res.data.status.toUpperCase() : 'APPROVED',
          }))

          if (Array.isArray(res.data.loginHistory) && res.data.loginHistory.length > 0) {
            setLoginHistory(res.data.loginHistory)
          }
        }
      } catch (err) {
        console.error('Failed to fetch admin profile:', err)
        if (isMounted) {
          const errMsg = err.response?.data?.message || err.message || 'Error connecting to server'
          setApiError(`API error (${err.response?.status || 'Network'}): ${errMsg}`)
        }
      } finally {
        if (isMounted) {
          setLoadingProfile(false)
        }
      }
    }

    loadProfile()

    return () => {
      isMounted = false
    }
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setAdminData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const photoUrl = reader.result
        setAdminData((prev) => {
          const updated = { ...prev, profilePhoto: photoUrl }
          localStorage.setItem('adminUser', JSON.stringify(updated))
          return updated
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    setApiError('')
    try {
      const payload = {
        name: adminData.fullName,
        phone: adminData.phone,
        dateOfBirth: adminData.dateOfBirth,
      }
      const res = await api.put('/admin/profile', payload)
      // Sync state with what DB actually saved
      setAdminData((prev) => ({
        ...prev,
        fullName: res.data.name || prev.fullName,
        email: res.data.email || prev.email,
        phone: res.data.phone || prev.phone,
        dateOfBirth: res.data.dateOfBirth
          ? new Date(res.data.dateOfBirth).toISOString().split('T')[0]
          : prev.dateOfBirth,
        status: res.data.status ? res.data.status.toUpperCase() : prev.status,
      }))
      // Keep localStorage in sync too
      localStorage.setItem('adminUser', JSON.stringify({
        ...adminData,
        fullName: res.data.name || adminData.fullName,
        phone: res.data.phone || adminData.phone,
      }))

      // Sync global user for the dashboard header
      const currentGlobalUserStr = localStorage.getItem('user');
      if (currentGlobalUserStr) {
        const currentGlobalUser = JSON.parse(currentGlobalUserStr);
        currentGlobalUser.name = res.data.name || adminData.fullName;
        localStorage.setItem('user', JSON.stringify(currentGlobalUser));
      }

      window.dispatchEvent(new Event('profileUpdated'))
      setIsEditing(false)
      setSavedNotice(true)
      setTimeout(() => setSavedNotice(false), 3000)
    } catch (err) {
      console.error('Failed to update admin profile:', err)
      const errMsg = err.response?.data?.message || err.message || 'Failed to save'
      setApiError(`Save failed: ${errMsg}`)
    } finally {
      setIsSaving(false)
    }
  }

  const formatDate = (dateStr) => {
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    } catch {
      return dateStr
    }
  }

  const formatTime = (dateStr) => {
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return ''
      return d.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      })
    } catch {
      return ''
    }
  }

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Breadcrumb & Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-on-surface tracking-tight">
            Admin Profile
          </h1>
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

      {savedNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
          <span>Admin profile updated successfully!</span>
        </div>
      )}

      {apiError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-red-500">error</span>
          <span className="font-mono text-xs">{apiError}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Left Card: Profile Photo & Status */}
        <div className="col-span-12 lg:col-span-4 bg-surface-container-lowest border border-outline-variant rounded-xl p-6 flex flex-col items-center justify-between shadow-sm">
          <div className="flex flex-col items-center w-full">
            {/* Avatar & Photo Upload */}
            <div className="flex flex-col items-center gap-3 mb-4 mt-2">
              <div className="relative">
                <div className="w-28 h-28 rounded-2xl bg-slate-900 border-2 border-outline-variant overflow-hidden flex items-center justify-center shadow-md">
                  {adminData.profilePhoto ? (
                    <img src={adminData.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <span className="material-symbols-outlined text-[64px] text-slate-200">
                      person
                    </span>
                  )}
                </div>
                <span
                  className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 border-2 border-white rounded-full"
                  title="Online / Active"
                />
              </div>

              {/* Change Profile Photo Button */}
              <label className="bg-surface-container hover:bg-surface-container-high text-on-surface border border-outline-variant rounded-md px-3.5 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors shadow-2xs mt-1">
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
            <h2 className="text-xl font-bold text-on-surface text-center mt-2">
              {adminData.fullName || 'System Admin'}
            </h2>
          </div>

          <div className="w-full border-t border-outline-variant/60 my-6" />

          {/* Status */}
          <div className="w-full flex items-center justify-between">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Status
            </span>
            <span className="bg-emerald-100 text-emerald-700 font-bold uppercase text-[11px] px-2.5 py-1 rounded inline-block">
              {adminData.status || 'APPROVED'}
            </span>
          </div>
        </div>

        {/* Right Section: Administrative Details & Login History */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          {/* Administrative Details Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            <h2 className="text-base font-bold text-on-surface mb-6">
              Administrative Details
            </h2>

            <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                  Full Name
                </label>
                <input
                  type="text"
                  name="fullName"
                  disabled={!isEditing}
                  value={adminData.fullName}
                  onChange={handleChange}
                  className={`input-field w-full h-11 px-3.5 rounded font-sans text-sm ${!isEditing ? 'bg-surface-container-low text-on-surface cursor-default' : ''
                    }`}
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  disabled={!isEditing}
                  value={adminData.email}
                  onChange={handleChange}
                  className={`input-field w-full h-11 px-3.5 rounded font-sans text-sm ${!isEditing ? 'bg-surface-container-low text-on-surface cursor-default' : ''
                    }`}
                />
              </div>

              {/* Phone Number */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                  Phone Number
                </label>
                <input
                  type="text"
                  name="phone"
                  disabled={!isEditing}
                  value={adminData.phone || '+1 (555) 012-9984'}
                  onChange={handleChange}
                  className={`input-field w-full h-11 px-3.5 rounded font-sans text-sm ${!isEditing ? 'bg-surface-container-low text-on-surface cursor-default' : ''
                    }`}
                />
              </div>

              {/* Date of Birth */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                  Date of Birth
                </label>
                <input
                  type="text"
                  name="dateOfBirth"
                  disabled={true}
                  value={adminData.dateOfBirth || 'May 12, 1985'}
                  className="input-field w-full h-11 px-3.5 rounded font-sans text-sm bg-surface-container-low text-on-surface cursor-not-allowed opacity-80"
                />
              </div>
            </form>
          </div>

          {/* Login History Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                Login History
              </span>
              <span className="text-[11px] text-on-surface-variant font-medium bg-surface-container px-2 py-0.5 rounded-full">
                Last 3 sessions
              </span>
            </div>

            {loadingProfile && loginHistory.length === 0 ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-lg bg-surface-container animate-pulse" />
                ))}
              </div>
            ) : loginHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-on-surface-variant gap-2">
                <span className="material-symbols-outlined text-[36px] opacity-40">history</span>
                <p className="text-sm italic">No login history recorded yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {loginHistory.map((item, idx) => {
                  const ts = typeof item === 'object' && item !== null && item.timestamp ? item.timestamp : item;
                  const ip = typeof item === 'object' && item !== null && item.ip ? item.ip : 'Unknown';
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 bg-surface-container-low border border-outline-variant/50 rounded-lg px-4 py-3"
                    >
                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 ${idx === 0 ? 'bg-emerald-100' : 'bg-surface-container'}`}>
                        <span className={`material-symbols-outlined text-[18px] ${idx === 0 ? 'text-emerald-600' : 'text-on-surface-variant'}`}>
                          {idx === 0 ? 'verified_user' : 'history'}
                        </span>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-on-surface">
                            {formatDate(ts)} • {formatTime(ts)}
                          </span>
                          {idx === 0 && (
                            <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">
                              Most Recent
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-on-surface-variant mt-0.5 flex items-center gap-2">
                          <span>{idx === 0 ? 'Current session login' : `Previous session #${idx + 1}`}</span>
                          <span>•</span>
                          <span className="font-mono text-[11px]">IP: {ip}</span>
                        </div>
                      </div>

                      {/* Session number badge */}
                      <span className="text-[11px] font-mono text-on-surface-variant opacity-50 shrink-0">
                        #{idx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-on-surface-variant leading-relaxed mt-4">
              Login timestamps are recorded each time the admin account successfully authenticates.
            </p>
          </div>

        </div>
      </div>
    </div>

  )
}

export default AdminProfileView
