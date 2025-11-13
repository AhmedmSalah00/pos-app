import React, { createContext, useState, useContext, useEffect, PropsWithChildren } from 'react';
import db from '../db/database';

interface User {
  id: number;
  username: string;
  role: 'admin' | 'cashier';
  password?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to safely load bcrypt at runtime (avoids browser bundling issues)
// Falls back to plaintext comparison in browser (since mock DB uses plaintext)
async function compareBcrypt(password: string, storedPassword: string): Promise<boolean> {
  try {
    // eslint-disable-next-line no-new-func
    const req = (typeof require !== 'undefined') ? require : new Function('return require')();
    const bcrypt = req('bcrypt');
    return new Promise((resolve) => {
      bcrypt.compare(password, storedPassword, (err: any, result: boolean) => {
        resolve(result === true);
      });
    });
  } catch (error) {
    // In browser without bcrypt, compare plaintext (mock database uses plaintext for simplicity)
    console.warn('bcrypt not available, using plaintext comparison (browser environment)');
    return password === storedPassword;
  }
}

export const AuthProvider: React.FC<PropsWithChildren<{}>> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for a logged-in user in session storage
    const storedUser = sessionStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (username: string, password: string) => {
    const row = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as User;
    if (row) {
      const result = await compareBcrypt(password, row.password!);
      if (result) {
        const { password, ...currentUser } = row;
        setUser(currentUser);
        sessionStorage.setItem('user', JSON.stringify(currentUser));
      } else {
        throw new Error('Invalid password');
      }
    } else {
      throw new Error('User not found');
    }
  };

  const logout = () => {
    setUser(null);
    sessionStorage.removeItem('user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};