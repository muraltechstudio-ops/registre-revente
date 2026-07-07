import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabaseClient'
import { PackageSearch } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialCheck, setInitialCheck] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/dashboard')
      } else {
        setInitialCheck(false)
      }
    })
  }, [router])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      if (authError.message === 'Invalid login credentials') {
        setError('Email ou mot de passe incorrect')
      } else {
        setError(authError.message)
      }
      setLoading(false)
      return
    }

    router.replace('/dashboard')
  }

  if (initialCheck) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-paper via-[#F0EDE3] to-paper">
        <div className="w-10 h-10 border-2 border-sage/30 border-t-sage rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-paper via-[#F0EDE3] to-paper px-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-sage/5 blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-amber/5 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm relative"
      >
        <div className="glass-card rounded-2xl p-8">
          {/* Logo */}
          <div className="text-center mb-7">
            <div className="w-14 h-14 rounded-2xl bg-sage-gradient shadow-glow-sage flex items-center justify-center mx-auto mb-4">
              <PackageSearch className="w-7 h-7 text-white" />
            </div>
            <h1 className="font-serif text-2xl font-bold">
              <span className="gradient-text">Registre</span>
              <span className="text-ink/40"> de Revente</span>
            </h1>
            <p className="text-sm text-ink/40 mt-1.5 font-sans">
              Connecte-toi pour gérer ton stock et tes ventes
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-terracotta/10 border border-terracotta/20 text-terracotta text-sm px-4 py-3 rounded-xl"
              >
                {error}
              </motion.div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink/60 mb-1.5 font-sans">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm"
                placeholder="exemple@email.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink/60 mb-1.5 font-sans">
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm"
                placeholder="••••••••"
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full !py-3"
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
