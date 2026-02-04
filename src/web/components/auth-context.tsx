import { createContext, useContext, useState, useEffect, ReactNode } from "react";

// User interface
export interface User {
  id: string;
  email: string | null;
  name: string;
  avatar: string | null;
  loggedIn: boolean;
  createdAt: string;
  lastVisit: string;
  visits: number;
  provider: "google" | "email";
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  login: (provider: "google" | "email", email?: string) => void;
  logout: () => void;
}

const AUTH_STORAGE_KEY = "synapse_user";

// Generate unique user ID
const generateUserId = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "user_";
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Generate random avatar URL
const generateAvatar = (seed: string) => {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=6366f1,4f46e5,3b82f6`;
};

// Generate random name for Google login
const generateRandomName = () => {
  const adjectives = ["Креативный", "Яркий", "Продвинутый", "Талантливый", "Энергичный"];
  const nouns = ["Творец", "Художник", "Дизайнер", "Создатель", "Мастер"];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  return `${adj} ${noun}`;
};

const AuthContext = createContext<AuthState | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Load user from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsedUser: User = JSON.parse(stored);
        if (parsedUser.loggedIn) {
          // Update last visit and increment visits for returning user
          const now = new Date().toISOString();
          const updatedUser = {
            ...parsedUser,
            lastVisit: now,
            visits: (parsedUser.visits || 1) + 1,
          };
          setUser(updatedUser);
          // Update in localStorage
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
          // Update in global users store
          updateUserInStore(updatedUser);
        } else {
          // Show auth modal if user logged out
          setShowAuthModal(true);
        }
      } else {
        // No user - show auth modal
        setShowAuthModal(true);
      }
    } catch (error) {
      console.error("Failed to load user from localStorage:", error);
      setShowAuthModal(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save user to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
        // Also store userId separately for compatibility with existing referral system
        localStorage.setItem("userId", user.id);
        // Store email separately for admin tracking
        if (user.email) {
          localStorage.setItem("user_email", user.email);
        }
      } catch (error) {
        console.error("Failed to save user to localStorage:", error);
      }
    }
  }, [user]);

  const login = (provider: "google" | "email", email?: string) => {
    const userId = generateUserId();
    const now = new Date().toISOString();

    let newUser: User;

    if (provider === "google") {
      const name = generateRandomName();
      newUser = {
        id: userId,
        email: `${name.toLowerCase().replace(" ", ".")}@gmail.com`,
        name,
        avatar: generateAvatar(userId),
        loggedIn: true,
        createdAt: now,
        lastVisit: now,
        visits: 1,
        provider: "google",
      };
    } else {
      // Email login
      const emailName = email?.split("@")[0] || "User";
      const formattedName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
      newUser = {
        id: userId,
        email: email || null,
        name: formattedName,
        avatar: generateAvatar(email || userId),
        loggedIn: true,
        createdAt: now,
        lastVisit: now,
        visits: 1,
        provider: "email",
      };
    }

    setUser(newUser);
    setShowAuthModal(false);

    // Register user in the global users store for admin tracking
    registerUser(newUser);
  };

  const logout = () => {
    if (user) {
      // Keep the user data but mark as logged out
      const loggedOutUser = { ...user, loggedIn: false };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(loggedOutUser));
    }
    setUser(null);
    setShowAuthModal(true);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user && user.loggedIn,
        isLoading,
        showAuthModal,
        setShowAuthModal,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Register user in global users store for admin tracking
const registerUser = (user: User) => {
  try {
    const usersKey = "synapse_all_users";
    const existingUsers = JSON.parse(localStorage.getItem(usersKey) || "{}");
    
    if (!existingUsers[user.id]) {
      existingUsers[user.id] = {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        createdAt: user.createdAt,
        lastVisit: user.lastVisit,
        visits: user.visits,
        provider: user.provider,
      };
      localStorage.setItem(usersKey, JSON.stringify(existingUsers));
    }
  } catch (error) {
    console.error("Failed to register user:", error);
  }
};

// Update user in global users store
const updateUserInStore = (user: User) => {
  try {
    const usersKey = "synapse_all_users";
    const existingUsers = JSON.parse(localStorage.getItem(usersKey) || "{}");
    
    if (existingUsers[user.id]) {
      existingUsers[user.id] = {
        ...existingUsers[user.id],
        lastVisit: user.lastVisit,
        visits: user.visits,
      };
      localStorage.setItem(usersKey, JSON.stringify(existingUsers));
    }
  } catch (error) {
    console.error("Failed to update user in store:", error);
  }
};
