import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Globe, DollarSign, User, Sun, Moon } from 'react-feather'; // Import necessary icons

const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth(); // Keeping logout for potential user avatar click context
  const { i18n } = useTranslation();

  const changeLanguage = (lang: string) => { // Changed type to string to match i18n.changeLanguage
    i18n.changeLanguage(lang);
  };

  return (
    <motion.header 
      className="h-20 bg-white/30 backdrop-blur-lg rounded-3xl shadow-2xl m-4 px-6 flex items-center justify-between"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: 0.1 }}
    >
      {/* Left Section: Dashboard Title */}
      <div>
        <h1 className="text-xl font-bold text-gray-800">Dashboard</h1>
      </div>

      {/* Right Section: Icons for Lang, Currency, Mode, User */}
      <div className="flex items-center space-x-4">
        {/* Language */}
        <div className="relative group">
          <Globe size={20} className="text-gray-600 cursor-pointer hover:text-gray-800" />
          <div className="absolute hidden group-hover:block bg-white/70 backdrop-blur-md rounded-lg shadow-lg py-1 mt-2 -left-4">
            <button onClick={() => changeLanguage('en')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-white/90">EN</button>
            <button onClick={() => changeLanguage('ar')} className="block px-4 py-2 text-sm text-gray-700 hover:bg-white/90">AR</button>
          </div>
        </div>
        
        {/* Currency (Placeholder for now) */}
        <DollarSign size={20} className="text-gray-600" />

        {/* Theme Toggle (Mode) */}
        <motion.button
          onClick={toggleTheme}
          className="p-1 rounded-full text-gray-600 hover:text-gray-800 focus:outline-none"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </motion.button>

        {/* User Avatar */}
        <motion.div
          className="w-8 h-8 rounded-full bg-white/50 flex items-center justify-center text-gray-700 font-semibold cursor-pointer"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={logout} // Clicking avatar logs out for now
          title={`Logged in as ${user?.username || 'Guest'}. Click to logout.`}
        >
          <User size={20} />
        </motion.div>
      </div>
    </motion.header>
  );
};

export default Header;
