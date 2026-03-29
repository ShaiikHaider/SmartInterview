'use client'
import Link from 'next/link'
import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { useSearchParams } from 'next/navigation'

function LandingContent() {
  const searchParams = useSearchParams()
  const [user, setUser] = useState<any>(null)
  const [isVerified, setIsVerified] = useState(false)

  useEffect(() => {
    if (searchParams.get('verified')) {
      setIsVerified(true)
    }
  }, [searchParams])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })
  }, [])

  return (
    <main className="min-h-screen flex flex-col items-center bg-[#0a0a0f] text-white selection:bg-blue-500/30">
      {/* Background Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full animate-float" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full animate-float" style={{ animationDelay: '-3s' }} />
      </div>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 pt-32 pb-20 max-w-6xl mx-auto">
        {isVerified && (
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-xs font-bold text-green-500 mb-8 animate-fade-in-up">
            ✅ Email verified! You are ready to start.
          </div>
        )}
        
        <h1 className="text-5xl md:text-8xl font-black tracking-tight mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          Master the <span className="bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">FAANG</span> <br />
          Interview with <span className="text-blue-500 text-glow text-glow-animate">Vouch ez</span>
        </h1>
        
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-12 animate-fade-in-up leading-relaxed" style={{ animationDelay: '0.2s' }}>
          Experience high-pressure technical simulations with an AI that thinks, speaks, and challenges you like a Senior Engineer. 
          Real-time code execution, voice-activated feedback, and objective performance metrics.
        </p>

        <div className="flex flex-col md:flex-row items-center gap-6 animate-fade-in-up mb-12" style={{ animationDelay: '0.3s' }}>
          {user ? (
            <Link 
              href="/setup" 
              className="px-10 py-5 rounded-2xl bg-blue-600 font-black text-xl text-white hover:bg-blue-500 transition-all shadow-2xl shadow-blue-500/40 hover:scale-105 active:scale-95"
            >
              🚀 Start Free Session
            </Link>
          ) : (
            <>
              <Link 
                href="/login" 
                className="px-10 py-5 rounded-2xl bg-blue-600 font-black text-xl text-white hover:bg-blue-500 transition-all shadow-2xl shadow-blue-500/40 hover:scale-105 active:scale-95"
              >
                🚀 Get Started
              </Link>
              <Link 
                href="/login" 
                className="px-10 py-5 rounded-2xl bg-white/5 border border-white/10 font-black text-xl text-white hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
              >
                Sign In
              </Link>
            </>
          )}
        </div>

        {/* Mock Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 mt-8 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <div className="p-6 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-sm">
            <div className="text-3xl font-black mb-1">98%</div>
            <div className="text-xs text-gray-500 uppercase font-bold tracking-widest">Accuracy</div>
          </div>
          <div className="p-6 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-sm">
            <div className="text-3xl font-black mb-1">500+</div>
            <div className="text-xs text-gray-500 uppercase font-bold tracking-widest">Questions</div>
          </div>
          <div className="p-6 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-sm">
            <div className="text-3xl font-black mb-1 text-white">Real-time</div>
            <div className="text-xs text-gray-500 uppercase font-bold tracking-widest">Execution</div>
          </div>
          <div className="p-6 rounded-3xl bg-white/5 border border-white/5 backdrop-blur-sm">
            <div className="text-3xl font-black mb-1 text-white">Groq-70b</div>
            <div className="text-xs text-gray-500 uppercase font-bold tracking-widest">Core Engine</div>
          </div>
        </div>
      </section>

      {/* Features Preview */}
      <section className="bg-white/5 border-t border-white/10 py-24 px-6 w-full">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
            <div>
                <h2 className="text-4xl font-black mb-6">Real-world Code <br />Evaluation.</h2>
                <div className="space-y-6">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-500 font-bold shrink-0">01</div>
                        <div>
                            <h3 className="font-bold mb-1">Edge Case Detection</h3>
                            <p className="text-gray-400 text-sm">Our AI probes your solution for potential flaws before you commit.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </section>
    </main>
  )
}

export default function LandingPage() {
  return (
    <Suspense fallback={null}>
      <LandingContent />
    </Suspense>
  )
}
