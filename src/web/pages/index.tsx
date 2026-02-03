import { useState, useRef } from "react";
import { Sidebar } from "../components/sidebar";
import { AnimatedBackground } from "../components/animated-background";
import { MotionLab } from "../components/motion-lab";
import { ImageStudio } from "../components/image-studio";
import { AudioStudio } from "../components/audio-studio";
import { HistoryPlaceholder } from "../components/placeholder-pages";
import { SettingsPage } from "../components/settings-page";
import { ChatInterface } from "../components/chat-interface";
import { UsageProvider } from "../components/usage-context";
import { PaywallModal } from "../components/paywall-modal";
import { MobileNav, MobileTopBar } from "../components/mobile-nav";
import { PWAInstallBanner } from "../components/pwa-install-banner";
import { CookieConsentBanner } from "../components/cookie-consent-banner";
import { Footer } from "../components/footer";
import { AuthModal } from "../components/auth-modal";
import { UserAvatar } from "../components/user-avatar";

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
      case "audio":
        return <AudioStudio />;
      case "history":
        return <HistoryPlaceholder />;
      case "settings":
        return <SettingsPage />;
      default:
        return <ChatInterface />;
    }
  };

  return (
    <UsageProvider>
      <div className="min-h-screen bg-black text-white overflow-x-hidden">
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

        {/* Mobile Navigation */}
        <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
        
        {/* Mobile Top Bar with User Avatar */}
        <MobileTopBar activeTab={activeTab}>
          <UserAvatar onSettingsClick={() => setActiveTab("settings")} />
        </MobileTopBar>

        {/* Desktop Sidebar */}
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Desktop User Avatar - Top Right with proper spacing */}
        <div className="hidden md:block fixed top-4 right-6 z-50">
          <UserAvatar onSettingsClick={() => setActiveTab("settings")} />
        </div>

        {/* Main Content */}
        <main className="
          relative z-10 min-h-screen flex flex-col
          md:ml-[240px]
          pt-16 md:pt-0
          pb-20 md:pb-0
        ">
          <div className="flex-1">
            {renderContent()}
          </div>
          
          {/* Footer */}
          <Footer />
        </main>

        {/* Paywall Modal */}
        <PaywallModal />

        {/* PWA Install Banner */}
        <PWAInstallBanner />

        {/* Cookie Consent Banner */}
        <CookieConsentBanner />

        {/* Auth Modal - Must be logged in to use the app */}
        <AuthModal />
      </div>
    </UsageProvider>
  );
}

export default Index;
