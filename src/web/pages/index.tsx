import { useState, useRef } from "react";
import { Sidebar } from "../components/sidebar";
import { AnimatedBackground } from "../components/animated-background";
import { MotionLab } from "../components/motion-lab";
import { ImageStudio } from "../components/image-studio";
import { AudioStudio } from "../components/audio-studio";
import { AvatarStudio } from "../components/avatar-studio";
import { HistoryPage } from "../components/placeholder-pages";
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
      case "avatar":
        return <AvatarStudio />;
      case "history":
        return <HistoryPage onNavigate={setActiveTab} />;
      case "settings":
        return <SettingsPage />;
      default:
        return <ChatInterface />;
    }
  };

  return (
    <UsageProvider>
      <div className="min-h-screen bg-transparent text-white overflow-x-hidden">
        {/* Глобальный фон: на 100% экрана, под сайдбаром и всем контентом (-z-10) */}
        <div className="fixed inset-0 w-full h-full min-w-full min-h-full -z-10 pointer-events-none overflow-hidden" style={{ width: "100vw", height: "100vh" }}>
          <video
            ref={videoRef}
            autoPlay
            loop
            muted
            playsInline
            onLoadedData={() => setVideoLoaded(true)}
            className={`
              absolute inset-0 w-full h-full object-cover min-h-full min-w-full
              blur-sm
              transition-opacity duration-1000 ease-out
              ${videoLoaded ? "opacity-[0.14]" : "opacity-0"}
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
              bg-gradient-to-br from-indigo-950/40 via-transparent to-blue-950/30
              mix-blend-overlay
              transition-opacity duration-1000
              ${videoLoaded ? "opacity-100" : "opacity-0"}
            `}
          />
          <div className="absolute inset-0 min-h-full min-w-full">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(99,102,241,0.14),transparent)]" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(59,130,246,0.08),transparent)]" />
          </div>
          <AnimatedBackground />
        </div>

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
          {/* Чат ограничен 100dvh и не создаёт двойной скролл; остальные вкладки — flex-1 */}
          <div className={activeTab === "chat" ? "h-[100dvh] max-h-[100dvh] min-h-0 overflow-hidden" : "flex-1"}>
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
