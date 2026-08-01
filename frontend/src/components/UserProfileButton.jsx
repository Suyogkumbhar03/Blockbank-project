import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function UserProfileButton({ user: propUser }) {
  const navigate = useNavigate()
  const [localUser, setLocalUser] = useState({
    name: 'User',
    profilePhoto: '',
  })

  useEffect(() => {
    const loadUserFromStorage = () => {
      const userStr = localStorage.getItem('user')
      if (userStr) {
        try {
          const parsed = JSON.parse(userStr)
          if (parsed) {
            setLocalUser(parsed)
          }
        } catch (err) {
          console.error('Failed to parse user from localStorage', err)
        }
      }
    }

    loadUserFromStorage()

    const handleStorageChange = () => loadUserFromStorage()
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('profileUpdated', handleStorageChange)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('profileUpdated', handleStorageChange)
    }
  }, [])

  const user = (propUser && (propUser.name || propUser.profilePhoto)) ? propUser : localUser

  return (
    <button
      type="button"
      onClick={() => navigate('/profile')}
      className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-opacity cursor-pointer focus:outline-none"
    >
      <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center overflow-hidden border border-outline-variant font-bold text-xs shrink-0">
        {user.profilePhoto ? (
          <img src={user.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
        ) : user.name ? (
          user.name.split(' ').map((n) => n[0]).join('').substring(0, 2)
        ) : (
          'AT'
        )}
      </div>
      <span className="text-xs font-semibold uppercase tracking-wider">
        {user.name || 'User'}
      </span>
    </button>
  )
}
