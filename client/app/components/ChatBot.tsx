import { useState, useRef, useEffect } from "react";
import {
  ChatBubbleOvalLeftEllipsisIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  SparklesIcon,
  TrashIcon,
  ChevronDownIcon,
  BookmarkIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import {
  MicrophoneIcon,
  SpeakerWaveIcon,
  BookmarkIcon as BookmarkSolidIcon,
} from "@heroicons/react/24/solid";

interface ChatMessage {
  id: string;
  question: string;
  response: any;
  timestamp: Date;
  bookmarked?: boolean;
}

export default function ChatBot({ className = "" }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceMode, setVoiceMode] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showClearPopup, setShowClearPopup] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<any>(null);

  const quickSuggestions = [
    "Suggest me Something For Better Sleep",
    "What Should I Take For My General Health?",
    "Top 5 Vitamins for Energy",
    "Best Supplements for Immune Support",
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && inputRef.current && !isMinimized) {
      inputRef.current.focus();
    }
  }, [isOpen, isMinimized]);

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
    setShowSuggestions(false);
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
        bookmarked: false,
      };
      setMessages((prev) => [...prev, msg]);

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
          bookmarked: false,
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

  // Speech recognition and recording fallback (unchanged from your code)
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
        const blob = new Blob(recordedChunksRef.current, {
          type: "audio/webm",
        });
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

  const toggleBookmark = (messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, bookmarked: !msg.bookmarked } : msg
      )
    );
  };

  const clearChat = () => {
    setMessages([]);
    setShowSuggestions(true);
    setShowClearPopup(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    const cleanSuggestion = suggestion.replace(/^[^\s]+\s/, "");
    setQuery(cleanSuggestion);
    setTimeout(() => handleSend(), 100);
  };

  const formatResponse = (response: any) => {
    if (response?.relevancy && response.relevancy.relevant === false) {
      return (
        <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold text-blue-800 mb-1">
              Query Not Relevant
            </p>
            <p className="text-sm text-blue-700">
              {response.relevancy.reason ||
                "Your query isn't related to our products."}
            </p>
          </div>
        </div>
      );
    }

    if (response?.recommendations?.length) {
      return (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">
            {response.recommendations.length} Products Found
          </p>
          {response.recommendations.map((rec: any, idx: number) => (
            <div
              key={idx}
              className="group bg-gradient-to-br from-blue-50 via-indigo-50 to-cyan-50 border border-blue-200 p-4 rounded-xl hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="font-bold text-blue-800 group-hover:text-blue-900">
                  {rec.name}
                </h4>
                <span className="text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                  #{idx + 1}
                </span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">
                {rec.reason}
              </p>
            </div>
          ))}
        </div>
      );
    }

    if (response?.error)
      return (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <span className="text-2xl">❌</span>
          <p className="text-sm text-red-700 font-medium">{response.error}</p>
        </div>
      );

    if (response?.raw)
      return (
        <p className="text-slate-700 leading-relaxed">{String(response.raw)}</p>
      );

    return (
      <pre className="text-xs bg-slate-100 p-3 rounded-lg overflow-x-auto border border-slate-200">
        {JSON.stringify(response, null, 2)}
      </pre>
    );
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        className={`fixed bottom-6 right-6 group flex items-center justify-center bg-gradient-to-br from-blue-500 via-indigo-500 to-cyan-600 hover:from-blue-600 hover:via-indigo-600 hover:to-cyan-700 text-white p-5 rounded-full shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 hover:scale-110 z-50 ${className}`}
        aria-label="Open chat"
      >
        <div className="relative">
          {isOpen ? (
            <XMarkIcon className="h-7 w-7" />
          ) : (
            <>
              <ChatBubbleOvalLeftEllipsisIcon className="h-7 w-7" />
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-orange-500 rounded-full animate-pulse border-2 border-white"></div>
            </>
          )}
        </div>
      </button>

      {/* Chat window */}
      {isOpen && (
        <div
          className={`fixed bottom-24 right-6 w-[380px] sm:w-[420px] ${
            isMinimized ? "h-16" : "h-[600px]"
          } bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden z-40 transition-all duration-300`}
        >
          {/* Header */}
          <div
            className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 text-white p-5 cursor-pointer"
            onClick={() => setIsMinimized(!isMinimized)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm p-2.5 rounded-xl">
                  <SparklesIcon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    Cura AI
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  </h3>
                  <p className="text-xs text-blue-100">
                    {isLoading ? "Thinking..." : "Online • Ready to help"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowClearPopup(true);
                    }}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    title="Clear chat"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                )}
                <button className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                  <ChevronDownIcon
                    className={`h-4 w-4 transition-transform ${
                      isMinimized ? "rotate-180" : ""
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
                {messages.length === 0 && showSuggestions && (
                  <div className="text-center mt-8">
                    <div className="relative mx-auto mb-6 w-20 h-20">
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl animate-pulse"></div>
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl m-1">
                        <SparklesIcon className="h-10 w-10 text-blue-600" />
                      </div>
                    </div>
                    <h4 className="text-slate-800 font-bold text-lg mb-2">
                      Hi this is CuraAI Assistant! 👋
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed max-w-xs mx-auto mb-6">
                      Ask me anything about products and I'll provide
                      personalized recommendations
                    </p>

                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Try asking:
                      </p>
                      {quickSuggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full text-left px-4 py-3 bg-white border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all text-sm text-slate-700 hover:text-blue-700 font-medium"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500"
                  >
                    {/* User message */}
                    <div className="flex justify-end items-start gap-2">
                      <div className="bg-gradient-to-br from-blue-600 to-indigo-600 text-white px-5 py-3.5 rounded-2xl rounded-br-md max-w-[75%] shadow-lg">
                        <p className="text-sm font-medium leading-relaxed break-words">
                          {message.question}
                        </p>
                      </div>
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        U
                      </div>
                    </div>

                    {/* AI response */}
                    <div className="flex justify-start items-start gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <SparklesIcon className="h-4 w-4 text-white" />
                      </div>
                      <div className="bg-white border border-slate-200 text-slate-800 px-5 py-4 rounded-2xl rounded-bl-md max-w-[75%] shadow-lg">
                        <div className="text-sm space-y-3">
                          {formatResponse(message.response)}
                        </div>
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                          <p className="text-xs text-slate-400 font-medium flex items-center gap-1">
                            <ClockIcon className="h-3 w-3" />
                            {message.timestamp.toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                          <button
                            onClick={() => toggleBookmark(message.id)}
                            className="text-slate-400 hover:text-blue-600 transition-colors"
                            title={
                              message.bookmarked
                                ? "Remove bookmark"
                                : "Bookmark"
                            }
                          >
                            {message.bookmarked ? (
                              <BookmarkSolidIcon className="h-4 w-4 text-blue-600" />
                            ) : (
                              <BookmarkIcon className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex justify-start items-start gap-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <SparklesIcon className="h-4 w-4 text-white" />
                    </div>
                    <div className="bg-white border border-slate-200 px-5 py-4 rounded-2xl rounded-bl-md shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex space-x-1.5">
                          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-bounce"></div>
                          <div
                            className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          ></div>
                          <div
                            className="w-2.5 h-2.5 bg-cyan-500 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          ></div>
                        </div>
                        <span className="text-sm text-slate-600 font-medium">
                          AI is analyzing...
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t border-slate-200 p-4 bg-white/95 backdrop-blur-sm">
                {isRecording && (
                  <div className="mb-3 flex items-center justify-center gap-2 text-sm text-rose-600 font-medium bg-rose-50 py-2 rounded-lg">
                    <div className="w-2 h-2 bg-rose-600 rounded-full animate-pulse"></div>
                    Recording... Speak now
                  </div>
                )}
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <textarea
                      ref={inputRef as any}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your question here..."
                      rows={1}
                      className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 text-sm placeholder-slate-400 bg-white resize-none"
                      disabled={isLoading}
                      style={{ minHeight: "44px", maxHeight: "120px" }}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleMicClick}
                      title={
                        isRecording ? "Stop recording" : "Record voice query"
                      }
                      className={`p-3 rounded-xl border transition-all ${
                        isRecording
                          ? "bg-rose-100 border-rose-300 shadow-lg shadow-rose-200"
                          : "bg-white hover:bg-slate-50 border-slate-300"
                      }`}
                    >
                      <MicrophoneIcon
                        className={`h-5 w-5 ${
                          isRecording ? "text-rose-600" : "text-slate-600"
                        }`}
                      />
                    </button>

                    <button
                      onClick={() => setVoiceMode((v) => !v)}
                      title={
                        voiceMode
                          ? "Disable voice responses"
                          : "Enable voice responses"
                      }
                      className="p-3 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 transition-all"
                    >
                      <SpeakerWaveIcon
                        className={`h-5 w-5 ${
                          voiceMode ? "text-blue-600" : "text-slate-400"
                        }`}
                      />
                    </button>

                    <button
                      onClick={handleSend}
                      disabled={isLoading || !query.trim()}
                      className="bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-blue-500/50"
                    >
                      <PaperAirplaneIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Clear chat popup */}
      {showClearPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/40 z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-80 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              Clear Chat?
            </h3>
            <p className="text-sm text-slate-600 mb-5">
              Are you sure you want to delete all chat history? This action
              cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowClearPopup(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={clearChat}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 text-sm font-medium"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
