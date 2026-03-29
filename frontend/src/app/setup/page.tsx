"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const TOPICS = [
  { id: "arrays", label: "Arrays", icon: "📊", desc: "Sorting, searching, sliding window" },
  { id: "strings", label: "Strings", icon: "🔤", desc: "Manipulation, parsing, matching" },
  { id: "trees", label: "Trees", icon: "🌳", desc: "Traversal, BST, balanced trees" },
  { id: "graphs", label: "Graphs", icon: "🕸️", desc: "BFS, DFS, shortest path" },
  { id: "dp", label: "Dynamic Programming", icon: "🧩", desc: "Memoization, tabulation" },
  { id: "linked-lists", label: "Linked Lists", icon: "🔗", desc: "Reversal, cycle detection" },
];

const DIFFICULTIES = [
  { id: "easy", label: "Easy", color: "#22c55e" },
  { id: "medium", label: "Medium", color: "#f59e0b" },
  { id: "hard", label: "Hard", color: "#ef4444" },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function SetupPage() {
  const router = useRouter();
  const [selectedTopic, setSelectedTopic] = useState("arrays");
  const [difficulty, setDifficulty] = useState("medium");
  const [isLoading, setIsLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push("/login?redirect=/setup");
      } else {
        setUser(session.user);
      }
    });
  }, [router]);

  const handleStartInterview = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          topic: selectedTopic, 
          difficulty, 
          user_id: user?.id 
        }),
      });

      if (!res.ok) throw new Error("Failed to start interview");

      const data = await res.json();
      sessionStorage.setItem("interview_session", JSON.stringify(data));
      sessionStorage.setItem("interview_topic", selectedTopic);
      sessionStorage.setItem("interview_difficulty", difficulty);

      router.push("/interview");
    } catch (err) {
      console.error("Failed to start:", err);
      alert("Failed to start interview. Make sure the backend is running.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-20 bg-grid-white">
      <div className="text-center mb-12 animate-fade-in-up">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
          Personalize Your <span className="text-blue-500">Session</span>
        </h1>
        <p className="text-gray-400 text-lg max-w-md mx-auto">
          Choose your battleground and difficulty to begin your high-stakes technical assessment.
        </p>
      </div>

      <div className="w-full max-w-3xl space-y-12 bg-white/5 border border-white/10 p-8 md:p-12 rounded-[2.5rem] backdrop-blur-3xl shadow-2xl animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        
        {/* Topic Selection */}
        <section>
          <h2 className="text-sm font-bold text-blue-500 uppercase tracking-widest mb-6">1. Target Topic</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {TOPICS.map((topic) => (
              <button
                key={topic.id}
                onClick={() => setSelectedTopic(topic.id)}
                className={`relative p-5 rounded-2xl border text-left transition-all duration-300
                  ${selectedTopic === topic.id
                      ? "bg-blue-600/10 border-blue-500 shadow-lg shadow-blue-500/10"
                      : "bg-[#0a0a0f] border-white/10 hover:border-white/20"
                  }`}
              >
                <div className="text-2xl mb-2">{topic.icon}</div>
                <div className="font-bold text-sm mb-1">{topic.label}</div>
                <div className="text-xs text-gray-500 leading-relaxed">{topic.desc}</div>
                {selectedTopic === topic.id && (
                  <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_white]" />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Difficulty Selection */}
        <section>
          <h2 className="text-sm font-bold text-blue-500 uppercase tracking-widest mb-6">2. Difficulty Level</h2>
          <div className="flex gap-4">
            {DIFFICULTIES.map((d) => (
              <label
                key={d.id}
                className={`flex-1 flex items-center justify-center gap-3 py-4 px-6 rounded-2xl border cursor-pointer transition-all duration-300
                  ${difficulty === d.id
                      ? "border-blue-500 bg-blue-600/10"
                      : "border-white/10 bg-[#0a0a0f] hover:border-white/20"
                  }`}
              >
                <input
                  type="radio"
                  name="difficulty"
                  value={d.id}
                  checked={difficulty === d.id}
                  onChange={() => setDifficulty(d.id)}
                  className="sr-only"
                />
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span className="font-bold text-sm uppercase tracking-wide">{d.label}</span>
              </label>
            ))}
          </div>
        </section>

        <button
          onClick={handleStartInterview}
          disabled={isLoading}
          className="w-full py-5 rounded-2xl font-black text-lg bg-blue-600 hover:bg-blue-500 transition-all shadow-xl shadow-blue-600/30 disabled:opacity-50 active:scale-[0.98] flex items-center justify-center gap-3"
        >
          {isLoading ? (
            <div className="flex gap-1.5 py-1">
              <span className="typing-dot bg-white" />
              <span className="typing-dot bg-white" />
              <span className="typing-dot bg-white" />
            </div>
          ) : (
            <>🚀 Launch Interview</>
          )}
        </button>
      </div>
    </main>
  );
}
