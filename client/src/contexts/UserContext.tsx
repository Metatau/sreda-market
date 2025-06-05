import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiRequest } from '@/lib/queryClient';

export interface User {
  id: number;
  username: string;
  email: string;
  role: 'administrator' | 'client';
  telegramHandle?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  bonusBalance: string;
  subscription: {
    isActive: boolean;
    type: string | null;
    expiresAt: Date | null;
    daysLeft: number;
  };
  aiLimits: {
    dailyLimit: number;
    used: number;
    canUse: boolean;
    resetTime: Date;
  };
}

interface UserContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdministrator: boolean;
  refreshUser: () => Promise<void>;
  login: (email: string) => Promise<void>;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider = ({ children }: UserProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const currentEmail = localStorage.getItem('userEmail');
      if (!currentEmail) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/users/profile', {
        headers: {
          'X-User-Email': currentEmail,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user profile');
      }

      const userData = await response.json();
      setUser(userData);
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      setUser(null);
      localStorage.removeItem('userEmail');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string) => {
    try {
      localStorage.setItem('userEmail', email);
      await refreshUser();
    } catch (error) {
      console.error('Login failed:', error);
      localStorage.removeItem('userEmail');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('userEmail');
    setUser(null);
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const isAuthenticated = !!user;
  const isAdministrator = user?.role === 'administrator';

  return (
    <UserContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        isAdministrator,
        refreshUser,
        login,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};