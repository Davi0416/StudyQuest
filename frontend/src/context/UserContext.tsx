import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { unwrap } from '../lib/api';
import type {  User  } from "../types";
import { useNavigate } from 'react-router-dom';

interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  loading: boolean;
  addXp: (amount: number) => void;
  logout: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initUser = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await api.get('/users/me');
        setUser(unwrap(res));
      } catch (err) {
        console.error('Failed to load user', err);
      } finally {
        setLoading(false);
      }
    };
    initUser();
  }, []);

  const addXp = (amount: number) => {
    setUser(prev => {
      if (!prev) return prev;
      return { ...prev, totalXp: prev.totalXp + amount };
    });
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
    navigate('/login');
  };

  return (
    <UserContext.Provider value={{ user, setUser, loading, addXp, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
