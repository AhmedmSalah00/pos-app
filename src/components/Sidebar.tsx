import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import db from '../db/database';
import { motion } from 'framer-motion';
import {
  Layout,
  ShoppingCart,
  Package,
  Users,
  BarChart2,
  Settings,
  Tag,
  UserCheck,
  UserPlus,
  DollarSign,
  RefreshCw,
  FileText,
  Square, // Added Square icon for navigation items
} from 'react-feather';

interface Setting {
  value: string;
}

interface Count {
  count: number;
}

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const appTypeResult = db.prepare('SELECT value FROM settings WHERE key = ?').get('app_type') as Setting | undefined;
  const appType = appTypeResult?.value;
  
  const hasInstallmentsResult = db.prepare('SELECT COUNT(*) as count FROM installment_payments').get() as Count | undefined;
  const hasInstallments = (hasInstallmentsResult?.count ?? 0) > 0;

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: <Layout size={20} /> },
    { to: '/pos', label: 'POS', icon: <ShoppingCart size={20} /> },
    { to: '/products', label: 'Products', icon: <Package size={20} /> },
    { to: '/categories', label: 'Categories', icon: <Tag size={20} /> },
    { to: '/customers', label: 'Customers', icon: <Users size={20} /> },
    { to: '/suppliers', label: 'Suppliers', icon: <UserPlus size={20} /> },
    { to: '/returns', label: 'Returns', icon: <RefreshCw size={20} /> },
    { to: '/expenses', label: 'Expenses', icon: <DollarSign size={20} /> },
    { to: '/reports', label: 'Reports', icon: <BarChart2 size={20} />, adminOnly: true },
    { to: '/users', label: 'Users', icon: <UserCheck size={20} />, adminOnly: true },
    { to: '/settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  if (appType === 'installment' && hasInstallments) {
    navLinks.splice(2, 0, { to: '/installments', label: 'Installments', icon: <FileText size={20} /> });
  }

  // Removed linkVariants as per design analysis

  return (
    <motion.div 
      className="w-64 h-[calc(100vh-2rem)] m-4 p-4 bg-white/30 backdrop-blur-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden"
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Logo Section */}
      <div className="p-4 mb-6 text-center">
        <div className="w-16 h-16 mx-auto bg-white/50 rounded-full flex items-center justify-center text-gray-700 font-bold text-lg shadow-inner">
          LOGO
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto space-y-2">
        {navLinks.map((link: any) => {
          if (link.adminOnly && user?.role !== 'admin') {
            return null;
          }
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ease-in-out ${
                  isActive
                    ? 'bg-white/70 text-gray-800 font-semibold shadow-md'
                    : 'text-gray-700 hover:bg-white/50'
                }`
              }
            >
              <Square size={18} className={({ isActive }) => isActive ? 'fill-gray-800 text-gray-800' : 'text-gray-500'} />
              <span className="flex-1">{link.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </motion.div>
  );
};

export default Sidebar;