import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'

// Task 1 Helper Component: Animated Security / Blockchain Activity Card
function BlockchainVisual() {
  const initialBlocks = [
    { id: 104289, hash: '0x8f3a...91cd', time: 'Just now', status: 'Verified' },
    { id: 104288, hash: '0x3e1b...74af', time: '3s ago', status: 'Verified' },
    { id: 104287, hash: '0xa7c2...581d', time: '7s ago', status: 'Verified' }
  ]

  const [blocks, setBlocks] = useState(initialBlocks)

  useEffect(() => {
    const randomHex = () => Math.random().toString(16).substring(2, 6)
    const interval = setInterval(() => {
      setBlocks((prevBlocks) => {
        const nextId = prevBlocks[0].id + 1
        const newBlock = {
          id: nextId,
          hash: `0x${randomHex()}...${randomHex()}`,
          time: 'Just now',
          status: 'Verified'
        }
        return [newBlock, ...prevBlocks.slice(0, 2)]
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="absolute inset-0 bg-surface-container-low border border-surface-variant rounded-xl overflow-hidden premium-shadow flex items-center justify-center">
      <div className="absolute w-[150%] h-[150%] bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-secondary-fixed/20 via-transparent to-transparent -top-1/4 -left-1/4"></div>
      <div className="relative z-10 w-full max-w-[400px] p-gutter">
        {/* Main Security Card */}
        <div className="bg-surface-container-lowest border border-surface-variant rounded-lg p-md mb-md premium-shadow">
          <div className="flex justify-between items-center mb-sm border-b border-surface-variant pb-sm">
            <div className="flex items-center gap-xs">
              <span className="material-symbols-outlined text-[20px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
                shield_lock
              </span>
              <span className="text-xs font-semibold text-on-surface uppercase tracking-wider">
                Secured by SHA-256 Blockchain
              </span>
            </div>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-on-surface-variant mb-xs">
            <span className="font-mono">LIVE LEDGER STREAM</span>
            <span className="text-[10px] bg-surface-container-high px-xs py-[2px] rounded font-mono">256-bit</span>
          </div>

          {/* Live Activity Stream */}
          <div className="space-y-xs overflow-hidden min-h-[190px]">
            <AnimatePresence initial={false}>
              {blocks.map((block) => (
                <motion.div
                  key={block.id}
                  initial={{ opacity: 0, y: -20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 20, scale: 0.95 }}
                  transition={{ duration: 0.4 }}
                  className="bg-surface-container-low border border-surface-variant rounded p-sm flex items-center justify-between"
                >
                  <div className="flex items-center gap-sm">
                    <div className="w-7 h-7 rounded bg-surface-container-highest flex items-center justify-center text-primary font-mono text-[10px] font-bold">
                      #{block.id.toString().slice(-3)}
                    </div>
                    <div className="flex flex-col">
                      <span className="font-mono text-xs font-semibold text-on-surface">
                        {block.hash}
                      </span>
                      <span className="text-[10px] text-on-surface-variant">
                        Block #{block.id} • {block.time}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-[11px] font-medium text-emerald-700">
                      Verified
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Floating Hash Verification Indicator */}
        <div className="bg-surface-container-lowest border border-surface-variant rounded-lg p-sm premium-shadow flex items-center justify-between opacity-90 transform translate-x-2">
          <div className="flex items-center gap-xs">
            <span className="material-symbols-outlined text-[16px] text-primary">verified</span>
            <span className="text-xs font-medium text-on-surface">Cryptographic Proof Active</span>
          </div>
          <span className="font-mono text-[10px] text-on-surface-variant">Consensus: 100%</span>
        </div>
      </div>
    </div>
  )
}

// Task 2 Helper Component: FAQ Accordion Item
function FAQItem({ question, answer, isOpen, onToggle }) {
  return (
    <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden transition-colors hover:border-outline-variant">
      <button
        className="w-full p-lg text-left flex justify-between items-center gap-md focus:outline-none"
        onClick={onToggle}
      >
        <span className="text-base font-semibold text-on-surface">{question}</span>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="material-symbols-outlined text-on-surface-variant"
        >
          expand_more
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="px-lg pb-lg pt-xs text-sm text-on-surface-variant leading-relaxed border-t border-surface-variant/50">
              {answer}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Landing() {
  const [scrolled, setScrolled] = useState(false)
  const [openFaqIndex, setOpenFaqIndex] = useState(null)

  useEffect(() => {
    document.documentElement.classList.add('scroll-smooth');
    
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true)
      } else {
        setScrolled(false)
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      document.documentElement.classList.remove('scroll-smooth');
    }
  }, [])

  const howItWorksSteps = [
    {
      icon: 'person_add',
      step: '01',
      title: 'Register & Get Verified',
      description: 'Sign up for a BlockBank account in minutes with secure digital identity validation.'
    },
    {
      icon: 'admin_panel_settings',
      step: '02',
      title: 'Admin Approves Your Account',
      description: 'Our admin team verifies user identity details ensuring an authorized, compliant ecosystem.'
    },
    {
      icon: 'payments',
      step: '03',
      title: 'Send Money Securely',
      description: 'Perform instantaneous peer-to-peer transfers protected by encrypted pin authorizations.'
    },
    {
      icon: 'verified',
      step: '04',
      title: 'Every Transaction Blockchain-Verified',
      description: 'Each payment is cryptographically hashed with SHA-256 and appended to the immutable block ledger.'
    }
  ]

  const faqs = [
    {
      question: 'Is this real money?',
      answer: 'No, BlockBank is a simulated digital banking platform built for educational and demonstration purposes. All balances and transactions are virtual.'
    },
    {
      question: 'How is my data secured?',
      answer: 'We utilize SHA-256 cryptographic hashing to seal transaction blocks, ensuring end-to-end data integrity and protection against unauthorized tampering.'
    },
    {
      question: 'What is the blockchain ledger?',
      answer: 'The blockchain ledger is a transparent, sequential record of transaction blocks. Once a transaction is appended, its SHA-256 hash guarantees it cannot be modified or deleted.'
    },
    {
      question: 'How does fraud detection work?',
      answer: 'Our real-time anomaly engine checks transaction patterns, amounts, and frequency against security rules to flag suspicious transfers instantly.'
    },
    {
      question: 'Is there a transaction PIN?',
      answer: 'Yes, every money transfer requires authorization with a personal secret PIN to prevent unauthorized fund movements.'
    },
    {
      question: 'How do I get approved?',
      answer: 'After registering an account, your application is submitted to the admin dashboard where an administrator reviews and approves your access.'
    }
  ]

  return (
    <div className="font-sans antialiased text-on-surface bg-surface-container-lowest relative min-h-screen">
      <div className="fixed inset-0 grid-pattern pointer-events-none z-[-1]"></div>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 h-16 z-50 glass-panel border-b border-surface-variant flex items-center justify-between px-margin-mobile md:px-margin-desktop transition-all duration-300 ${scrolled ? 'premium-shadow' : ''}`} id="main-nav">
        <div className="flex items-center gap-sm">
          <span className="material-symbols-outlined text-[28px] text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
          <span className="font-sans text-xl font-bold text-on-surface tracking-tight">BlockBank</span>
        </div>
        <div className="hidden md:flex items-center gap-lg">
          <a className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors" href="#features">Features</a>
          <a className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors" href="#how-it-works">How It Works</a>
          <a className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors" href="#about-us">About Us</a>
          <a className="text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors" href="#faq">FAQ</a>
        </div>
        <div className="flex items-center gap-md">
          <Link className="hidden md:block text-sm font-medium text-on-surface hover:opacity-80 transition-opacity" to="/login">Sign In</Link>
          <Link className="bg-primary text-on-primary text-sm font-medium px-lg py-sm rounded hover:opacity-90 transition-opacity" to="/register">Open Account</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-32 pb-2xl px-margin-mobile md:px-margin-desktop min-h-[90vh] flex flex-col justify-center relative overflow-hidden">
        <div className="max-w-[1280px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-gutter relative z-10">
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className="inline-flex items-center gap-xs px-sm py-[2px] rounded-full border border-surface-variant bg-surface-container-low mb-lg w-max">
              <span className="material-symbols-outlined text-[14px] text-tertiary-fixed-dim">lock</span>
              <span className="font-mono text-xs text-on-surface-variant uppercase tracking-wider">Secure • Transparent • Trusted</span>
            </div>
            <h1 className="font-sans text-5xl md:text-[64px] leading-[1.05] tracking-[-0.03em] font-semibold text-on-surface mb-lg max-w-[800px]">
              Blockchain Based Banking.<br />
              <span className="text-on-surface-variant">Secure Every Transaction.</span>
            </h1>
            <p className="text-lg text-on-surface-variant mb-xl max-w-[600px] leading-relaxed">
              BlockBank is an online banking platform that uses blockchain technology to ensure secure transactions and real-time fraud detection. Your money. Your trust. Our responsibility.
            </p>
            <div className="flex flex-col sm:flex-row gap-md">
              <Link className="bg-primary text-on-primary text-sm font-medium px-2xl py-md rounded hover:bg-primary-container hover:text-on-primary-container transition-colors shadow-sm flex items-center justify-center gap-sm h-12" to="/register">
                Open Account
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
              <a href="#how-it-works" className="bg-surface-container-lowest text-on-surface text-sm font-medium px-2xl py-md rounded border border-surface-variant hover:bg-surface-container-low transition-colors flex items-center justify-center gap-sm h-12">
                Learn More
              </a>
            </div>
            <div className="mt-2xl flex items-center gap-lg border-t border-surface-variant pt-lg max-w-[600px]">
              <div className="flex items-center gap-sm">
                <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px] text-primary">lock</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-on-surface">SHA-256</span>
                  <span className="font-sans text-[12px] text-on-surface-variant">Cryptographic Security</span>
                </div>
              </div>
              <div className="w-px h-8 bg-surface-variant"></div>
              <div className="flex items-center gap-sm">
                <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px] text-primary">shield_lock</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-on-surface">Real-Time</span>
                  <span className="font-sans text-[12px] text-on-surface-variant">Fraud Detection</span>
                </div>
              </div>
              <div className="w-px h-8 bg-surface-variant hidden sm:block"></div>
              <div className="flex items-center gap-sm hidden sm:flex">
                <div className="w-8 h-8 rounded-full bg-surface-container flex items-center justify-center">
                  <span className="material-symbols-outlined text-[16px] text-primary">verified_user</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl font-bold text-on-surface">Secure</span>
                  <span className="font-sans text-[12px] text-on-surface-variant">Digital Banking</span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative hidden lg:block h-[600px]">
            {/* Animated Security Visual replacing fake transaction mock */}
            <BlockchainVisual />
          </div>
        </div>
      </header>

      {/* Features Bento Grid */}
      <section className="py-2xl px-margin-mobile md:px-margin-desktop bg-surface" id="features">
        <div className="max-w-[1280px] mx-auto">
          <div className="mb-xl max-w-[600px]">
            <div className="inline-flex items-center gap-xs text-primary mb-sm">
              <span className="material-symbols-outlined text-[18px]">shield</span>
              <span className="font-medium text-sm">Our Security. Your Trust.</span>
            </div>
            <h2 className="text-3xl font-semibold text-on-surface mb-md">Built for Secure Banking & Fraud Protection</h2>
            <p className="text-base text-on-surface-variant">BlockBank combines blockchain technology with advanced fraud detection to deliver a safe, transparent and reliable banking experience.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
            {/* Bento Item 1: Large */}
            <div className="md:col-span-8 bg-surface-container-lowest border border-surface-variant rounded-xl p-lg md:p-xl flex flex-col justify-between group hover:border-outline-variant transition-colors overflow-hidden relative min-h-[300px]">
              <div className="relative z-10 max-w-[400px]">
                <div className="w-12 h-12 rounded border border-surface-variant bg-surface-container flex items-center justify-center mb-lg">
                  <span className="material-symbols-outlined text-on-surface">cloud_done</span>
                </div>
                <h3 className="text-lg font-semibold text-on-surface mb-sm">Immutable Transaction Records</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">Maintain permanent and verifiable transaction records with blockchain technology, ensuring data integrity, transparency, and trust across the banking ecosystem.</p>
              </div>
              <div className="absolute bottom-0 right-0 w-2/3 h-2/3 opacity-30 group-hover:opacity-50 transition-opacity duration-500 pointer-events-none">
                <div className="w-full h-full bg-[linear-gradient(45deg,transparent_25%,var(--color-surface-variant)_25%,var(--color-surface-variant)_50%,transparent_50%,transparent_75%,var(--color-surface-variant)_75%,var(--color-surface-variant)_100%)] bg-[length:20px_20px]"></div>
              </div>
            </div>
            {/* Bento Item 2: Small */}
            <div className="md:col-span-4 bg-surface-container-lowest border border-surface-variant rounded-xl p-lg md:p-xl flex flex-col justify-between group hover:border-outline-variant transition-colors min-h-[300px]">
              <div>
                <div className="w-12 h-12 rounded border border-surface-variant bg-surface-container flex items-center justify-center mb-lg">
                  <span className="material-symbols-outlined text-on-surface">verified_user</span>
                </div>
                <h3 className="text-lg font-semibold text-on-surface mb-sm">Secure & Verified Transactions</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed mb-md">All transactions are validated using cryptographic algorithms to ensure authenticity and data integrity at every step.</p>
              </div>
              <div className="mt-auto">
                <div className="flex gap-xs flex-wrap">
                  <span className="px-sm py-xs border border-surface-variant rounded font-mono text-xs text-on-surface-variant">Encrypted</span>
                  <span className="px-sm py-xs border border-surface-variant rounded font-mono text-xs text-on-surface-variant">Decentralized</span>
                  <span className="px-sm py-xs border border-surface-variant rounded font-mono text-xs text-on-surface-variant">Immutable</span>
                </div>
              </div>
            </div>
            {/* Bento Item 3: Medium */}
            <div className="md:col-span-6 bg-surface-container-lowest border border-surface-variant rounded-xl p-lg md:p-xl flex flex-col justify-between group hover:border-outline-variant transition-colors min-h-[300px]">
              <div>
                <div className="w-12 h-12 rounded border border-surface-variant bg-surface-container flex items-center justify-center mb-lg">
                  <span className="material-symbols-outlined text-on-surface">gpp_good</span>
                </div>
                <h3 className="text-lg font-semibold text-on-surface mb-sm">Fraud Detection System</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed mb-lg">Our intelligent system analyzes transaction patterns in real-time and alerts you instantly if any suspicious activity is detected.</p>
                <a href="#how-it-works" className="inline-flex items-center gap-xs text-sm font-medium text-primary hover:opacity-80 transition-opacity">
                  Learn how it works
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </a>
              </div>
            </div>
            {/* Bento Item 4: Medium */}
            <div className="md:col-span-6 bg-black text-white rounded-xl p-lg md:p-xl flex flex-col justify-between min-h-[300px] relative overflow-hidden">
              <div className="relative z-10">
                <div className="w-12 h-12 rounded border border-white/30 bg-white/10 flex items-center justify-center mb-lg">
                  <span className="material-symbols-outlined text-white">currency_rupee</span>
                </div>

                <h3 className="text-lg font-semibold text-white mb-sm">
                  Safe & Fast Banking
                </h3>

                <p className="text-sm text-white/80 leading-relaxed mb-lg">
                  Experience seamless banking with instant fund transfers, minimal fees,
                  and maximum security for your money.
                </p>

                <div className="flex flex-wrap gap-md mt-auto">
                  <div className="flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[16px] text-white">
                      bolt
                    </span>
                    <span className="text-xs font-medium text-white">
                      Instant Transfers
                    </span>
                  </div>

                  <div className="flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[16px] text-white">
                      percent
                    </span>
                    <span className="text-xs font-medium text-white">
                      Low Fees
                    </span>
                  </div>

                  <div className="flex items-center gap-xs">
                    <span className="material-symbols-outlined text-[16px] text-white">
                      schedule
                    </span>
                    <span className="text-xs font-medium text-white">
                      24/7 Banking
                    </span>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-8 -right-8 w-48 h-48 border border-white/20 rounded-full opacity-50 pointer-events-none"></div>
              <div className="absolute -bottom-16 -right-16 w-64 h-64 border border-white/10 rounded-full opacity-30 pointer-events-none"></div>
            </div>

          </div>
        </div>
      </section>

      {/* SECTION 1: How It Works */}
      <section className="py-2xl px-margin-mobile md:px-margin-desktop border-t border-surface-variant bg-surface-container-lowest" id="how-it-works">
        <div className="max-w-[1280px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="mb-xl text-center max-w-[700px] mx-auto"
          >
            <div className="inline-flex items-center gap-xs text-primary mb-sm justify-center">
              <span className="material-symbols-outlined text-[18px]">account_tree</span>
              <span className="font-medium text-sm uppercase tracking-wider">Step-by-Step Flow</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold text-on-surface mb-md">How BlockBank Works</h2>
            <p className="text-base text-on-surface-variant">Simple, transparent, and cryptographically secured banking architecture from registration to transaction ledger verification.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter">
            {howItWorksSteps.map((step, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-50px' }}
                transition={{ duration: 0.5, delay: idx * 0.15 }}
                className="bg-surface-container-low border border-surface-variant rounded-xl p-lg flex flex-col justify-between hover:border-outline-variant transition-all hover:-translate-y-1 relative"
              >
                <div>
                  <div className="flex items-center justify-between mb-lg">
                    <div className="w-12 h-12 rounded border border-surface-variant bg-surface-container-lowest flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-[24px]">{step.icon}</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-on-surface-variant opacity-40">
                      STEP {step.step}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-on-surface mb-xs">{step.title}</h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* SECTION 2: About Us */}
      <section className="py-2xl px-margin-mobile md:px-margin-desktop border-t border-surface-variant bg-surface" id="about-us">
        <div className="max-w-[1280px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center"
          >
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-xs text-primary mb-sm">
                <span className="material-symbols-outlined text-[18px]">info</span>
                <span className="font-medium text-sm uppercase tracking-wider">Project Overview</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold text-on-surface mb-md">About BlockBank</h2>
              <p className="text-base text-on-surface-variant leading-relaxed mb-lg">
                BlockBank is a modern, blockchain-secured banking simulation built as a student project. It demonstrates how cryptographic ledgers, strict admin verification, and intelligent real-time fraud detection can reshape online banking into an unalterable, trust-first experience.
              </p>
              <div className="flex items-center gap-md">
                <Link to="/register" className="bg-primary text-on-primary text-sm font-medium px-xl py-sm rounded hover:opacity-90 transition-opacity">
                  Try Demo Now
                </Link>
                <a href="#faq" className="text-sm font-medium text-on-surface hover:text-primary transition-colors">
                  Read FAQs &rarr;
                </a>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-2 gap-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="bg-surface-container-lowest border border-surface-variant rounded-xl p-md text-center flex flex-col items-center justify-center min-h-[140px]"
              >
                <span className="material-symbols-outlined text-[28px] text-primary mb-xs">lock</span>
                <span className="text-lg font-bold text-on-surface">SHA-256</span>
                <span className="text-xs text-on-surface-variant">Encrypted Ledger</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="bg-surface-container-lowest border border-surface-variant rounded-xl p-md text-center flex flex-col items-center justify-center min-h-[140px]"
              >
                <span className="material-symbols-outlined text-[28px] text-primary mb-xs">radar</span>
                <span className="text-lg font-bold text-on-surface">Real-Time</span>
                <span className="text-xs text-on-surface-variant">Fraud Detection</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.3 }}
                className="bg-surface-container-lowest border border-surface-variant rounded-xl p-md text-center flex flex-col items-center justify-center min-h-[140px]"
              >
                <span className="material-symbols-outlined text-[28px] text-primary mb-xs">verified_user</span>
                <span className="text-lg font-bold text-on-surface">Admin-Verified</span>
                <span className="text-xs text-on-surface-variant">Account Security</span>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="bg-surface-container-lowest border border-surface-variant rounded-xl p-md text-center flex flex-col items-center justify-center min-h-[140px]"
              >
                <span className="material-symbols-outlined text-[28px] text-primary mb-xs">school</span>
                <span className="text-lg font-bold text-on-surface">Student Project</span>
                <span className="text-xs text-on-surface-variant">Hackathon Build</span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* SECTION 3: FAQ */}
      <section className="py-2xl px-margin-mobile md:px-margin-desktop border-t border-surface-variant bg-surface-container-lowest" id="faq">
        <div className="max-w-[900px] mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6 }}
            className="mb-xl text-center max-w-[600px] mx-auto"
          >
            <div className="inline-flex items-center gap-xs text-primary mb-sm justify-center">
              <span className="material-symbols-outlined text-[18px]">help</span>
              <span className="font-medium text-sm uppercase tracking-wider">Questions & Answers</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold text-on-surface mb-md">Frequently Asked Questions</h2>
            <p className="text-base text-on-surface-variant">Everything you need to know about BlockBank's features, security model, and blockchain technology.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-md"
          >
            {faqs.map((faq, idx) => (
              <FAQItem
                key={idx}
                question={faq.question}
                answer={faq.answer}
                isOpen={openFaqIndex === idx}
                onToggle={() => setOpenFaqIndex(openFaqIndex === idx ? null : idx)}
              />
            ))}
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface-container-lowest border-t border-surface-variant py-14 px-6 md:px-16">
        <div className="max-w-7xl mx-auto">

          <div className="grid grid-cols-1 md:grid-cols-5 gap-10">

            {/* Logo */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="material-symbols-outlined text-primary text-3xl"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  account_balance
                </span>

                <h2 className="text-2xl font-bold text-on-surface">
                  BlockBank
                </h2>
              </div>

              <p className="text-sm leading-7 text-on-surface-variant w-full">
                Secure blockchain-powered banking platform providing transparent,
                tamper-proof transactions with real-time fraud detection for safer
                digital banking.
              </p>

              <div className="mt-6 text-sm text-on-surface-variant">
                © 2026 BlockBank India Pvt. Ltd.
                <br />
                All Rights Reserved.
              </div>
            </div>

            {/* Banking */}
            <div>
              <h3 className="font-semibold text-on-surface mb-5">
                Banking
              </h3>

              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-primary">Open Account</a></li>
                <li><a href="#" className="hover:text-primary">Money Transfer</a></li>
                <li><a href="#" className="hover:text-primary">Transaction History</a></li>
                <li><a href="#" className="hover:text-primary">Beneficiaries</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-semibold text-on-surface mb-5">
                Company
              </h3>

              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-primary">About Us</a></li>
                <li><a href="#" className="hover:text-primary">Careers</a></li>
                <li><a href="#" className="hover:text-primary">Contact</a></li>
                <li><a href="#" className="hover:text-primary">Blog</a></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h3 className="font-semibold text-on-surface mb-5">
                Support
              </h3>

              <ul className="space-y-3 text-sm">
                <li><a href="#" className="hover:text-primary">Help Center</a></li>
                <li><a href="#" className="hover:text-primary">Report Fraud</a></li>
                <li><a href="#" className="hover:text-primary">Security</a></li>
                <li><a href="#" className="hover:text-primary">Privacy Policy</a></li>
              </ul>
            </div>

          </div>

          {/* Bottom */}
          <div className="border-t border-surface-variant mt-12 pt-6 flex flex-col md:flex-row justify-between items-center gap-4">

            <p className="text-sm text-on-surface-variant">
              Built with Blockchain • SHA-256 Encryption • Fraud Detection
            </p>

            <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-primary">Terms</a>
              <a href="#" className="hover:text-primary">Privacy</a>
              <a href="#" className="hover:text-primary">Cookies</a>
            </div>

          </div>

        </div>
      </footer>
    </div>
  )
}

export default Landing
