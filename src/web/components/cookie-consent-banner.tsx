import { useState, useEffect } from "react";
import { Cookie } from "lucide-react";

export const CookieConsentBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Check if consent was already given
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      // Small delay before showing for smoother UX
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleConsent = (choice: "accepted" | "declined") => {
    setIsExiting(true);
    // Wait for animation to complete before hiding
    setTimeout(() => {
      localStorage.setItem("cookieConsent", choice);
      setIsVisible(false);
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-50
        transition-all duration-300 ease-out
        ${isExiting 
          ? "opacity-0 translate-y-4" 
          : "opacity-100 translate-y-0"
        }
      `}
    >
      {/* Glassmorphism container */}
      <div className="mx-4 mb-4 md:mx-6 md:mb-6">
        <div 
          className="
            max-w-4xl mx-auto
            bg-black/80 backdrop-blur-xl
            border border-[#333] border-t-[#444]
            rounded-2xl
            p-4 md:p-5
            shadow-[0_-4px_32px_rgba(0,0,0,0.3)]
          "
        >
          <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
            {/* Icon and Text */}
            <div className="flex items-start gap-3 flex-1">
              <div className="shrink-0 mt-0.5">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 flex items-center justify-center">
                  <Cookie className="w-4 h-4 text-indigo-400" />
                </div>
              </div>
              <p className="text-sm md:text-[14px] text-[#aaa] leading-relaxed">
                We use cookies to provide the best AI experience and analyze usage. 
                By using Synapse, you agree to our{" "}
                <span className="text-white/90 hover:text-indigo-400 cursor-pointer transition-colors">
                  privacy policy
                </span>.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
              <button
                onClick={() => handleConsent("declined")}
                className="
                  flex-1 md:flex-none
                  px-5 py-2.5
                  rounded-xl
                  text-sm font-medium
                  text-[#888] hover:text-white
                  bg-transparent hover:bg-white/[0.05]
                  border border-[#333] hover:border-[#444]
                  transition-all duration-200
                "
              >
                Decline
              </button>
              <button
                onClick={() => handleConsent("accepted")}
                className="
                  flex-1 md:flex-none
                  px-5 py-2.5
                  rounded-xl
                  text-sm font-medium
                  text-white
                  bg-gradient-to-r from-indigo-600 to-blue-600
                  hover:from-indigo-500 hover:to-blue-500
                  shadow-lg shadow-indigo-500/20
                  hover:shadow-indigo-500/30
                  transition-all duration-200
                  hover:scale-[1.02]
                "
              >
                Accept
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
