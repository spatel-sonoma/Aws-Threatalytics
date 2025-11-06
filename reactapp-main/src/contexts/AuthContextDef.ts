import { createContext } from 'react';

export interface User {
  id: string;
  email: string;
  subscription: {
    plan: string;
    status: string;
    usage: {
      current: number;
      limit: number;
    };
  };
}

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);