import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { getSupabaseClient } from '../lib/supabaseClient'

export default function AuthGuard({ children }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    let cancelled = false

    const checkSession = async () => {
      const {
        data: { session },
      } = await getSupabaseClient().auth.getSession()

      if (cancelled) return

      if (session) {
        setAuthenticated(true)
      } else {
        router.replace('/login')
      }
      setLoading(false)
    }

    checkSession()

    const {
      data: { subscription },
    } = getSupabaseClient().auth.onAuthStateChange((_event, session) => {
      if (cancelled) return

      if (session) {
        setAuthenticated(true)
      } else {
        setAuthenticated(false)
        router.replace('/login')
      }
    })

    return () => {
      cancelled = true
      subscription?.unsubscribe()
    }
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin h-8 w-8 border-4 border-gray-300 border-t-gray-800 rounded-full" />
          <p className="text-sm text-gray-500">Chargement…</p>
        </div>
      </div>
    )
  }

  if (!authenticated) return null

  return children
}
