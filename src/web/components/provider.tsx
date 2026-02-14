import { useEffect } from "react";
import { Metadata } from "./metadata";
import { Toaster } from "./ui/sonner";
import { AuthProvider } from "./auth-context";

interface ProviderProps {
  children: React.ReactNode;
}

// Traffic/visit tracking
const useVisitTracking = () => {
  useEffect(() => {
    try {
      // Increment total visits
      const totalVisitsKey = "synapse_total_visits";
      const currentTotal = parseInt(localStorage.getItem(totalVisitsKey) || "0", 10);
      localStorage.setItem(totalVisitsKey, String(currentTotal + 1));

      // Track daily visits
      const dailyVisitsKey = "synapse_daily_visits";
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const dailyVisits = JSON.parse(localStorage.getItem(dailyVisitsKey) || "{}");
      
      dailyVisits[today] = (dailyVisits[today] || 0) + 1;
      
      // Keep only last 30 days of data
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const cutoffDate = thirtyDaysAgo.toISOString().split("T")[0];
      
      Object.keys(dailyVisits).forEach(date => {
        if (date < cutoffDate) {
          delete dailyVisits[date];
        }
      });
      
      localStorage.setItem(dailyVisitsKey, JSON.stringify(dailyVisits));
    } catch (error) {
      console.error("Failed to track visit:", error);
    }
  }, []);
};

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
  useVisitTracking();

  return (
    <AuthProvider>
      <Metadata />
      {children}
      <Toaster />
    </AuthProvider>
  );
}
