import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import { PackageSearch } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/dashboard')
      else setChecking(false)
    })
  }, [router])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError(authError.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect' : authError.message)
      setLoading(false)
      return
    }
    router.replace('/dashboard')
  }

  if (checking) return (
    <div className="min-h-screen bg-page flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="card p-8 shadow-lg">
          <div className="text-center mb-7">
            <div className="w-16 h-16 rounded-2xl bg-navy flex items-center justify-center mx-auto mb-4 shadow-md">
              <PackageSearch className="w-8 h-8 text-goldlight" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-ink tracking-tight">Registre de Revente</h1>
            <p className="text-sm text-muted mt-2">Connecte-toi pour gérer ton stock</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && <div className="bg-rust/10 border border-rust/20 text-rust text-sm px-4 py-3 rounded-lg">{error}</div>}

            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Email</label>
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="input-field w-full" placeholder="exemple@email.com" autoComplete="email" />
            </div>
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Mot de passe</label>
              <input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full" placeholder="••••••••" autoComplete="current-password" />
            </div>

            <button type="submit" disabled={loading} className="btn-forest w-full !py-3">
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
