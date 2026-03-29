'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function AuthPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (searchParams.get('verified')) {
      setMessage('Email verified successfully! You can now sign in below.')
      setIsSignUp(false)
    }
  }, [searchParams])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push(redirect)
    })
  }, [router, redirect])

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/?verified=true` }
        })
        if (error) throw error
        
        // Clear inputs and show success message
        setEmail('')
        setPassword('')
        setMessage('Registration successful! A verification link has been sent to your email. Please verify before signing in.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
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

  const handleOAuth = async (provider: 'github' | 'google') => {
    await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${redirect}` }
    })
  }

  return (
    <div className="flex-1 flex items-center justify-center bg-[#0a0a0f] relative overflow-hidden px-4 py-20">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 blur-[120px] rounded-full -z-10" />

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
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Email Address</label>
              <input 
                type="email" 
                placeholder="you@example.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 rounded-2xl bg-black/40 border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition text-sm"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-1">Password</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 rounded-2xl bg-black/40 border border-white/10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition text-sm"
                required
              />
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold animate-shake space-y-2">
                <div>⚠️ {error}</div>
                {error.includes('verified') && (
                  <button 
                    type="button"
                    onClick={async () => {
                      setLoading(true)
                      const { error } = await supabase.auth.resend({
                        type: 'signup',
                        email: email,
                      })
                      setLoading(false)
                      if (error) setError(error.message)
                      else setMessage('Verification email resent! Please check your inbox.')
                    }}
                    className="text-blue-400 hover:underline block"
                  >
                    Resend verification link?
                  </button>
                )}
              </div>
            )}

            {message && (
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-bold">
                ✅ {message}
              </div>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 transition-all font-black text-white shadow-xl shadow-blue-500/25 disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? 'Processing...' : (isSignUp ? 'Sign Up Now' : 'Sign In')}
            </button>
          </form>

          <div className="mt-8">
            <div className="relative mb-8 text-center">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
              <span className="relative px-4 text-[10px] font-black uppercase tracking-widest text-gray-500 bg-[#0a0a0f]/0 backdrop-blur-md">or use social</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleOAuth('github')} 
                className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition group"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-gray-400 group-hover:fill-white transition-colors"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors">GitHub</span>
              </button>
              <button 
                onClick={() => handleOAuth('google')} 
                className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition group"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                <span className="text-xs font-bold text-gray-400 group-hover:text-white transition-colors">Google</span>
              </button>
            </div>
          </div>

          <div className="mt-10 text-center">
            <button 
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-gray-400 text-sm hover:text-blue-400 transition-colors font-semibold"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
