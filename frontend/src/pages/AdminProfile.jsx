import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import AdminProfileView from '../components/AdminProfileView'

function AdminProfile() {
  const [activeTab, setActiveTab] = useState('profile')
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="min-h-screen bg-surface-container-lowest font-sans text-on-surface flex">
      {/* Shared Admin Sidebar */}
      <Sidebar role="admin" activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen max-w-full overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-surface-variant flex items-center justify-between px-8 bg-surface-container-lowest sticky top-0 z-10 shrink-0">
          <div className="relative w-96">
            <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-on-surface-variant text-[20px]">
              search
            </span>
            <input
              type="text"
              placeholder="Search system logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-container pl-10 pr-4 py-2 rounded-md text-sm outline-none focus:ring-1 focus:ring-primary border border-transparent focus:border-primary transition-all"
            />
          </div>
          <div className="flex items-center gap-6">
            <button className="text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-[22px]">notifications</span>
            </button>
            <button className="text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-[22px]">dark_mode</span>
            </button>
            <div className="h-6 w-px bg-surface-variant"></div>
            <div className="flex items-center gap-3 cursor-pointer text-on-surface">
              <span className="text-sm font-medium">Profile</span>
              <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm overflow-hidden border border-outline-variant">
                <span className="material-symbols-outlined text-[20px]">person</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-8 flex-1 overflow-auto bg-surface">
          <AdminProfileView />
        </div>
      </main>
    </div>
  )
}

export default AdminProfile
