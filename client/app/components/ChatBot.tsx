/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import { useState, useRef, useEffect } from "react";
import {
  ChatBubbleOvalLeftEllipsisIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { MicrophoneIcon, SpeakerWaveIcon } from "@heroicons/react/24/solid";

interface ChatMessage {
  id: string;
  question: string;
  response: any;
  timestamp: Date;
}

export default function ChatBot({ className = "" }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceMode, setVoiceMode] = useState(true); // enable TTS by default
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const speak = (text: string) => {
    if (!voiceMode) return;
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const sendChatQuery = async (currentQuery: string) => {
    if (!currentQuery.trim()) return;
    setIsLoading(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/products/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: currentQuery }),
        }
      );

      let data: any = { error: "Failed to get response. Please try again." };
      if (response.ok) {
        data = await response.json();
      }

      const msg = {
        id: Date.now().toString(),
        question: currentQuery,
        response: data,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, msg]);

      // 🔹 Voice feedback
      if (data?.relevancy && data.relevancy.relevant === false) {
        speak(
          `Sorry, your query is not related to our products. ${
            data.relevancy.reason || ""
          }`
        );
      } else if (data?.recommendations?.length) {
        const top = data.recommendations
          .slice(0, 5)
          .map((r: any) => r.name)
          .join(", ");
        speak(`I found ${data.recommendations.length} products. Top: ${top}`);
      } else if (data?.raw) {
        speak(
          typeof data.raw === "string"
            ? data.raw.slice(0, 250)
            : "Here are the results."
        );
      }
    } catch (err) {
      console.log("Chat query error", err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          question: currentQuery,
          response: { error: "Failed to get response. Please try again." },
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!query.trim() || isLoading) return;
    const currentQuery = query;
    setQuery("");
    await sendChatQuery(currentQuery);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // --------- Speech: Web Speech API ----------
  const startWebSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Web Speech API not supported in this browser");
      return false;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setTimeout(() => handleSend(), 250);
    };
    recognition.onerror = (ev: any) => {
      console.error("Speech recognition error", ev);
    };
    recognition.onend = () => {
      setIsRecording(false);
    };
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
    return true;
  };

  // --------- Fallback: Whisper API ----------
  const startRecordingFallback = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        const blob = new Blob(recordedChunksRef.current, { type: "audio/webm" });
        const formData = new FormData();
        formData.append("file", blob, "recording.webm");

        try {
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/speech/speech-to-text`,
            {
              method: "POST",
              body: formData,
            }
          );
          if (!res.ok) {
            console.error("Transcription endpoint failed", await res.text());
            return;
          }
          const { text } = await res.json();
          if (text) {
            setQuery(text);
            setTimeout(() => handleSend(), 250);
          }
        } catch (err) {
          console.error("Upload/transcription error", err);
        } finally {
          stream.getTracks().forEach((t) => t.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("getUserMedia error", err);
    }
  };

  const stopRecordingFallback = () => {
    const mediaRecorder = mediaRecorderRef.current;
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
  };

  const handleMicClick = async () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    if (!isRecording) {
      if (SpeechRecognition) {
        startWebSpeechRecognition();
      } else {
        await startRecordingFallback();
      }
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
        recognitionRef.current = null;
        setIsRecording(false);
      }
      if (mediaRecorderRef.current) {
        stopRecordingFallback();
      }
    }
  };

  const formatResponse = (response: any) => {
    if (response?.relevancy && response.relevancy.relevant === false) {
      return (
        <p className="text-amber-600 font-medium">
          ❌ {response.relevancy.reason || "Your query isn’t related to our products."}
        </p>
      );
    }

    if (response?.recommendations?.length) {
      return (
        <ul className="space-y-3">
          {response.recommendations.map((rec: any, idx: number) => (
            <li
              key={idx}
              className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 rounded-xl shadow-sm"
            >
              <p className="font-semibold text-emerald-700 mb-1">{rec.name}</p>
              <p className="text-sm text-slate-600 leading-relaxed">
                {rec.reason}
              </p>
            </li>
          ))}
        </ul>
      );
    }

    if (response?.error)
      return <p className="text-red-500 font-medium">{response.error}</p>;
    if (response?.raw)
      return <p className="text-slate-700">{String(response.raw)}</p>;

    return (
      <pre className="text-xs bg-slate-100 p-3 rounded-lg overflow-x-auto">
        {JSON.stringify(response, null, 2)}
      </pre>
    );
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`fixed bottom-6 right-6 group flex items-center justify-center bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white p-4 rounded-2xl shadow-xl z-50 ${className}`}
      >
        <div className="relative">
          {isOpen ? (
            <XMarkIcon className="h-6 w-6" />
          ) : (
            <ChatBubbleOvalLeftEllipsisIcon className="h-6 w-6" />
          )}
          {!isOpen && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full animate-pulse"></div>
          )}
        </div>
      </button>

      {/* Chat window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 sm:w-96 h-[520px] bg-white rounded-3xl shadow-2xl border border-slate-200/50 flex flex-col overflow-hidden z-40">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white p-5">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2.5 rounded-xl">
                <SparklesIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">AI Assistant</h3>
                <p className="text-xs text-slate-300">
                  Smart Product Recommendations
                </p>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-gradient-to-br from-slate-50 to-gray-50">
            {messages.length === 0 && (
              <div className="text-center mt-12">
                <div className="bg-gradient-to-br from-emerald-100 to-teal-100 w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <SparklesIcon className="h-8 w-8 text-emerald-600" />
                </div>
                <p className="text-slate-700 font-semibold mb-2">
                  Welcome! I&apos;m your AI shopping assistant
                </p>
                <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
                  Ask me about any product and I&apos;ll find the perfect
                  recommendations for you
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className="space-y-4">
                <div className="flex justify-end">
                  <div className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white px-4 py-3 rounded-2xl rounded-br-md max-w-xs shadow-lg">
                    <p className="text-sm font-medium leading-relaxed">
                      {message.question}
                    </p>
                  </div>
                </div>

                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200/70 text-slate-800 px-4 py-4 rounded-2xl rounded-bl-md max-w-md shadow-lg">
                    <div className="text-sm space-y-3">
                      {formatResponse(message.response)}
                    </div>
                    <p className="text-xs text-slate-400 mt-3 font-medium">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200/70 px-4 py-4 rounded-2xl rounded-bl-md shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex space-x-1">
                      <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce"></div>
                      <div
                        className="w-2.5 h-2.5 bg-teal-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.1s" }}
                      ></div>
                      <div
                        className="w-2.5 h-2.5 bg-cyan-500 rounded-full animate-bounce"
                        style={{ animationDelay: "0.2s" }}
                      ></div>
                    </div>
                    <span className="text-sm text-slate-500 font-medium">
                      AI is thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-200/70 p-4 bg-white/80">
            <div className="flex gap-3 items-center">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe what you're looking for..."
                className="flex-1 px-4 py-3 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-emerald-500/50 text-sm placeholder-slate-400 bg-white/80"
                disabled={isLoading}
              />
              {/* Mic */}
              <button
                onClick={handleMicClick}
                title={isRecording ? "Stop recording" : "Record voice query"}
                className={`p-3 rounded-2xl border ${
                  isRecording ? "bg-red-100 border-red-300" : "bg-white"
                } transition-all`}
              >
                <MicrophoneIcon className="h-5 w-5 text-rose-600" />
              </button>

              {/* TTS toggle */}
              <button
                onClick={() => setVoiceMode((v) => !v)}
                title={voiceMode ? "Disable voice responses" : "Enable voice responses"}
                className="p-3 rounded-2xl bg-white border"
              >
                <SpeakerWaveIcon
                  className={`h-5 w-5 ${
                    voiceMode ? "text-emerald-600" : "text-gray-400"
                  }`}
                />
              </button>

              {/* Send */}
              <button
                onClick={handleSend}
                disabled={isLoading || !query.trim()}
                className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white p-3 rounded-2xl disabled:opacity-50"
              >
                <PaperAirplaneIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
