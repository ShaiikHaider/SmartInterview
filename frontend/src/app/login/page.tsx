'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

function AuthContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push(redirect)
    })
  }, [router, redirect])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/?verified=true` }
        })
        if (error) throw error
        setMessage('Check your email to confirm your account!')
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
        router.push(redirect)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0f] p-6">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md animate-fade-in-up">
        <div className="bg-white/5 border border-white/10 p-8 md:p-10 rounded-[2.5rem] backdrop-blur-3xl shadow-2xl">
          <div className="text-center mb-10">
            <Link href="/" className="inline-block mb-6 group">
                <div className="w-14 h-14 rounded-2xl overflow-hidden shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
                  <img 
                    src="/images/logo.png" 
                    alt="Vouch ez" 
                    className="w-full h-full object-cover"
                  />
                </div>
            </Link>
            <h1 className="text-3xl font-black tracking-tight mb-2 uppercase italic text-white/90">
              Vouch ez
            </h1>
            <p className="text-gray-400 text-sm">
              {isSignUp 
                ? 'Join Vouch ez to master technical skills.' 
                : 'Sign in to your account to continue.'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none transition-all"
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-gray-500 focus:border-blue-500 focus:outline-none transition-all"
              />
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold animate-shake">
                ⚠️ {error}
              </div>
            )}

            {message && (
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold">
                ✉️ {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-lg hover:bg-blue-500 transition-all shadow-xl shadow-blue-500/25 active:scale-95 disabled:opacity-50 disabled:active:scale-100"
            >
              {loading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-white/5 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-gray-400 text-sm hover:text-white transition-colors"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthContent />
    </Suspense>
  )
}
