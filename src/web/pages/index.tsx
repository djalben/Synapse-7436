import { useState, useRef } from "react";
import { Sidebar } from "../components/sidebar";
import { AnimatedBackground } from "../components/animated-background";
import { MotionLab } from "../components/motion-lab";
import { ImageStudio } from "../components/image-studio";
import { HistoryPlaceholder, SettingsPlaceholder } from "../components/placeholder-pages";
import { ChatInterface } from "../components/chat-interface";
import { UsageProvider } from "../components/usage-context";
import { PaywallModal } from "../components/paywall-modal";

function Index() {
  const [activeTab, setActiveTab] = useState("chat");
  const [videoLoaded, setVideoLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Render the content based on active tab
  const renderContent = () => {
    switch (activeTab) {
      case "chat":
        return <ChatInterface />;
      case "motion":
        return <MotionLab />;
      case "image":
        return <ImageStudio />;
      case "history":
        return <HistoryPlaceholder />;
      case "settings":
        return <SettingsPlaceholder />;
      default:
        return <ChatInterface />;
    }
  };

  return (
    <UsageProvider>
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

        {/* Subtle background pattern */}
        <div className="fixed inset-0 pointer-events-none z-[1]">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.1),transparent)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.05),transparent)]" />
        </div>

        {/* Animated Background Effects */}
        <AnimatedBackground />

        {/* Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Main Content */}
        <main className="relative z-10 ml-[240px] min-h-screen flex flex-col">
          {renderContent()}
        </main>

        {/* Paywall Modal */}
        <PaywallModal />
      </div>
    </UsageProvider>
  );
}

export default Index;
