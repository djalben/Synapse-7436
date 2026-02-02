import { useState } from "react";
import { Sparkles, Mail, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "./auth-context";
import { toast } from "sonner";

// Google logo SVG component
const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

export const AuthModal = () => {
  const { showAuthModal, login, isLoading } = useAuth();
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogleLogin = () => {
    setIsSubmitting(true);
    // Simulate a brief delay for authentication
    setTimeout(() => {
      login("google");
      setIsSubmitting(false);
      toast.success("Welcome to Synapse! 🚀", {
        description: "Your AI-powered creative studio is ready.",
      });
    }, 800);
  };

  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);
    // Simulate a brief delay for authentication
    setTimeout(() => {
      login("email", email);
      setIsSubmitting(false);
      toast.success("Welcome to Synapse! 🚀", {
        description: "Your AI-powered creative studio is ready.",
      });
    }, 800);
  };

  if (!showAuthModal || isLoading) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop - cannot be dismissed */}
      <div className="absolute inset-0 bg-black/95 backdrop-blur-xl" />

      {/* Background animated effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating gradient orbs */}
        <div 
          className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.4) 0%, transparent 70%)",
            animation: "float 20s ease-in-out infinite",
          }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%)",
            animation: "float 25s ease-in-out infinite reverse",
          }}
        />
        <div 
          className="absolute top-1/2 right-1/3 w-[300px] h-[300px] rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, rgba(139, 92, 246, 0.4) 0%, transparent 70%)",
            animation: "float 18s ease-in-out infinite 2s",
          }}
        />

        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
            `,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Modal Card */}
      <div className="relative w-full max-w-md">
        {/* Glow effect behind card */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-500/20 via-blue-500/10 to-purple-500/20 rounded-3xl blur-3xl scale-110" />
        
        <div className="relative rounded-2xl md:rounded-3xl bg-[#0a0a0a]/90 backdrop-blur-2xl border border-[#222] shadow-2xl overflow-hidden">
          {/* Inner glow effects */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-indigo-500/10 rounded-full blur-3xl" />
          </div>

          <div className="relative p-8 md:p-10">
            {/* Logo with sparkle animation */}
            <div className="flex justify-center mb-8">
              <div className="relative group">
                {/* Animated glow ring */}
                <div 
                  className="absolute inset-0 rounded-2xl bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 blur-md opacity-60"
                  style={{
                    animation: "pulse-glow 2s ease-in-out infinite",
                  }}
                />
                {/* Logo container */}
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                {/* Floating particles */}
                <div 
                  className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-blue-400"
                  style={{ animation: "float-particle 3s ease-in-out infinite" }}
                />
                <div 
                  className="absolute -bottom-1 -left-1 w-1.5 h-1.5 rounded-full bg-indigo-400"
                  style={{ animation: "float-particle 3s ease-in-out infinite 1s" }}
                />
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 font-mono tracking-tight">
                Welcome to{" "}
                <span className="bg-gradient-to-r from-indigo-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  Synapse
                </span>
              </h1>
              <p className="text-[#888] text-sm md:text-base">
                The premium AI platform for creators
              </p>
            </div>

            {/* Login Options */}
            <div className="space-y-3">
              {/* Google Login */}
              <button
                onClick={handleGoogleLogin}
                disabled={isSubmitting}
                className="
                  w-full flex items-center justify-center gap-3 
                  px-4 py-3.5 rounded-xl
                  bg-white text-gray-800 font-medium
                  hover:bg-gray-100 active:scale-[0.98]
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed
                  shadow-lg shadow-white/10
                "
              >
                {isSubmitting && !showEmailInput ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <GoogleLogo />
                )}
                <span>Continue with Google</span>
              </button>

              {/* Divider */}
              <div className="relative py-3">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#333]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-[#0a0a0a] px-4 text-xs text-[#666] uppercase tracking-wider">
                    or
                  </span>
                </div>
              </div>

              {/* Email Login */}
              {!showEmailInput ? (
                <button
                  onClick={() => setShowEmailInput(true)}
                  disabled={isSubmitting}
                  className="
                    w-full flex items-center justify-center gap-3 
                    px-4 py-3.5 rounded-xl
                    bg-white/[0.05] border border-[#333] text-white font-medium
                    hover:bg-white/[0.08] hover:border-[#444] active:scale-[0.98]
                    transition-all duration-200
                    disabled:opacity-50 disabled:cursor-not-allowed
                  "
                >
                  <Mail className="w-5 h-5 text-[#888]" />
                  <span>Continue with Email</span>
                </button>
              ) : (
                <form onSubmit={handleEmailLogin} className="space-y-3">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#666]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      autoFocus
                      className="
                        w-full pl-12 pr-4 py-3.5 rounded-xl
                        bg-white/[0.05] border border-[#333] text-white
                        placeholder:text-[#666]
                        focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30
                        transition-all duration-200
                      "
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="
                      w-full flex items-center justify-center gap-2
                      px-4 py-3.5 rounded-xl
                      bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 
                      text-white font-medium
                      hover:from-indigo-500 hover:via-blue-500 hover:to-indigo-500
                      active:scale-[0.98]
                      transition-all duration-200
                      disabled:opacity-50 disabled:cursor-not-allowed
                      shadow-lg shadow-indigo-500/30
                      relative overflow-hidden group
                    "
                  >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                    {isSubmitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <span>Continue</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailInput(false);
                      setEmail("");
                    }}
                    className="w-full text-center text-sm text-[#666] hover:text-[#888] transition-colors"
                  >
                    Back to options
                  </button>
                </form>
              )}
            </div>

            {/* Terms */}
            <p className="mt-8 text-center text-xs text-[#555] leading-relaxed">
              By continuing, you agree to our{" "}
              <a href="#" className="text-[#888] hover:text-white transition-colors underline underline-offset-2">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-[#888] hover:text-white transition-colors underline underline-offset-2">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -30px) scale(1.05); }
          50% { transform: translate(-10px, 20px) scale(0.95); }
          75% { transform: translate(30px, 10px) scale(1.02); }
        }
        
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        
        @keyframes float-particle {
          0%, 100% { transform: translate(0, 0); opacity: 0.8; }
          50% { transform: translate(5px, -8px); opacity: 1; }
        }
      `}</style>
    </div>
  );
};
