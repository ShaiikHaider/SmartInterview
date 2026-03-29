'use client'
import { useEffect, useState, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

export default function Navigation() {
  const pathname = usePathname()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setIsMenuOpen(false)
    router.push('/')
  }

  // Hide header during interview and login for clean look
  if (pathname === '/interview' || pathname === '/login') return null

  return (
    <nav className="fixed top-0 left-0 right-0 h-20 border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-xl z-[50] flex items-center justify-between px-8 md:px-12">
      <Link href="/" className="flex items-center gap-3 group">
        <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
          <img 
            src="/images/logo.png" 
            alt="Vouch ez" 
            className="w-full h-full object-cover"
          />
        </div>
        <span className="text-2xl font-black bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent tracking-tighter">
          Vouch ez
        </span>
      </Link>

      <div className="flex items-center gap-8">
        <Link href="/dashboard" className={`text-sm font-semibold transition-colors ${pathname === '/dashboard' ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}>
          Dashboard
        </Link>
        
        {user ? (
          <div className="flex items-center gap-4 relative" ref={menuRef}>
            <Link 
              href="/setup" 
              className="px-5 py-2.5 rounded-xl bg-blue-600 font-bold text-sm text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/25 active:scale-95"
            >
              Start Interview
            </Link>
            
            {/* Avatar Button */}
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`w-10 h-10 rounded-full border transition-all flex items-center justify-center text-sm font-black uppercase ring-offset-2 ring-offset-[#0a0a0f] 
                ${isMenuOpen ? 'border-blue-500 ring-2 ring-blue-500 bg-blue-600/10' : 'border-white/10 bg-white/5 hover:bg-white/10 text-gray-300'}`}
            >
              {user.email?.[0]}
            </button>

            {/* Dropdown Menu - Simplified */}
            {isMenuOpen && (
              <div className="absolute top-14 right-0 w-64 bg-[#12121a]/95 border border-white/10 rounded-3xl p-3 shadow-2xl backdrop-blur-2xl animate-fade-in-up origin-top-right">
                <div className="px-4 py-3 border-b border-white/5 mb-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Signed in as</p>
                  <p className="text-sm font-bold text-white truncate">{user.email}</p>
                </div>
                
                <div className="mt-1">
                  <button 
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl hover:bg-red-500/10 transition-colors group"
                  >
                    <span className="text-gray-400 group-hover:text-red-500 transition-colors text-lg">🚪</span>
                    <span className="text-sm font-bold text-gray-300 group-hover:text-red-500 transition-colors">Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Link 
            href="/login" 
            className="px-5 py-2.5 rounded-xl bg-white text-black font-bold text-sm hover:bg-gray-100 transition shadow-lg active:scale-95"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  )
}
