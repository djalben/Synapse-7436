import { useState, useEffect, useRef } from "react";
import { Sidebar } from "../components/sidebar";
import { ModelSelector } from "../components/model-selector";
import { ChatInput, SuggestionChips } from "../components/chat-input";

function Index() {
  const [activeTab, setActiveTab] = useState("chat");
  const [selectedModel, setSelectedModel] = useState("gpt-4o");
  const [isLoaded, setIsLoaded] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Staggered entrance animation
  useEffect(() => {
    const timer = setTimeout(() => setIsLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSendMessage = (message: string) => {
    console.log("Sending:", message);
    // Chat functionality would be implemented here
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Atmospheric Video Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          onLoadedData={() => setVideoLoaded(true)}
          className={`
            absolute inset-0 w-full h-full object-cover
            blur-sm
            transition-opacity duration-1000 ease-out
            ${videoLoaded ? "opacity-[0.12]" : "opacity-0"}
          `}
          style={{
            filter: "blur(4px) saturate(1.2)",
          }}
        >
          <source
            src="https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_30fps.mp4"
            type="video/mp4"
          />
        </video>
        {/* Color overlay to enhance blue/purple tones */}
        <div 
          className={`
            absolute inset-0 
            bg-gradient-to-br from-indigo-950/30 via-transparent to-blue-950/20
            mix-blend-overlay
            transition-opacity duration-1000
            ${videoLoaded ? "opacity-100" : "opacity-0"}
          `}
        />
      </div>

      {/* Subtle background pattern (over video) */}
      <div className="fixed inset-0 pointer-events-none z-[1]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.1),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.05),transparent)]" />
      </div>

      {/* Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <main className="relative z-10 ml-[240px] min-h-screen flex flex-col">
        {/* Top Bar */}
        <header
          className={`
            px-6 py-4 border-b border-[#222]
            flex items-center justify-between
            transition-all duration-700 ease-out
            ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}
          `}
        >
          <ModelSelector
            selectedModel={selectedModel}
            onModelChange={setSelectedModel}
          />

          {/* Right side - could add more controls here */}
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-xs font-semibold">
              S
            </div>
          </div>
        </header>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          {/* Empty State */}
          <div
            className={`
              max-w-2xl w-full text-center
              transition-all duration-700 ease-out delay-100
              ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
            `}
          >
            {/* Welcome Text */}
            <div className="mb-12">
              <h1 className="text-4xl md:text-5xl font-mono font-semibold mb-4 tracking-tight">
                <span className="gradient-text">What can I help you</span>
                <br />
                <span className="text-white">create today?</span>
              </h1>
              <p className="text-[#666] text-lg max-w-md mx-auto">
                Start a conversation with Synapse to explore ideas, write code, or create something new.
              </p>
            </div>

            {/* Suggestion Chips */}
            <div
              className={`
                mb-16
                transition-all duration-700 ease-out delay-200
                ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
              `}
            >
              <SuggestionChips onSelect={handleSendMessage} />
            </div>
          </div>
        </div>

        {/* Input Area - Fixed at bottom */}
        <div
          className={`
            sticky bottom-0 left-0 right-0
            px-6 py-6
            bg-gradient-to-t from-black via-black/95 to-transparent
            transition-all duration-700 ease-out delay-300
            ${isLoaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}
          `}
        >
          <div className="max-w-3xl mx-auto">
            <ChatInput onSend={handleSendMessage} />
            
            {/* Disclaimer */}
            <p className="text-center text-[#444] text-xs mt-4">
              Synapse can make mistakes. Consider checking important information.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Index;
