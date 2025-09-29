"use client";
import { useState, useRef, useEffect } from "react";
import {
  ChatBubbleOvalLeftEllipsisIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";

interface ChatMessage {
  id: string;
  question: string;
  response: any;
  timestamp: Date;
}

interface ChatBotProps {
  className?: string;
}

export default function ChatBot({ className = "" }: ChatBotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleSend = async () => {
    if (!query.trim() || isLoading) return;

    const currentQuery = query;
    setQuery("");
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

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          question: currentQuery,
          response: data,
          timestamp: new Date(),
        },
      ]);
    } catch {
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatResponse = (response: any) => {
    if (response?.recommendations) {
      return (
        <ul className="space-y-3">
          {response.recommendations.map((rec: any, idx: number) => (
            <li
              key={idx}
              className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <p className="font-semibold text-emerald-700 mb-1">{rec.name}</p>
              <p className="text-sm text-slate-600 leading-relaxed">{rec.reason}</p>
            </li>
          ))}
        </ul>
      );
    }
    if (response?.error) return <p className="text-red-500 font-medium">{response.error}</p>;
    if (typeof response === "string") return <p className="text-slate-700">{response}</p>;
    return <pre className="text-xs bg-slate-100 p-3 rounded-lg overflow-x-auto">{JSON.stringify(response, null, 2)}</pre>;
  };

  return (
    <>
      {/* Toggle Chat Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`fixed bottom-6 right-6 group flex items-center justify-center bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-700 text-white p-4 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 z-50 transform hover:scale-105 ${className}`}
      >
        <div className="relative">
          {isOpen ? (
            <XMarkIcon className="h-6 w-6 transition-transform duration-200" />
          ) : (
            <ChatBubbleOvalLeftEllipsisIcon className="h-6 w-6 transition-transform duration-200 group-hover:scale-110" />
          )}
          {!isOpen && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-400 rounded-full animate-pulse"></div>
          )}
        </div>
      </button>

      {/* Chat Popup */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-80 sm:w-96 h-[520px] bg-white rounded-3xl shadow-2xl border border-slate-200/50 flex flex-col overflow-hidden z-40 transition-all duration-300 backdrop-blur-sm">
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 text-white p-5 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-teal-500/10"></div>
            <div className="relative flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl border border-white/20">
                <SparklesIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg">AI Assistant</h3>
                <p className="text-xs text-slate-300 font-medium">Smart Product Recommendations</p>
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
                  Welcome! I'm your AI shopping assistant
                </p>
                <p className="text-sm text-slate-500 leading-relaxed max-w-xs mx-auto">
                  Ask me about any product and I'll find the perfect recommendations for you
                </p>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className="space-y-4">
                {/* User Message */}
                <div className="flex justify-end">
                  <div className="bg-gradient-to-br from-emerald-600 to-teal-600 text-white px-4 py-3 rounded-2xl rounded-br-md max-w-xs shadow-lg">
                    <p className="text-sm font-medium leading-relaxed">{message.question}</p>
                  </div>
                </div>

                {/* Bot Response */}
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200/70 text-slate-800 px-4 py-4 rounded-2xl rounded-bl-md max-w-md shadow-lg">
                    <div className="text-sm space-y-3">
                      {formatResponse(message.response)}
                    </div>
                    <p className="text-xs text-slate-400 mt-3 font-medium">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                    <span className="text-sm text-slate-500 font-medium">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-200/70 p-5 bg-white/80 backdrop-blur-sm">
            <div className="flex gap-3">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Describe what you're looking for..."
                className="flex-1 px-4 py-3 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400 text-sm font-medium placeholder-slate-400 transition-all duration-200 bg-white/80"
                disabled={isLoading}
              />
              <button
                onClick={handleSend}
                disabled={isLoading || !query.trim()}
                className="bg-gradient-to-br from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-slate-400 disabled:to-slate-500 text-white p-3 rounded-2xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:hover:scale-100"
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