'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Dashboard() {
  const [interviews, setInterviews] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser(data.user)
        fetchInterviews(data.user.id)
      } else {
        window.location.href = '/login'
      }
    })
  }, [])

  const fetchInterviews = async (userId: string) => {
    const { data } = await supabase.from('interviews').select('*').eq('user_id', userId).order('created_at', { ascending: false })
    if (data) setInterviews(data)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (!user) return <div className="text-white p-10 text-center flex items-center justify-center min-h-screen bg-gray-950">Loading Dashboard Data...</div>

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-6xl mx-auto mt-10">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 mb-2">
              Performance Dashboard
            </h1>
            <p className="text-gray-400 font-medium">Tracking interview history for {user.email}</p>
          </div>
          <div className="flex gap-4">
            <button onClick={() => window.location.href = '/'} className="px-6 py-2.5 bg-blue-600 rounded-xl hover:bg-blue-500 transition font-bold shadow-lg shadow-blue-500/20">New Interview</button>
            <button onClick={handleLogout} className="px-6 py-2.5 bg-gray-800 rounded-xl hover:bg-gray-700 transition font-bold border border-gray-700">Sign Out</button>
          </div>
        </div>
        
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-800/80 text-gray-300 text-sm tracking-wider uppercase">
                <th className="p-5 font-bold">Date</th>
                <th className="p-5 font-bold">Topic</th>
                <th className="p-5 font-bold">Difficulty</th>
                <th className="p-5 font-bold text-center">Score</th>
                <th className="p-5 font-bold w-1/3">AI Feedback</th>
              </tr>
            </thead>
            <tbody>
              {interviews.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-16 text-center text-gray-500">
                    <p className="text-xl mb-4 font-medium">No interviews logged yet.</p>
                    <button onClick={() => window.location.href = '/'} className="px-6 py-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700">Start Your First Interview</button>
                  </td>
                </tr>
              ) : interviews.map(i => (
                <tr key={i.id} className="border-t border-gray-800 hover:bg-gray-800/40 transition">
                  <td className="p-5 text-gray-400 font-medium">{new Date(i.created_at).toLocaleDateString()}</td>
                  <td className="p-5 font-semibold text-blue-400">{i.topic}</td>
                  <td className="p-5 capitalize text-gray-300 font-medium">{i.difficulty}</td>
                  <td className="p-5 text-center">
                    <span className={`px-3 py-1.5 rounded-md text-sm font-bold tracking-wide ${i.score_out_of_10 >= 7 ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {i.score_out_of_10 ? `${i.score_out_of_10}/10` : 'N/A'}
                    </span>
                  </td>
                  <td className="p-5 text-gray-400 text-sm line-clamp-2 leading-relaxed" title={i.feedback}>{i.feedback || 'Pending final feedback'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
