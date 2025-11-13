import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Products from './pages/Products';
import Customers from './pages/Customers';
import Suppliers from './pages/Suppliers';
import Expenses from './pages/Expenses';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Users from './pages/Users';
import Categories from './pages/Categories';
import Returns from './pages/Returns';
import InstallmentTracking from './pages/InstallmentTracking';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import { ThemeProvider } from './contexts/ThemeContext';
import db from './db/database';
import { AnimatePresence, motion } from 'framer-motion';

interface Setting {
  value: string;
}

const App: React.FC = () => {
  const [appType, setAppType] = useState<string>('supermarket'); // Default to supermarket
  const [loading, setLoading] = useState(false); // Don't show loading initially

  console.log('App component rendered, appType:', appType);

  useEffect(() => {
    console.log('App useEffect running');
    try {
      const appTypeSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('app_type') as Setting;
      if (appTypeSetting && appTypeSetting.value) {
        setAppType(appTypeSetting.value);
      }
    } catch (error) {
      console.warn('Database not available:', error);
      // Keep default supermarket type
    }
  }, []);

  const handleAppTypeSelect = (type: string) => {
    try {
      db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(type, 'app_type');
    } catch (error) {
      console.warn('Could not save app type to database:', error);
    }
    setAppType(type);
  };

  // Skip the app type selection screen and go straight to login
  // The app type is stored but doesn't block the UI anymore

  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <MainLayout />
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-200">
      <div className="flex h-screen">
        {user && <Sidebar />}
        <div className="flex-1 flex flex-col overflow-hidden">
          {user && <Header />}
          <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <Routes location={location}>
                  <Route path="/login" element={<Login />} />
                  <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
                  <Route path="/pos" element={user ? <POS /> : <Navigate to="/login" />} />
                  <Route path="/products" element={user ? <Products /> : <Navigate to="/login" />} />
                  <Route path="/customers" element={user ? <Customers /> : <Navigate to="/login" />} />
                  <Route path="/suppliers" element={user ? <Suppliers /> : <Navigate to="/login" />} />
                  <Route path="/expenses" element={user ? <Expenses /> : <Navigate to="/login" />} />
                  <Route path="/reports" element={user ? <Reports /> : <Navigate to="/login" />} />
                  <Route path="/settings" element={user ? <Settings /> : <Navigate to="/login" />} />
                  <Route path="/users" element={user ? <Users /> : <Navigate to="/login" />} />
                  <Route path="/categories" element={user ? <Categories /> : <Navigate to="/login" />} />
                  <Route path="/returns" element={user ? <Returns /> : <Navigate to="/login" />} />
                  <Route path="/installments" element={user ? <InstallmentTracking /> : <Navigate to="/login" />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </main>
        </div>
      </div>
    </div>
  );
};

export default App;