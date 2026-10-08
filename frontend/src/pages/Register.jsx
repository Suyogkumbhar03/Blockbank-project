import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import api from '../services/api'

// --- Validation Helper Functions ---
const validateFullName = (val) => {
  if (!val || !val.trim()) {
    return { isValid: false, message: 'Full name is required' }
  }
  const trimmed = val.trim()
  if (trimmed.length < 2) {
    return { isValid: false, message: 'Full name must be at least 2 characters' }
  }
  if (!/^[a-zA-Z\s'.]+$/.test(trimmed)) {
    return { isValid: false, message: 'Full name should only contain letters and spaces' }
  }
  return { isValid: true, message: 'Looks good!' }
}

const validateUsername = (val) => {
  if (!val || !val.trim()) {
    return { isValid: false, message: 'Username is required' }
  }

  const trimmed = val.trim()

  // 1. Cannot start with a number
  if (/^[0-9]/.test(trimmed)) {
    return {
      isValid: false,
      message: 'Username cannot start with a number. Please start with a lowercase letter.'
    }
  }

  // 2. All letters must be lowercase (no uppercase)
  if (/[A-Z]/.test(trimmed)) {
    return {
      isValid: false,
      message: 'All letters must be lowercase. Uppercase letters are not allowed.'
    }
  }

  // 3. Must start with a lowercase letter
  if (!/^[a-z]/.test(trimmed)) {
    return {
      isValid: false,
      message: 'Username must start with a lowercase letter (a-z).'
    }
  }

  // 4. Cannot contain spaces
  if (/\s/.test(trimmed)) {
    return {
      isValid: false,
      message: 'Username cannot contain spaces.'
    }
  }

  // 5. Allowed characters: lowercase letters, numbers, and underscores
  if (!/^[a-z0-9_]+$/.test(trimmed)) {
    return {
      isValid: false,
      message: 'Only lowercase letters, numbers, and underscores are allowed.'
    }
  }

  // 6. Minimum length of 3 characters
  if (trimmed.length < 3) {
    return {
      isValid: false,
      message: `Username must be at least 3 characters (currently ${trimmed.length}/3).`
    }
  }

  if (trimmed.length > 30) {
    return {
      isValid: false,
      message: 'Username cannot exceed 30 characters.'
    }
  }

  return { isValid: true, message: 'Valid format' }
}

const validateEmail = (val) => {
  if (!val || !val.trim()) {
    return { isValid: false, message: 'Email address is required' }
  }

  const lower = val.toLowerCase().trim()

  // 1. Must contain @
  if (!val.includes('@')) {
    return {
      isValid: false,
      message: "Email must include '@' symbol (e.g. user@gmail.com)"
    }
  }

  // 2. Must contain "gmail"
  if (!lower.includes('gmail')) {
    return {
      isValid: false,
      message: "Email must contain 'gmail' (e.g. yourname@gmail.com)"
    }
  }

  // 3. Must contain "."
  if (!lower.includes('.')) {
    return {
      isValid: false,
      message: "Email must contain '.' (e.g. yourname@gmail.com)"
    }
  }

  // 4. Must contain "com"
  if (!lower.includes('com')) {
    return {
      isValid: false,
      message: "Email must contain 'com' (e.g. yourname@gmail.com)"
    }
  }

  // 5. Valid Gmail address format check
  const emailRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com$/i
  if (!emailRegex.test(val.trim())) {
    return {
      isValid: false,
      message: 'Please enter a valid Gmail address format: yourname@gmail.com'
    }
  }

  return { isValid: true, message: 'Valid Gmail address' }
}

const checkPasswordCriteria = (val) => {
  return {
    firstLetterUpper: val.length > 0 && /^[A-Z]/.test(val),
    minLength: val.length >= 8,
    hasLower: /[a-z]/.test(val),
    hasNumber: /[0-9]/.test(val),
    otherLowercaseAndNumbers: val.length <= 1 ? true : /^[A-Z][a-z0-9]*$/.test(val),
  }
}

const validatePassword = (val) => {
  if (!val) {
    return { isValid: false, message: 'Password is required' }
  }

  // 1. First letter must be uppercase
  if (!/^[A-Z]/.test(val)) {
    return {
      isValid: false,
      message: 'First letter must be uppercase (A-Z).'
    }
  }

  // 2. Remaining characters must be lowercase letters and numbers only
  if (val.length > 1 && !/^[A-Z][a-z0-9]*$/.test(val)) {
    if (/[A-Z]/.test(val.slice(1))) {
      return {
        isValid: false,
        message: 'Only the first letter can be uppercase. Other letters must be lowercase.'
      }
    }
    return {
      isValid: false,
      message: 'Remaining characters must only contain lowercase letters and numbers.'
    }
  }

  // 3. Must contain at least 8 characters
  if (val.length < 8) {
    return {
      isValid: false,
      message: `Password must be at least 8 characters long (currently ${val.length}/8).`
    }
  }

  // 4. Must contain numbers
  if (!/[0-9]/.test(val)) {
    return {
      isValid: false,
      message: 'Password must include at least one number (0-9).'
    }
  }

  // 5. Must contain lowercase letters
  if (!/[a-z]/.test(val)) {
    return {
      isValid: false,
      message: 'Password must include lowercase letters.'
    }
  }

  return { isValid: true, message: 'Password satisfies all requirements!' }
}

const validatePhone = (val) => {
  if (!val) return { isValid: false, message: 'Phone number is required' }
  if (!/^\d{10}$/.test(val)) return { isValid: false, message: 'Phone number must be exactly 10 digits' }
  return { isValid: true, message: 'Valid phone number' }
}

const validateDOB = (val) => {
  if (!val) return { isValid: false, message: 'Date of birth is required' }
  const dob = new Date(val)
  if (isNaN(dob.getTime())) return { isValid: false, message: 'Invalid date of birth' }
  const today = new Date()
  if (dob > today) return { isValid: false, message: 'Date of birth cannot be in the future' }
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  if (age < 10) return { isValid: false, message: 'Must be at least 10 years old to register' }
  if (age > 120) return { isValid: false, message: 'Age cannot exceed 120 years' }
  return { isValid: true, message: 'Valid date of birth' }
}

const validatePin = (val) => {
  if (!val) return { isValid: false, message: 'Transaction PIN is required' }
  if (!/^\d{4}$/.test(val)) return { isValid: false, message: 'PIN must be exactly 4 digits' }
  return { isValid: true, message: 'Valid 4-digit PIN' }
}

function Register() {
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [pin, setPin] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [submitted, setSubmitted] = useState(false)
  
  // Real-time username uniqueness check states
  const [isCheckingUsername, setIsCheckingUsername] = useState(false)
  const [usernameTakenError, setUsernameTakenError] = useState('')

  const navigate = useNavigate()

  // Real-time validation evaluations
  const fullNameStatus = validateFullName(fullName)
  const usernameFormatStatus = validateUsername(username)
  const emailStatus = validateEmail(email)
  const passwordStatus = validatePassword(password)
  const phoneStatus = validatePhone(phone)
  const dobStatus = validateDOB(dateOfBirth)
  const pinStatus = validatePin(pin)

  const passwordCriteria = checkPasswordCriteria(password)

  // Asynchronous Debounced Check for Username Existence
  useEffect(() => {
    const trimmed = username.trim().toLowerCase()
    
    // Reset taken error when empty or invalid format
    if (!trimmed || !usernameFormatStatus.isValid) {
      setUsernameTakenError('')
      setIsCheckingUsername(false)
      return
    }

    setIsCheckingUsername(true)
    const timeoutId = setTimeout(async () => {
      try {
        const res = await api.get('/check-username', { params: { username: trimmed } })
        if (res.data?.available === false) {
          setUsernameTakenError('This username is already taken. Please choose another.')
        } else {
          setUsernameTakenError('')
        }
      } catch (err) {
        if (err.response?.status === 400 && err.response?.data?.message?.includes('already')) {
          setUsernameTakenError('This username is already taken. Please choose another.')
        } else {
          setUsernameTakenError('')
        }
      } finally {
        setIsCheckingUsername(false)
      }
    }, 400) // 400ms debounce

    return () => clearTimeout(timeoutId)
  }, [username, usernameFormatStatus.isValid])

  // Final username status combining format and uniqueness
  const isUsernameValid = usernameFormatStatus.isValid && !usernameTakenError && !isCheckingUsername

  const isFormValid =
    fullNameStatus.isValid &&
    isUsernameValid &&
    emailStatus.isValid &&
    passwordStatus.isValid &&
    phoneStatus.isValid &&
    dobStatus.isValid &&
    pinStatus.isValid

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitted(true)
    setErrorMsg('')

    if (!fullNameStatus.isValid) {
      setErrorMsg(fullNameStatus.message)
      return
    }
    if (!usernameFormatStatus.isValid) {
      setErrorMsg(usernameFormatStatus.message)
      return
    }
    if (usernameTakenError) {
      setErrorMsg(usernameTakenError)
      return
    }
    if (!emailStatus.isValid) {
      setErrorMsg(emailStatus.message)
      return
    }
    if (!passwordStatus.isValid) {
      setErrorMsg(passwordStatus.message)
      return
    }
    if (!phoneStatus.isValid) {
      setErrorMsg(phoneStatus.message)
      return
    }
    if (!dobStatus.isValid) {
      setErrorMsg(dobStatus.message)
      return
    }
    if (!pinStatus.isValid) {
      setErrorMsg(pinStatus.message)
      return
    }

    setLoading(true)
    try {
      const res = await api.post('/register', {
        fullName: fullName.trim(),
        name: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        dateOfBirth,
        password,
        pin,
      })
      setLoading(false)
      const successMessage =
        res.data?.message ||
        "Registration submitted — you'll be able to log in once an admin approves your account."
      navigate('/login', { state: { infoMessage: successMessage } })
    } catch (err) {
      setLoading(false)
      const message = err.response?.data?.message || err.message || 'Registration failed'
      if (message.toLowerCase().includes('username') && message.toLowerCase().includes('already')) {
        setUsernameTakenError('This username is already taken. Please choose another.')
      }
      setErrorMsg(message)
    }
  }

  // Dynamic input border and background class generator
  const getFieldBorderClass = (val, isValid) => {
    if (!val && !submitted) {
      return 'border-outline-variant focus:border-primary'
    }
    if (!isValid) {
      return 'border-error focus:border-error focus:ring-1 focus:ring-error/20 bg-error/[0.02]'
    }
    return 'border-emerald-600 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600/20 bg-emerald-500/[0.02]'
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-margin-mobile md:p-margin-desktop bg-surface-container-low font-sans antialiased text-on-surface relative py-12">
      {/* Decorative subtle background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-primary-fixed-dim rounded-full blur-3xl opacity-20 mix-blend-multiply"></div>
        <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-secondary-fixed-dim rounded-full blur-3xl opacity-20 mix-blend-multiply"></div>
      </div>

      {/* Main Card Container */}
      <main className="auth-card w-full max-w-[460px] rounded p-lg md:p-xl z-10 flex flex-col items-center mt-6 mb-8">
        {/* Header / Brand */}
        <div className="flex flex-col items-center mb-lg w-full">
          <span className="material-symbols-outlined text-[48px] text-primary mb-sm" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
          <h1 className="text-[26px] leading-[1.3] font-medium text-on-surface text-center tracking-tight">Open Account</h1>
          <p className="text-sm text-on-surface-variant text-center mt-xs">Create your secure BlockBank account</p>
        </div>

        {/* Global Error Display */}
        {errorMsg && (
          <div className="w-full mb-md p-md bg-error/10 border border-error/20 rounded text-error text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Register Form */}
        <form className="w-full flex flex-col gap-md" onSubmit={handleSubmit} noValidate>
          
          {/* 1. FULL NAME FIELD */}
          <div className="flex flex-col gap-xs w-full">
            <div className="flex justify-between items-center">
              <label className="text-[12px] font-medium tracking-wider text-on-surface-variant uppercase" htmlFor="fullName">
                Full Name
              </label>
              {fullName && (
                <span className={`text-[11px] font-medium ${fullNameStatus.isValid ? 'text-emerald-600' : 'text-error'}`}>
                  {fullNameStatus.isValid ? '✓ Valid' : '✕ Invalid'}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-outline text-[20px]">
                badge
              </span>
              <input 
                className={`input-field w-full h-10 pl-10 pr-3 rounded font-mono text-sm ${getFieldBorderClass(fullName, fullNameStatus.isValid)}`} 
                id="fullName" 
                name="fullName" 
                placeholder="e.g. John Doe" 
                required 
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            {/* Live Inline Feedback */}
            {fullName && !fullNameStatus.isValid && (
              <div className="flex items-start gap-1.5 text-[11px] text-error mt-0.5 leading-tight animate-fadeIn">
                <span className="material-symbols-outlined text-[15px] shrink-0 mt-[-1px]">error</span>
                <span>{fullNameStatus.message}</span>
              </div>
            )}
            {fullName && fullNameStatus.isValid && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 mt-0.5 animate-fadeIn">
                <span className="material-symbols-outlined text-[15px] shrink-0">check_circle</span>
                <span>{fullNameStatus.message}</span>
              </div>
            )}
            {!fullName && submitted && (
              <div className="flex items-center gap-1.5 text-[11px] text-error mt-0.5 animate-fadeIn">
                <span className="material-symbols-outlined text-[15px] shrink-0">error</span>
                <span>Full name is required.</span>
              </div>
            )}
          </div>

          {/* 2. USERNAME FIELD */}
          <div className="flex flex-col gap-xs w-full">
            <div className="flex justify-between items-center">
              <label className="text-[12px] font-medium tracking-wider text-on-surface-variant uppercase" htmlFor="username">
                Username
              </label>
              {username && (
                <span className={`text-[11px] font-medium ${
                  isCheckingUsername 
                    ? 'text-on-surface-variant' 
                    : isUsernameValid 
                      ? 'text-emerald-600' 
                      : 'text-error'
                }`}>
                  {isCheckingUsername ? 'Checking...' : isUsernameValid ? '✓ Available' : '✕ Invalid / Taken'}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-outline text-[20px]">
                person
              </span>
              <input 
                className={`input-field w-full h-10 pl-10 pr-9 rounded font-mono text-sm ${getFieldBorderClass(username, isUsernameValid)}`} 
                id="username" 
                name="username" 
                placeholder="e.g. johndoe123" 
                required 
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              {/* Spinner or Status Icon inside input */}
              {isCheckingUsername && (
                <span className="material-symbols-outlined absolute right-3 top-1/2 transform -translate-y-1/2 text-primary animate-spin text-[18px]">
                  sync
                </span>
              )}
            </div>

            {/* Live Inline Feedback for Username */}
            {username && !usernameFormatStatus.isValid && (
              <div className="flex items-start gap-1.5 text-[11px] text-error mt-0.5 leading-tight animate-fadeIn">
                <span className="material-symbols-outlined text-[15px] shrink-0 mt-[-1px]">error</span>
                <span>{usernameFormatStatus.message}</span>
              </div>
            )}
            {username && usernameFormatStatus.isValid && usernameTakenError && (
              <div className="flex items-start gap-1.5 text-[11px] text-error mt-0.5 leading-tight animate-fadeIn">
                <span className="material-symbols-outlined text-[15px] shrink-0 mt-[-1px]">cancel</span>
                <span>{usernameTakenError}</span>
              </div>
            )}
            {username && usernameFormatStatus.isValid && !usernameTakenError && !isCheckingUsername && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 mt-0.5 animate-fadeIn">
                <span className="material-symbols-outlined text-[15px] shrink-0">check_circle</span>
                <span>Username is available!</span>
              </div>
            )}
            {!username && submitted && (
              <div className="flex items-center gap-1.5 text-[11px] text-error mt-0.5 animate-fadeIn">
                <span className="material-symbols-outlined text-[15px] shrink-0">error</span>
                <span>Username is required (all lowercase, cannot start with a number).</span>
              </div>
            )}
            <p className="text-[10px] text-on-surface-variant/80">
              Rule: Cannot start with a number, all letters lowercase, must be unique (not already taken).
            </p>
          </div>

          {/* 3. EMAIL FIELD */}
          <div className="flex flex-col gap-xs w-full">
            <div className="flex justify-between items-center">
              <label className="text-[12px] font-medium tracking-wider text-on-surface-variant uppercase" htmlFor="email">
                Email Address
              </label>
              {email && (
                <span className={`text-[11px] font-medium ${emailStatus.isValid ? 'text-emerald-600' : 'text-error'}`}>
                  {emailStatus.isValid ? '✓ Valid' : '✕ Invalid'}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-outline text-[20px]">
                mail
              </span>
              <input 
                className={`input-field w-full h-10 pl-10 pr-3 rounded font-mono text-sm ${getFieldBorderClass(email, emailStatus.isValid)}`} 
                id="email" 
                name="email" 
                placeholder="e.g. johndoe@gmail.com" 
                required 
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {/* Live Inline Feedback for Email */}
            {email && !emailStatus.isValid && (
              <div className="flex items-start gap-1.5 text-[11px] text-error mt-0.5 leading-tight animate-fadeIn">
                <span className="material-symbols-outlined text-[15px] shrink-0 mt-[-1px]">error</span>
                <span>{emailStatus.message}</span>
              </div>
            )}
            {email && emailStatus.isValid && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 mt-0.5 animate-fadeIn">
                <span className="material-symbols-outlined text-[15px] shrink-0">check_circle</span>
                <span>{emailStatus.message}</span>
              </div>
            )}
            {!email && submitted && (
              <div className="flex items-center gap-1.5 text-[11px] text-error mt-0.5 animate-fadeIn">
                <span className="material-symbols-outlined text-[15px] shrink-0">error</span>
                <span>Email address is required.</span>
              </div>
            )}
            <p className="text-[10px] text-on-surface-variant/80">
              Rule: Must be a Gmail address containing "gmail", ".", and "com" (e.g. username@gmail.com).
            </p>
          </div>

          {/* 4. PASSWORD FIELD */}
          <div className="flex flex-col gap-xs w-full">
            <div className="flex justify-between items-center">
              <label className="text-[12px] font-medium tracking-wider text-on-surface-variant uppercase" htmlFor="password">
                Password
              </label>
              {password && (
                <span className={`text-[11px] font-medium ${passwordStatus.isValid ? 'text-emerald-600' : 'text-error'}`}>
                  {passwordStatus.isValid ? '✓ Strong' : '✕ Requirements not met'}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-outline text-[20px]">
                lock
              </span>
              <input 
                className={`input-field w-full h-10 pl-10 pr-10 rounded font-mono text-sm ${getFieldBorderClass(password, passwordStatus.isValid)}`} 
                id="password" 
                name="password" 
                placeholder="e.g. Secret12" 
                required 
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-outline hover:text-on-surface transition-colors cursor-pointer" 
                onClick={() => setShowPassword(!showPassword)} 
                type="button"
                tabIndex="-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>

            {/* Live Error Notification while typing */}
            {password && !passwordStatus.isValid && (
              <div className="flex items-start gap-1.5 text-[11px] text-error mt-0.5 leading-tight animate-fadeIn">
                <span className="material-symbols-outlined text-[15px] shrink-0 mt-[-1px]">error</span>
                <span>{passwordStatus.message}</span>
              </div>
            )}
            {password && passwordStatus.isValid && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 mt-0.5 animate-fadeIn">
                <span className="material-symbols-outlined text-[15px] shrink-0">check_circle</span>
                <span>{passwordStatus.message}</span>
              </div>
            )}
            {!password && submitted && (
              <div className="flex items-center gap-1.5 text-[11px] text-error mt-0.5 animate-fadeIn">
                <span className="material-symbols-outlined text-[15px] shrink-0">error</span>
                <span>Password is required.</span>
              </div>
            )}

            {/* Live Interactive Checklist Card */}
            {password && (
              <div className="bg-surface-container/70 border border-outline-variant/50 rounded p-2.5 mt-1 text-[11px] space-y-1.5 animate-fadeIn">
                <div className="font-semibold text-on-surface text-[11px] flex items-center justify-between">
                  <span>Password Rules Checklist:</span>
                  <span className="text-[10px] text-on-surface-variant">
                    {Object.values(passwordCriteria).filter(Boolean).length}/5 met
                  </span>
                </div>
                
                {/* 1. First letter uppercase */}
                <div className={`flex items-center gap-1.5 transition-colors ${
                  passwordCriteria.firstLetterUpper ? 'text-emerald-700 font-medium' : 'text-on-surface-variant'
                }`}>
                  <span className="material-symbols-outlined text-[15px] shrink-0">
                    {passwordCriteria.firstLetterUpper ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span>First letter must be uppercase (A-Z)</span>
                </div>

                {/* 2. At least 8 characters */}
                <div className={`flex items-center gap-1.5 transition-colors ${
                  passwordCriteria.minLength ? 'text-emerald-700 font-medium' : 'text-on-surface-variant'
                }`}>
                  <span className="material-symbols-outlined text-[15px] shrink-0">
                    {passwordCriteria.minLength ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span>At least 8 characters long ({password.length}/8)</span>
                </div>

                {/* 3. Lowercase letters */}
                <div className={`flex items-center gap-1.5 transition-colors ${
                  passwordCriteria.hasLower ? 'text-emerald-700 font-medium' : 'text-on-surface-variant'
                }`}>
                  <span className="material-symbols-outlined text-[15px] shrink-0">
                    {passwordCriteria.hasLower ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span>Contains lowercase letters (a-z)</span>
                </div>

                {/* 4. Numbers */}
                <div className={`flex items-center gap-1.5 transition-colors ${
                  passwordCriteria.hasNumber ? 'text-emerald-700 font-medium' : 'text-on-surface-variant'
                }`}>
                  <span className="material-symbols-outlined text-[15px] shrink-0">
                    {passwordCriteria.hasNumber ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span>Contains numbers (0-9)</span>
                </div>

                {/* 5. Remaining lowercase and numbers only */}
                <div className={`flex items-center gap-1.5 transition-colors ${
                  !passwordCriteria.otherLowercaseAndNumbers 
                    ? 'text-error font-medium' 
                    : password.length > 1 && passwordCriteria.otherLowercaseAndNumbers 
                      ? 'text-emerald-700 font-medium' 
                      : 'text-on-surface-variant'
                }`}>
                  <span className="material-symbols-outlined text-[15px] shrink-0">
                    {!passwordCriteria.otherLowercaseAndNumbers 
                      ? 'cancel' 
                      : password.length > 1 
                        ? 'check_circle' 
                        : 'radio_button_unchecked'}
                  </span>
                  <span>Other characters are lowercase & numbers only</span>
                </div>
              </div>
            )}
          </div>

          {/* 5. PHONE FIELD */}
          <div className="flex flex-col gap-xs w-full">
            <div className="flex justify-between items-center">
              <label className="text-[12px] font-medium tracking-wider text-on-surface-variant uppercase" htmlFor="phone">
                Phone Number
              </label>
              {phone && (
                <span className={`text-[11px] font-medium ${phoneStatus.isValid ? 'text-emerald-600' : 'text-error'}`}>
                  {phoneStatus.isValid ? '✓ 10 Digits' : `${phone.length}/10 digits`}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-outline text-[20px]">
                phone
              </span>
              <input 
                className={`input-field w-full h-10 pl-10 pr-3 rounded font-mono text-sm ${getFieldBorderClass(phone, phoneStatus.isValid)}`} 
                id="phone" 
                name="phone" 
                placeholder="9876543210" 
                required 
                type="tel"
                maxLength="10"
                value={phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '')
                  if (val.length <= 10) setPhone(val)
                }}
              />
            </div>
            {phone && !phoneStatus.isValid && (
              <div className="flex items-center gap-1.5 text-[11px] text-error mt-0.5 animate-fadeIn">
                <span className="material-symbols-outlined text-[15px] shrink-0">error</span>
                <span>{phoneStatus.message}</span>
              </div>
            )}
            {!phone && submitted && (
              <div className="flex items-center gap-1.5 text-[11px] text-error mt-0.5 animate-fadeIn">
                <span className="material-symbols-outlined text-[15px] shrink-0">error</span>
                <span>Phone number is required.</span>
              </div>
            )}
          </div>

          {/* 6. DATE OF BIRTH FIELD */}
          <div className="flex flex-col gap-xs w-full">
            <div className="flex justify-between items-center">
              <label className="text-[12px] font-medium tracking-wider text-on-surface-variant uppercase" htmlFor="dateOfBirth">
                Date of Birth
              </label>
              {dateOfBirth && (
                <span className={`text-[11px] font-medium ${dobStatus.isValid ? 'text-emerald-600' : 'text-error'}`}>
                  {dobStatus.isValid ? '✓ Valid' : '✕ Invalid'}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-outline text-[20px]">
                calendar_today
              </span>
              <input 
                className={`input-field w-full h-10 pl-10 pr-3 rounded font-mono text-sm ${getFieldBorderClass(dateOfBirth, dobStatus.isValid)}`} 
                id="dateOfBirth" 
                name="dateOfBirth" 
                required 
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>
            {dateOfBirth && !dobStatus.isValid && (
              <div className="flex items-center gap-1.5 text-[11px] text-error mt-0.5 animate-fadeIn">
                <span className="material-symbols-outlined text-[15px] shrink-0">error</span>
                <span>{dobStatus.message}</span>
              </div>
            )}
            {!dateOfBirth && submitted && (
              <div className="flex items-center gap-1.5 text-[11px] text-error mt-0.5 animate-fadeIn">
                <span className="material-symbols-outlined text-[15px] shrink-0">error</span>
                <span>Date of birth is required.</span>
              </div>
            )}
          </div>

          {/* 7. TRANSACTION PIN FIELD */}
          <div className="flex flex-col gap-xs w-full">
            <div className="flex justify-between items-center">
              <label className="text-[12px] font-medium tracking-wider text-on-surface-variant uppercase" htmlFor="pin">
                Set 4-digit Transaction PIN
              </label>
              {pin && (
                <span className={`text-[11px] font-medium ${pinStatus.isValid ? 'text-emerald-600' : 'text-error'}`}>
                  {pinStatus.isValid ? '✓ 4 Digits' : `${pin.length}/4 digits`}
                </span>
              )}
            </div>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 transform -translate-y-1/2 text-outline text-[20px]">
                dialpad
              </span>
              <input 
                className={`input-field w-full h-10 pl-10 pr-10 rounded font-mono text-sm ${getFieldBorderClass(pin, pinStatus.isValid)}`} 
                id="pin" 
                name="pin" 
                placeholder="••••" 
                required 
                maxLength="4"
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '')
                  if (val.length <= 4) setPin(val)
                }}
              />
              <button 
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-outline hover:text-on-surface transition-colors cursor-pointer" 
                onClick={() => setShowPin(!showPin)} 
                type="button"
                tabIndex="-1"
                aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
              >
                <span className="material-symbols-outlined text-[20px]">{showPin ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>
            {pin && !pinStatus.isValid && (
              <div className="flex items-center gap-1.5 text-[11px] text-error mt-0.5 animate-fadeIn">
                <span className="material-symbols-outlined text-[15px] shrink-0">error</span>
                <span>{pinStatus.message}</span>
              </div>
            )}
            {!pin && submitted && (
              <div className="flex items-center gap-1.5 text-[11px] text-error mt-0.5 animate-fadeIn">
                <span className="material-symbols-outlined text-[15px] shrink-0">error</span>
                <span>Transaction PIN is required.</span>
              </div>
            )}
            <p className="text-[11px] text-on-surface-variant mt-0.5">
              You will enter this 4-digit PIN to authorize every money transfer.
            </p>
          </div>

          {/* SUBMIT ACTION */}
          <div className="flex flex-col gap-sm w-full mt-sm">
            <button 
              className={`btn-primary w-full h-10 rounded flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                submitted && !isFormValid ? 'opacity-80 hover:opacity-100' : ''
              }`} 
              type="submit"
              disabled={loading}
            >
              <span className="material-symbols-outlined text-[18px]">person_add</span>
              {loading ? 'Submitting...' : 'Register'}
            </button>
          </div>
          
          <div className="text-center mt-1">
            <span className="text-sm text-on-surface-variant">Already have an account? </span>
            <Link to="/login" className="text-sm font-medium text-primary hover:underline">
              Sign In
            </Link>
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
