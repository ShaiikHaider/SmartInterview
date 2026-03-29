"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  const [timeLeft, setTimeLeft] = useState(480); // 8 mins for testing
  const [isTimeUp, setIsTimeUp] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const [isVoiceUnlocked, setIsVoiceUnlocked] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  
  const recognitionRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Silence logic
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const silenceCountRef = useRef(0);
  
  // Interrupt buffer logic
  const interruptBufferRef = useRef<NodeJS.Timeout | null>(null);
  
  // Voice auto-submit logic
  const autoSubmitTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestInputRef = useRef("");
  const isSubmittingRef = useRef(false);
  
  useEffect(() => {
      latestInputRef.current = input;
  }, [input]);

  const resetSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    
    // Only set silence timer if not loading, not AI speaking, and interview not over
    if (isLoading || isAiSpeaking || phase === "feedback" || !sessionId) return;
    
    // Dynamic duration (much longer to allow the candidate to think)
    let delay = phase === "coding" ? 30000 : 15000;
    // Increase delay if repeated silence
    delay += (silenceCountRef.current * 3000); 

    silenceTimerRef.current = setTimeout(() => {
        handleSilence();
    }, delay);
  }, [isLoading, isAiSpeaking, phase, sessionId]);

  useEffect(() => {
    resetSilenceTimer();
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, [resetSilenceTimer]);

  const interruptAI = useCallback(() => {
      if (abortControllerRef.current) {
          abortControllerRef.current.abort();
      }
      window.speechSynthesis?.cancel();
      setIsAiSpeaking(false);
      setIsLoading(false);
      silenceCountRef.current = 0; // Reset silence on interrupt
      resetSilenceTimer();
  }, [resetSilenceTimer]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        
        recognitionRef.current.onresult = (event: any) => {
          let partial = "";
          let isFinal = false;
          
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              isFinal = true;
            }
            partial += event.results[i][0].transcript;
          }
          
          // Clear any auto-submit or silence timers since the user is actively talking!
          if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
          if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);

          // Interrupt logic: wait for a short buffer or isFinal to ensure it's real speech
          if (isAiSpeaking && partial.trim().length > 3) {
             if (!interruptBufferRef.current) {
                 interruptBufferRef.current = setTimeout(() => {
                     interruptAI();
                 }, 400); // 400ms buffer
             }
          } else if (isAiSpeaking && isFinal) {
             if (interruptBufferRef.current) clearTimeout(interruptBufferRef.current);
             interruptAI();
          }

          if (isFinal) {
             if (interruptBufferRef.current) clearTimeout(interruptBufferRef.current);
             setInput(prev => {
                const updated = prev + (prev.length > 0 ? " " : "") + partial.trim();
                return updated;
             });
             
             // Auto-submit 1.5s after the final word is detected
             if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
             autoSubmitTimerRef.current = setTimeout(() => {
                 if (latestInputRef.current.trim() && !isSubmittingRef.current) {
                     silenceCountRef.current = 0; 
                     handleSend(); // Using handleSend instead of raw sendMessageCore to ensure clean UI state
                 }
             }, 2000); // Increased to 2.0s to avoid rushing
          }
        };
        
        recognitionRef.current.onerror = (event: any) => {
          // Ignore no-speech errors which are common
          if (event.error !== 'no-speech') {
             console.error("Speech recognition error", event.error);
             setIsListening(false);
          }
        };
        
        recognitionRef.current.onend = () => {
          // Restart listening if we are supposed to be listening (continuous)
          if (isVoiceUnlocked && !isAiSpeaking && phase !== "feedback") {
             try { recognitionRef.current?.start(); } catch(e) {}
          } else {
             setIsListening(false);
          }
        };
      }
    }
  }, [isAiSpeaking, isVoiceUnlocked, phase, interruptAI]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        setInput(""); 
        try { recognitionRef.current.start(); } catch(e) {}
        setIsListening(true);
      } else {
        alert("Speech recognition is not supported in this browser. Try Chrome or Edge.");
      }
    }
  };

  const speakChunk = (text: string) => {
    if (!isVoiceEnabled || !window.speechSynthesis) return;
    
    let cleanText = text.replace(/```[\s\S]*?```/g, " Code block omitted. ");
    cleanText = cleanText.replace(/\[.*?\]/g, ""); 
    cleanText = cleanText.replace(/[*_#`]/g, "");
    
    if (!cleanText.trim()) return;

    const utterance = new SpeechSynthesisUtterance(cleanText.trim());
    utterance.rate = 0.85; // Natural, slightly slower pacing
    
    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => {
      // Small timeout to see if another chunk is immediately spoken
      setTimeout(() => {
          if (!window.speechSynthesis.speaking) {
             setIsAiSpeaking(false);
             if (recognitionRef.current && !isListening && isVoiceUnlocked) {
                 try { recognitionRef.current.start(); setIsListening(true); } catch(e) {}
             }
          }
      }, 100);
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

      // Timer calculation based on backend start_time
      if (data.start_time) {
        const elapsed = Math.floor(Date.now() / 1000 - data.start_time);
        const remaining = Math.max(0, 480 - elapsed);
        setTimeLeft(remaining);
      }
    }
  }, []);

  // Timer Countdown Logic
  useEffect(() => {
    if (!sessionId || phase === "feedback" || isTimeUp) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [sessionId, phase, isTimeUp]);

  const handleTimeUp = () => {
    setIsTimeUp(true);
    sendMessageCore("[TIME EXPIRED]");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartVoice = () => {
    setIsVoiceUnlocked(true);
    const sessionData = sessionStorage.getItem("interview_session");
    if (sessionData) {
      const data = JSON.parse(sessionData);
      speakChunk(data.message);
    }
    try {
        recognitionRef.current?.start();
        setIsListening(true);
    } catch(e) {}
  };

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input after loading
  useEffect(() => {
    if (!isLoading) inputRef.current?.focus();
  }, [isLoading]);


  const handleSilence = async () => {
      silenceCountRef.current += 1;
      await sendMessageCore("[SILENCE]");
  }

  const handleSend = async () => {
     silenceCountRef.current = 0; 
     if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);
     if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
     
     // Read from latestRef to capture latest react state correctly
     const messageToSend = input || latestInputRef.current;
     await sendMessageCore(messageToSend);
  };

  const sendMessageCore = async (messageText: string) => {
    if (!sessionId || isSubmittingRef.current) return;
    
    isSubmittingRef.current = true;
    if (autoSubmitTimerRef.current) clearTimeout(autoSubmitTimerRef.current);

    const isSilence = messageText === "[SILENCE]";
    const userMessage = messageText.trim();
    
    if (!userMessage && !isSilence) {
        isSubmittingRef.current = false;
        return;
    }

    if (!isSilence) {
        let messageToSend = userMessage;
        if (showEditor && code.trim() !== "# Write your solution here") {
          messageToSend = `${userMessage}\n\n[CODE]\n${code}`;
        }
        setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
        setInput("");
    }
    
    setIsLoading(true);
    setIsAiSpeaking(false);
    
    // Setup fresh abort controller for this stream
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Prepare stream state
    let fullAiResponse = "";
    let currentSentence = "";
    setMessages((prev) => [...prev, { role: "ai", content: "" }]);

    try {
      const res = await fetch(`${API_URL}/message_stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
            session_id: sessionId, 
            message: !isSilence && showEditor && code.trim() !== "# Write your solution here" ? `${userMessage}\n\n[CODE]\n${code}` : (isSilence ? "[SILENCE]" : userMessage),
            silence_count: silenceCountRef.current
        }),
        signal: abortControllerRef.current.signal
      });

      if (!res.ok) throw new Error("Failed to send message");

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
          while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const events = chunk.split("\n\n");

              for (const event of events) {
                  if (event.startsWith("data: ")) {
                      const dataStr = event.substring(6);
                      if (!dataStr) continue;
                      
                      const data = JSON.parse(dataStr);
                      
                      if (data.type === "init") {
                          setPhase(data.phase);
                          setShowEditor(data.showEditor);
                      } else if (data.type === "chunk") {
                          const textChunk = data.content;
                          fullAiResponse += textChunk;
                          currentSentence += textChunk;

                          // Dynamic Phase Transition driven by AI
                          if (fullAiResponse.includes("[START_CODING]") && phase === "discussion") {
                              setPhase("coding");
                              setShowEditor(true);
                          }

                          // Update UI incrementally, hiding internal AI tags
                          setMessages((prev) => {
                              const newVals = [...prev];
                              const displayContent = fullAiResponse.replace(/\[START_CODING\]/g, "").trim();
                              newVals[newVals.length - 1] = { role: "ai", content: displayContent };
                              return newVals;
                          });

                          // TTS Chunking based on sentence completion
                          if (/[.!?]\s/.test(currentSentence) || currentSentence.endsWith(".") || currentSentence.endsWith("?") || currentSentence.endsWith("!")) {
                              speakChunk(currentSentence);
                              currentSentence = "";
                          }
                      } else if (data.type === "done") {
                          // Flush remaining sentence
                          if (currentSentence.trim()) {
                              speakChunk(currentSentence);
                          }
                      }
                  }
              }
          }
      }

    } catch (err: any) {
      if (err.name === "AbortError") {
          console.log("Stream aborted via interruption.");
      } else {
          console.error("Message error:", err);
          setMessages((prev) => [
            ...prev,
            { role: "ai", content: "[Connection error. Please try again.]" },
          ]);
      }
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
      // STOP THE INFINITE LOOP: Do not restart the silence timer if the AI returned an error.
      if (!fullAiResponse.includes("EXHAUSTED") && !fullAiResponse.includes("Error:") && !fullAiResponse.includes("Connection error")) {
          resetSilenceTimer();
      }
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
      speakChunk(aiResponse); // Call our new speakChunk instead of old speakMessage
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
      {/* Top Bar (Sticky Timer) */}
      <header className="sticky top-0 z-[60] flex-shrink-0 border-b border-white/10 bg-[#0a0a0f]/90 backdrop-blur-2xl">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-black tracking-tight text-white uppercase italic">
              Focused Session
            </h1>
            <div className="h-6 w-px bg-white/10" />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 font-mono text-sm font-black">
              <span className={`w-2 h-2 rounded-full ${timeLeft < 300 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
              <span className={timeLeft < 300 ? 'text-red-500' : 'text-gray-300'}>
                {formatTime(timeLeft)}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] bg-blue-600/10 text-blue-400 border border-blue-500/20">
                {topic}
              </span>
              <span className="px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-[0.2em] bg-white/5 text-gray-400 border border-white/10">
                {difficulty}
              </span>
            </div>
            
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (isVoiceEnabled) window.speechSynthesis?.cancel();
                  setIsVoiceEnabled(!isVoiceEnabled);
                }}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                  isVoiceEnabled 
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20" 
                    : "bg-white/5 border-white/10 text-gray-500 hover:text-white"
                }`}
              >
                {isVoiceEnabled ? "🔊 Voice On" : "🔇 Muted"}
              </button>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 shadow-inner">
                <span className="text-sm">{PHASE_ICONS[phase] || "📌"}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-white">
                  {PHASE_LABELS[phase] || phase}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="h-1 bg-white/5">
          <div
            className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-700 ease-out"
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
            {isLoading && !messages.some(m => m.role === "ai" && m.content === "") && (
              <div className="flex justify-start">
                <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl px-5 py-3 rounded-bl-md">
                  <div className="flex items-center gap-1.5 mb-2 text-xs text-[var(--text-muted)]">
                    <span>🤖</span>
                    <span>Interviewer is thinking</span>
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
                  disabled={isLoading && messages.length > 0 && messages[messages.length-1].role !== 'ai'}
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
                  disabled={(isLoading && messages[messages.length-1]?.role !== 'ai') || !input.trim()}
                  className="px-5 py-3 rounded-xl bg-[var(--accent)] text-white font-medium text-sm hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center min-w-[80px]"
                >
                  {isLoading && messages[messages.length-1]?.role !== 'ai' ? (
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
