import { useState, useEffect } from "react";
import { X, Download, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export const PWAInstallBanner = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Check if iOS
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Check if banner was dismissed recently
    const dismissedAt = localStorage.getItem("pwa-banner-dismissed");
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      // Don't show for 7 days after dismissal
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // Check if on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    // Listen for beforeinstallprompt event (Android/Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (isMobile && !standalone) {
        setShowBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // For iOS, show banner immediately on mobile if not standalone
    if (ios && isMobile && !standalone) {
      setShowBanner(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-banner-dismissed", Date.now().toString());
  };

  // Don't render if in standalone mode or banner is hidden
  if (isStandalone || !showBanner) return null;

  return (
    <div 
      className="
        fixed bottom-0 left-0 right-0 z-[90]
        animate-in slide-in-from-bottom duration-500
        safe-area-bottom
      "
    >
      <div 
        className="
          mx-3 mb-3 md:mx-4 md:mb-4
          p-4 rounded-2xl
          bg-[#0a0a0a]/95 backdrop-blur-xl
          border border-[#333]
          shadow-2xl shadow-black/50
          flex items-center gap-3 md:gap-4
        "
      >
        {/* Icon */}
        <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 flex items-center justify-center">
          <Smartphone className="w-6 h-6 text-indigo-400" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-medium text-sm md:text-base">
            Install Synapse for a better experience 📲
          </p>
          {isIOS ? (
            <p className="text-[#888] text-xs mt-0.5 truncate">
              Tap the share button, then "Add to Home Screen"
            </p>
          ) : (
            <p className="text-[#888] text-xs mt-0.5 truncate">
              Get faster access and offline support
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isIOS && deferredPrompt && (
            <button
              onClick={handleInstall}
              className="
                px-4 py-2.5 rounded-xl
                bg-gradient-to-r from-indigo-600 to-blue-600
                text-white text-sm font-medium
                hover:shadow-lg hover:shadow-indigo-500/30
                transition-all duration-200
                active:scale-95
                flex items-center gap-2
              "
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Install</span>
            </button>
          )}
          
          <button
            onClick={handleDismiss}
            className="
              p-2.5 rounded-xl
              bg-white/[0.05] border border-[#333]
              text-[#888] hover:text-white
              transition-all duration-200
              active:scale-95
            "
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
