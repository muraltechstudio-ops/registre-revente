import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      router.replace(session ? '/dashboard' : '/login')
    })
  }, [router])

  return (
    <div className="flex items-center justify-center min-h-screen bg-paper">
      <div className="w-8 h-8 border-2 border-sage/30 border-t-sage rounded-full animate-spin" />
    </div>
  )
}
