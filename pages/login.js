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
      setError(authError.message === 'Invalid login credentials' ? 'Email ou mot de passe incorrect' : authError.message)
      setLoading(false)
      return
    }

    router.replace('/dashboard')
  }

  if (initialCheck) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-paper via-[#F2EFE8] to-paper">
        <div className="w-8 h-8 border-2 border-sage/30 border-t-sage rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-paper via-[#F2EFE8] to-paper px-4">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="card p-8">
          {/* Logo */}
          <div className="text-center mb-7">
            <div className="w-14 h-14 rounded-2xl bg-sage flex items-center justify-center mx-auto mb-4 shadow-md">
              <PackageSearch className="w-7 h-7 text-white" />
            </div>
            <h1 className="font-serif text-2xl font-bold text-ink">
              Registre de Revente
            </h1>
            <p className="text-sm text-ink/40 mt-1.5">
              Connecte-toi pour gérer ton stock et tes ventes
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-terracotta/10 border border-terracotta/20 text-terracotta text-sm px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink/60 mb-1">Email</label>
              <input id="email" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field w-full" placeholder="exemple@email.com" autoComplete="email" />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink/60 mb-1">Mot de passe</label>
              <input id="password" type="password" required value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field w-full" placeholder="••••••••" autoComplete="current-password" />
            </div>

            <button type="submit" disabled={loading} className="btn-sage w-full">
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
