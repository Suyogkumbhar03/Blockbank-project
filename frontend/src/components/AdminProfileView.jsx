import { useState, useEffect } from 'react'

function AdminProfileView() {
  const [isEditing, setIsEditing] = useState(false)
  const [savedNotice, setSavedNotice] = useState(false)

  const [adminData, setAdminData] = useState({
    fullName: 'Alexander J. Vance',
    email: 'a.vance@blockbank.int',
    phone: '+1 (555) 012-9984',
    dateOfBirth: 'May 12, 1985',
    status: 'ACTIVE',
    profilePhoto: '',
  })

  useEffect(() => {
    const saved = localStorage.getItem('adminUser')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed) {
          setAdminData((prev) => ({ ...prev, ...parsed }))
        }
      } catch (e) {
        console.error(e)
      }
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

  const handleSave = (e) => {
    e.preventDefault()
    localStorage.setItem('adminUser', JSON.stringify(adminData))
    setIsEditing(false)
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 3000)
  }

  return (
    <div className="flex flex-col gap-6 animate-fadeIn">
      {/* Breadcrumb & Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="text-xs text-on-surface-variant mb-1 font-medium flex items-center gap-1">
            <span>System Administration</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span>Admin Profile</span>
          </div>
          <h1 className="text-3xl font-bold text-on-surface tracking-tight">
            Admin Profile
          </h1>
        </div>

        <button
          type="button"
          onClick={isEditing ? handleSave : () => setIsEditing(true)}
          className="bg-black text-white hover:bg-slate-800 transition-colors px-5 py-2.5 rounded text-xs font-semibold uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm"
        >
          <span className="material-symbols-outlined text-[16px]">
            {isEditing ? 'check' : 'edit'}
          </span>
          {isEditing ? 'Save Profile' : 'Edit Profile'}
        </button>
      </div>

      {savedNotice && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-emerald-600">check_circle</span>
          <span>Admin profile updated successfully!</span>
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
              {adminData.fullName}
            </h2>
          </div>

          <div className="w-full border-t border-outline-variant/60 my-6" />

          {/* Status */}
          <div className="w-full flex items-center justify-between">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
              Status
            </span>
            <span className="bg-emerald-100 text-emerald-700 font-bold uppercase text-[11px] px-2.5 py-1 rounded inline-block">
              {adminData.status}
            </span>
          </div>
        </div>

        {/* Right Section: Administrative Details & Last Login */}
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
                  className={`input-field w-full h-11 px-3.5 rounded font-sans text-sm ${
                    !isEditing ? 'bg-surface-container-low text-on-surface cursor-default' : ''
                  }`}
                />
              </div>

              {/* Institutional Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
                  Institutional Email
                </label>
                <input
                  type="email"
                  name="email"
                  disabled={!isEditing}
                  value={adminData.email}
                  onChange={handleChange}
                  className={`input-field w-full h-11 px-3.5 rounded font-sans text-sm ${
                    !isEditing ? 'bg-surface-container-low text-on-surface cursor-default' : ''
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
                  value={adminData.phone}
                  onChange={handleChange}
                  className={`input-field w-full h-11 px-3.5 rounded font-sans text-sm ${
                    !isEditing ? 'bg-surface-container-low text-on-surface cursor-default' : ''
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
                  disabled={!isEditing}
                  value={adminData.dateOfBirth}
                  onChange={handleChange}
                  className={`input-field w-full h-11 px-3.5 rounded font-sans text-sm ${
                    !isEditing ? 'bg-surface-container-low text-on-surface cursor-default' : ''
                  }`}
                />
              </div>
            </form>
          </div>

          {/* Last Login Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-4">
              Last Login
            </span>

            <div className="flex items-start gap-3 bg-surface-container-low p-3.5 rounded-lg border border-outline-variant/50 mb-3">
              <div className="w-10 h-10 rounded-md bg-surface-container flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                  history
                </span>
              </div>
              <div>
                <div className="font-bold text-sm text-on-surface">
                  Oct 24, 2023 • 09:14 AM
                </div>
                <div className="text-xs text-on-surface-variant font-mono mt-0.5">
                  IP: 192.168.1.104 (HQ Internal)
                </div>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Login authorized via physical hardware key (YubiKey 5C) and biometric verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminProfileView
