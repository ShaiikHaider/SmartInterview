"use client";

import { useState, useEffect, useRef } from "react";
import CodeEditor from "@/components/CodeEditor";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Message {
  role: "user" | "ai";
  content: string;
}

const PHASE_LABELS: Record<string, string> = {
  hr_intro: "Introduction",
  hr_followup: "HR Follow-up",
  coding_problem: "Problem Statement",
  discussion: "Approach Discussion",
  coding: "Live Coding",
  technical: "Technical Questions",
  feedback: "Interview Feedback",
};

const PHASE_ICONS: Record<string, string> = {
  hr_intro: "👋",
  hr_followup: "💼",
  coding_problem: "📝",
  discussion: "💡",
  coding: "💻",
  technical: "🧠",
  feedback: "📊",
};

export default function InterviewPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [phase, setPhase] = useState("hr_intro");
  const [showEditor, setShowEditor] = useState(false);
  const [code, setCode] = useState("# Write your solution here\n\n");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const [isVoiceUnlocked, setIsVoiceUnlocked] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: any) => {
          let finalTranscript = "";
          for (let i = 0; i < event.results.length; ++i) {
            finalTranscript += event.results[i][0].transcript;
          }
          setInput(finalTranscript);
        };
        
        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
        };
        
        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        setInput(""); 
        recognitionRef.current.start();
        setIsListening(true);
      } else {
        alert("Speech recognition is not supported in this browser. Try Chrome or Edge.");
      }
    }
  };

  const speakMessage = (text: string) => {
    if (!isVoiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    let cleanText = text.replace(/```[\s\S]*?```/g, " Code block omitted. ");
    cleanText = cleanText.replace(/\[.*?\]/g, ""); 
    cleanText = cleanText.replace(/[*_#`]/g, "");
    
    if (!cleanText.trim()) return;

    const utterance = new SpeechSynthesisUtterance(cleanText.trim());
    utterance.rate = 1.05;
    
    utterance.onend = () => {
      // Auto-start listening after AI finishes speaking for seamless flow
      if (recognitionRef.current && !isListening) {
        recognitionRef.current.start();
        setIsListening(true);
      }
    };

    window.speechSynthesis.speak(utterance);
  };

  // Load session data on mount
  useEffect(() => {
    const sessionData = sessionStorage.getItem("interview_session");
    const storedTopic = sessionStorage.getItem("interview_topic") || "";
    const storedDifficulty = sessionStorage.getItem("interview_difficulty") || "";

    setTopic(storedTopic);
    setDifficulty(storedDifficulty);

    if (sessionData) {
      const data = JSON.parse(sessionData);
      setSessionId(data.session_id);
      setPhase(data.phase);
      setShowEditor(data.showEditor);
      setMessages([{ role: "ai", content: data.message }]);
    }
  }, []);

  const handleStartVoice = () => {
    setIsVoiceUnlocked(true);
    const sessionData = sessionStorage.getItem("interview_session");
    if (sessionData) {
      const data = JSON.parse(sessionData);
      speakMessage(data.message);
    }
  };

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input after loading
  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !sessionId) return;

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

    const userMessage = input.trim();

    // If in coding phase, append code to message
    let messageToSend = userMessage;
    if (showEditor && code.trim() !== "# Write your solution here") {
      messageToSend = `${userMessage}\n\n[CODE]\n${code}`;
    }

    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch(`${API_URL}/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, message: messageToSend }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      const data = await res.json();
      setPhase(data.phase);
      setShowEditor(data.showEditor);
      setMessages((prev) => [...prev, { role: "ai", content: data.message }]);
      speakMessage(data.message);
    } catch (err) {
      console.error("Message error:", err);
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "[Connection error. Please try again.]" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunCode = async () => {
    if (!sessionId || isLoading) return;
    
    setIsLoading(true);
    setMessages(prev => [...prev, { role: "user", content: `[Running code evaluation...]\n\n${code}` }]);
    
    try {
      const res = await fetch(`${API_URL}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, code }),
      });
      if (!res.ok) throw new Error("Failed to execute code");
      const data = await res.json();
      
      setPhase(data.phase);
      setShowEditor(data.phase === "coding");
      
      const aiResponse = `[Test Results]\nPassed: ${data.passed}\nFeedback: ${data.feedback}\nOutput: ${data.test_cases_output}\n\n${
        data.phase === "technical" 
          ? "Great job! Let's move to the technical questions." 
          : data.phase === "feedback" 
          ? "Maximum attempts reached. Moving to final review." 
          : "Please fix the issues and try again."
      }`;
      setMessages(prev => [...prev, { role: "ai", content: aiResponse }]);
      speakMessage(aiResponse);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: "ai", content: "[Execution error. Please try again.]" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const phaseIndex = Object.keys(PHASE_LABELS).indexOf(phase);
  const totalPhases = Object.keys(PHASE_LABELS).length;
  const progress = ((phaseIndex + 1) / totalPhases) * 100;

  return (
    <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
      {!isVoiceUnlocked && (
        <div className="absolute inset-0 z-[100] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
          <div className="max-w-md bg-[var(--bg-card)] border border-[var(--border-accent)] rounded-3xl p-10 shadow-2xl animate-scale-in">
            <div className="text-6xl mb-6">🤖</div>
            <h2 className="text-2xl font-bold text-white mb-4">Voice Interview Ready</h2>
            <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">
              Your AI interviewer is waiting. Click the button below to unlock audio and begin your hands-free technical assessment.
            </p>
            <button
              onClick={handleStartVoice}
              className="w-full py-4 rounded-2xl bg-[var(--accent)] text-white font-bold text-lg hover:bg-purple-600 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-500/20"
            >
              🎤 Start Spoken Interview
            </button>
          </div>
        </div>
      )}
      {/* Top Bar */}
      <header className="flex-shrink-0 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold bg-gradient-to-r from-[var(--accent)] to-purple-400 bg-clip-text text-transparent">
              Interview Coach
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--border-accent)]">
              {topic.toUpperCase()}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-card)] text-[var(--text-secondary)]">
              {difficulty.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (isVoiceEnabled) window.speechSynthesis?.cancel();
                setIsVoiceEnabled(!isVoiceEnabled);
              }}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                isVoiceEnabled 
                  ? "bg-[var(--accent-soft)] border-[var(--border-accent)] text-[var(--accent)]" 
                  : "bg-[var(--bg-card)] border-[var(--border)] text-[var(--text-muted)] hover:text-white"
              }`}
              title="Toggle AI Voice"
            >
              {isVoiceEnabled ? "🔊 Voice On" : "🔇 Voice Off"}
            </button>
            <div className="flex items-center gap-2">
              <span className="text-lg">{PHASE_ICONS[phase] || "📌"}</span>
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {PHASE_LABELS[phase] || phase}
              </span>
            </div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-0.5 bg-[var(--bg-card)]">
          <div
            className="h-full bg-gradient-to-r from-[var(--accent)] to-purple-400 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Panel */}
        <div className={`flex flex-col ${showEditor ? "w-1/2" : "w-full"} transition-all duration-300`}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed whitespace-pre-wrap
                    ${
                      msg.role === "user"
                        ? "bg-[var(--accent)] text-white rounded-br-md"
                        : "bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] rounded-bl-md"
                    }`}
                >
                  {msg.role === "ai" && (
                    <div className="flex items-center gap-1.5 mb-2 text-xs text-[var(--text-muted)]">
                      <span>🤖</span>
                      <span>Interviewer</span>
                    </div>
                  )}
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-5 py-3 rounded-bl-md">
                  <div className="flex items-center gap-1.5 mb-2 text-xs text-[var(--text-muted)]">
                    <span>🤖</span>
                    <span>Interviewer is typing</span>
                  </div>
                  <div className="flex gap-1.5 py-1">
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                    <span className="typing-dot" />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="flex-shrink-0 border-t border-[var(--border)] bg-[var(--bg-secondary)] p-4">
            {phase === "feedback" ? (
              <div className="text-center py-2">
                <p className="text-[var(--text-secondary)] text-sm mb-3">Interview complete!</p>
                <a
                  href="/"
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[var(--accent)] text-white font-medium text-sm hover:bg-purple-600 transition-colors"
                >
                  Start New Interview
                </a>
              </div>
            ) : (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`px-4 py-3 rounded-xl font-medium text-lg transition-all ${
                    isListening 
                      ? "bg-red-500 text-white animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.5)]" 
                      : "bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-white hover:border-[var(--text-muted)]"
                  }`}
                  title="Toggle Voice Input"
                >
                  🎤
                </button>
                <textarea
                  ref={inputRef}
                  id="chat-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  placeholder={
                    showEditor
                      ? 'Type "done" when you finish coding...'
                      : "Type your response..."
                  }
                  rows={1}
                  className="flex-1 resize-none rounded-xl bg-[var(--bg-card)] border border-[var(--border)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--border-accent)] focus:ring-1 focus:ring-[var(--accent-glow)] disabled:opacity-50 transition-all"
                />
                <button
                  id="send-btn"
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="px-5 py-3 rounded-xl bg-[var(--accent)] text-white font-medium text-sm hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center min-w-[80px]"
                >
                  {isLoading ? (
                    <div className="flex gap-1">
                      <span className="w-1 h-1 bg-white rounded-full animate-bounce" />
                      <span className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:0.2s]" />
                      <span className="w-1 h-1 bg-white rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  ) : "Send"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Editor Panel — ONLY if phase === "coding" */}
        {showEditor && (
          <div className="w-1/2 border-l border-[var(--border)] flex flex-col bg-[var(--bg-secondary)] animate-fade-in-up">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)]">
              <div className="flex items-center gap-2">
                <span className="text-sm">💻</span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">Solution Editor</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--text-muted)]">Python</span>
                <button
                  onClick={handleRunCode}
                  disabled={isLoading}
                  className="px-3 py-1 bg-[#10a37f] hover:bg-[#14b88f] rounded-md text-xs font-bold text-white transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  ▶ Run Code
                </button>
              </div>
            </div>
            <div className="flex-1">
              <CodeEditor value={code} onChange={setCode} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
