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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-paper via-[#F0EDE3] to-paper">
      <div className="w-10 h-10 border-2 border-sage/30 border-t-sage rounded-full animate-spin" />
    </div>
  )
}
