"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

export default function HomePage() {
  const router = useRouter();
  const [selectedTopic, setSelectedTopic] = useState("arrays");
  const [difficulty, setDifficulty] = useState("medium");
  const [isLoading, setIsLoading] = useState(false);

  const handleStartInterview = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: selectedTopic, difficulty }),
      });

      if (!res.ok) throw new Error("Failed to start interview");

      const data = await res.json();

      // Store session data for interview page
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

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="text-center mb-12 animate-fade-in-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--accent-soft)] border border-[var(--border-accent)] text-sm text-[var(--accent)] mb-6">
          <span className="w-2 h-2 rounded-full bg-[var(--accent)] animate-pulse" />
          AI-Powered Mock Interviews
        </div>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-3">
          <span className="bg-gradient-to-r from-[var(--accent)] via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Interview Coach
          </span>
        </h1>
        <p className="text-[var(--text-secondary)] text-lg max-w-md mx-auto">
          Practice real FAANG-level technical interviews with an AI that challenges you.
        </p>
      </div>

      {/* Topic Selection */}
      <div className="w-full max-w-2xl mb-10 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
          Select Topic
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {TOPICS.map((topic) => (
            <button
              key={topic.id}
              id={`topic-${topic.id}`}
              onClick={() => setSelectedTopic(topic.id)}
              className={`group relative p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer
                ${
                  selectedTopic === topic.id
                    ? "bg-[var(--bg-card-selected)] border-[var(--border-accent)] shadow-[0_0_20px_var(--accent-glow)]"
                    : "bg-[var(--bg-card)] border-[var(--border)] hover:bg-[var(--bg-card-hover)] hover:border-[var(--text-muted)]"
                }`}
            >
              <div className="text-2xl mb-2">{topic.icon}</div>
              <div className="font-semibold text-sm">{topic.label}</div>
              <div className="text-xs text-[var(--text-muted)] mt-1">{topic.desc}</div>
              {selectedTopic === topic.id && (
                <div className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-[var(--accent)]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Difficulty Selection */}
      <div className="w-full max-w-2xl mb-10 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
        <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
          Difficulty
        </h2>
        <div className="flex gap-3">
          {DIFFICULTIES.map((d) => (
            <label
              key={d.id}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border cursor-pointer transition-all duration-200
                ${
                  difficulty === d.id
                    ? "border-[var(--border-accent)] bg-[var(--bg-card-selected)]"
                    : "border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)]"
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
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: d.color }}
              />
              <span className="font-medium text-sm">{d.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full max-w-2xl flex flex-col items-center gap-4 animate-fade-in-up" style={{ animationDelay: "0.3s" }}>
        <button
          id="start-interview-btn"
          onClick={handleStartInterview}
          disabled={isLoading}
          className="w-full py-4 rounded-xl font-semibold text-base bg-gradient-to-r from-[var(--accent)] to-purple-500 hover:from-purple-600 hover:to-[var(--accent)] transition-all duration-300 shadow-[0_0_30px_var(--accent-glow)] hover:shadow-[0_0_50px_var(--accent-glow)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Starting Interview...
            </span>
          ) : (
            "🚀 Start Interview"
          )}
        </button>

        <div className="flex gap-3 w-full">
          <button
            disabled
            className="flex-1 py-3 rounded-xl font-medium text-sm bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-muted)] cursor-not-allowed opacity-60"
          >
            📋 Daily Challenge
          </button>
          <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border)]">
            <span className="text-base">🔥</span>
            <span className="text-sm font-semibold text-[var(--warning)]">Streak: 5 days</span>
          </div>
        </div>
      </div>
    </main>
  );
}
