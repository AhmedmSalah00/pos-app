import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import db from '../db/database';
import { motion } from 'framer-motion';
import {
  Home,
  ShoppingCart,
  Package,
  Users,
  BarChart3,
  Settings,
  Tag,
  UserCheck,
  UserPlus,
  DollarSign,
  RotateCcw,
  FileText,
  LogOut,
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
    { to: '/', label: 'Dashboard', icon: <Home size={20} /> },
    { to: '/pos', label: 'POS', icon: <ShoppingCart size={20} /> },
    { to: '/products', label: 'Products', icon: <Package size={20} /> },
    { to: '/categories', label: 'Categories', icon: <Tag size={20} /> },
    { to: '/customers', label: 'Customers', icon: <Users size={20} /> },
    { to: '/suppliers', label: 'Suppliers', icon: <UserPlus size={20} /> },
    { to: '/returns', label: 'Returns', icon: <RotateCcw size={20} /> },
    { to: '/expenses', label: 'Expenses', icon: <DollarSign size={20} /> },
    { to: '/reports', label: 'Reports', icon: <BarChart3 size={20} />, adminOnly: true },
    { to: '/users', label: 'Users', icon: <UserCheck size={20} />, adminOnly: true },
    { to: '/settings', label: 'Settings', icon: <Settings size={20} /> },
  ];

  if (appType === 'installment' && hasInstallments) {
    navLinks.splice(2, 0, { to: '/installments', label: 'Installments', icon: <FileText size={20} /> });
  }

  // Removed linkVariants as per design analysis

  const { logout } = useAuth();

  return (
    <motion.div 
      className="w-64 h-screen bg-white shadow-lg flex flex-col"
      initial={{ x: -100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">POS</span>
          </div>
          <div>
            <h2 className="font-bold text-gray-900">POS System</h2>
            <p className="text-xs text-gray-500">Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navLinks.map((link: any) => {
          if (link.adminOnly && user?.role !== 'admin') return null;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              {link.icon}
              <span className="font-medium">{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
              <span className="text-gray-600 font-semibold text-sm">{user?.username?.charAt(0).toUpperCase()}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{user?.username}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
            title="Logout"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default Sidebar;