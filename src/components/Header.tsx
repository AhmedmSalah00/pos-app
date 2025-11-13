import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Globe, Bell, Search, Sun, Moon } from 'react-feather';
import { useLocation } from 'react-router-dom';

const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path === '/pos') return 'Point of Sale';
    if (path === '/products') return 'Products';
    if (path === '/customers') return 'Customers';
    if (path === '/suppliers') return 'Suppliers';
    if (path === '/categories') return 'Categories';
    if (path === '/returns') return 'Returns';
    if (path === '/expenses') return 'Expenses';
    if (path === '/reports') return 'Reports';
    if (path === '/users') return 'Users';
    if (path === '/settings') return 'Settings';
    if (path === '/installments') return 'Installments';
    return 'POS System';
  };

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  return (
    <motion.header 
      className="h-16 bg-white shadow-sm border-b border-gray-100 px-6 flex items-center justify-between"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Left: Page Title */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">{getPageTitle()}</h1>
        <p className="text-sm text-gray-500">Welcome back, {user?.username}</p>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center space-x-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search..."
            className="pl-10 pr-4 py-2 w-64 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Language */}
        <div className="relative group">
          <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <Globe size={20} />
          </button>
          <div className="absolute right-0 mt-2 w-24 bg-white rounded-lg shadow-lg border border-gray-200 py-1 hidden group-hover:block">
            <button onClick={() => changeLanguage('en')} className="block w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">EN</button>
            <button onClick={() => changeLanguage('ar')} className="block w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">AR</button>
          </div>
        </div>

        {/* Notifications */}
        <button className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 relative">
          <Bell size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </div>
    </motion.header>
  );
};

export default Header;