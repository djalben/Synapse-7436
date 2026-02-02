import { useEffect } from "react";
import { Metadata } from "./metadata";
import { Toaster } from "./ui/sonner";
import { AuthProvider } from "./auth-context";

interface ProviderProps {
  children: React.ReactNode;
}

// Handle referral URL parameter
const useReferralTracking = () => {
  useEffect(() => {
    // Check for referral parameter in URL
    const urlParams = new URLSearchParams(window.location.search);
    const refId = urlParams.get("ref");
    
    if (refId) {
      // Only store if not already referred (first referrer wins)
      const existingRef = localStorage.getItem("referredBy");
      if (!existingRef) {
        localStorage.setItem("referredBy", refId);
        console.log("Referral tracked:", refId);
      }
      
      // Clean up URL (remove ref param) without page reload
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("ref");
      window.history.replaceState({}, "", newUrl.toString());
    }
  }, []);
};

export function Provider({ children }: ProviderProps) {
  useReferralTracking();

  return (
    <AuthProvider>
      <Metadata />
      {children}
      <Toaster />
    </AuthProvider>
  );
}
