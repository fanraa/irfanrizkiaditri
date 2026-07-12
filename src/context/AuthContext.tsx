import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import { signInWithPopup, signOut as firebaseSignOut, onAuthStateChanged, User } from 'firebase/auth';

interface AuthContextType {
  isAdmin: boolean;
  userEmail: string | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Check local storage for admin override
    const savedAdmin = localStorage.getItem('_app_role_a');
    if (savedAdmin === '1') setIsAdmin(true);

    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        setUserEmail(user.email);
        
        // If logged in via Google with the admin email, set admin
        if (user.email === 'ifansra@gmail.com' || user.email === 'irfanrizkiaditri@gmail.com' || user.email === 'irfan.125110007@student.itera.ac.id') {
          setIsAdmin(true);
        } else {
          // If not admin email, ensure admin is false unless they used passcode (checked above)
          if (savedAdmin !== '1') {
            setIsAdmin(false);
          }
        }
      } else {
        setUserEmail(null);
        if (savedAdmin !== '1') {
          setIsAdmin(false);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setIsAdmin(false);
      localStorage.removeItem('_app_role_a');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ isAdmin, userEmail, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
