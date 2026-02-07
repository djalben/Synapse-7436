import { useState, useEffect, useRef } from "react";
import { X, Download, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const PWA_DELAY_MS = 3 * 60 * 1000; // 3 минуты после согласия с cookie
const VISIT_KEY = "synapse-pwa-visits";

interface PWAInstallBannerProps {
  /** Не показывать баннер, пока виден Cookie Banner (запрет одновременного показа) */
  suppressWhenCookieVisible?: boolean;
}

export const PWAInstallBanner = ({ suppressWhenCookieVisible = false }: PWAInstallBannerProps) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const mountedAt = useRef(Date.now());

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as unknown as { MSStream?: boolean }).MSStream;
    setIsIOS(ios);

    const dismissedAt = localStorage.getItem("pwa-banner-dismissed");
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      if (Date.now() - dismissedTime < 7 * 24 * 60 * 60 * 1000) return;
    }

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile || standalone) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const visits = parseInt(localStorage.getItem(VISIT_KEY) ?? "0", 10);
    localStorage.setItem(VISIT_KEY, String(visits + 1));
    const isSecondVisit = visits >= 1;

    const tryShow = () => {
      if (!localStorage.getItem("cookieConsent")) return;
      const v = parseInt(localStorage.getItem(VISIT_KEY) ?? "0", 10);
      const elapsed = Date.now() - mountedAt.current;
      // Через 3 минуты или при втором визите (после Cookie — без наложения)
      if (elapsed >= PWA_DELAY_MS || v >= 2) setShowBanner(true);
    };

    const t1 = isSecondVisit ? setTimeout(tryShow, 8000) : null;
    const t2 = setTimeout(tryShow, PWA_DELAY_MS);

    return () => {
      if (t1) clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    const prompt = deferredPrompt;
    try {
      await prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === "accepted") setShowBanner(false);
    } finally {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-banner-dismissed", Date.now().toString());
  };

  // Не показывать вместе с Cookie Banner; не показывать в standalone или если скрыт
  if (isStandalone || !showBanner || suppressWhenCookieVisible) return null;

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
            Установите Synapse на рабочий стол для быстрого доступа
          </p>
          {isIOS ? (
            <p className="text-[#888] text-xs mt-0.5 truncate">
              Нажмите «Поделиться» → «На экран Домой»
            </p>
          ) : (
            <p className="text-[#888] text-xs mt-0.5 truncate">
              Быстрый доступ и работа офлайн
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {!isIOS && deferredPrompt && (
            <button
              type="button"
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
              <span>Установить</span>
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
