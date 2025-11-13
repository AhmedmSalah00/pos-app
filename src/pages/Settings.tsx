import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Globe,
  DollarSign,
  Printer,
  Save,
  Check,
  AlertCircle,
  Settings as SettingsIcon,
  Zap,
} from 'react-feather';
import db from '../db/database';

interface Setting {
  key: string;
  value: string;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<{ [key: string]: string }>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      const allSettings = db.prepare('SELECT * FROM settings').all() as Setting[];
      const settingsMap: { [key: string]: string } = {};

      allSettings.forEach((setting) => {
        settingsMap[setting.key] = setting.value;
      });

      setSettings(settingsMap);
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings');
    }
  };

  const handleSettingChange = (key: string, value: string) => {
    setSettings({ ...settings, [key]: value });
    setHasChanges(true);
    setSuccess('');
  };

  const handleSaveSettings = () => {
    try {
      Object.entries(settings).forEach(([key, value]) => {
        db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(value, key);
      });

      setHasChanges(false);
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Error saving settings: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleResetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to defaults?')) {
      loadSettings();
      setHasChanges(false);
    }
  };

  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent dark:from-indigo-400 dark:to-indigo-300">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Configure your application preferences</p>
      </motion.div>

      {/* Notifications */}
      {success && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6 p-4 bg-green-100 dark:bg-green-900/20 border border-green-300 dark:border-green-800 text-green-700 dark:text-green-400 rounded-lg flex items-center gap-2"
        >
          <Check size={20} />
          {success}
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6 p-4 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg flex items-center gap-2"
        >
          <AlertCircle size={20} />
          {error}
        </motion.div>
      )}

      {/* Settings Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Business Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 border border-gray-100 dark:border-slate-700"
        >
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
            <SettingsIcon size={24} className="text-indigo-500" />
            Business Settings
          </h2>

          <div className="space-y-6">
            {/* App Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                App Type
              </label>
              <select
                value={settings.app_type || 'supermarket'}
                onChange={e => handleSettingChange('app_type', e.target.value)}
                className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="supermarket">Supermarket</option>
                <option value="restaurant">Restaurant</option>
                <option value="pharmacy">Pharmacy</option>
                <option value="general">General Store</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Choose the type of business to customize features
              </p>
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <Globe size={18} />
                Default Language
              </label>
              <select
                value={settings.language || 'en'}
                onChange={e => handleSettingChange('language', e.target.value)}
                className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="en">English</option>
                <option value="ar">Arabic</option>
              </select>
            </div>

            {/* Currency */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                <DollarSign size={18} />
                Currency
              </label>
              <input
                type="text"
                value={settings.currency || 'EGP'}
                onChange={e => handleSettingChange('currency', e.target.value)}
                className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g., EGP, USD, EUR"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Currency symbol or code to display in the app
              </p>
            </div>
          </div>
        </motion.div>

        {/* Printer & Export Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 border border-gray-100 dark:border-slate-700"
        >
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
            <Printer size={24} className="text-indigo-500" />
            Printer Settings
          </h2>

          <div className="space-y-6">
            {/* Printer Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Printer Type
              </label>
              <select
                value={settings.printer_type || 'A4'}
                onChange={e => handleSettingChange('printer_type', e.target.value)}
                className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="A4">A4 Paper</option>
                <option value="thermal">Thermal (58mm)</option>
                <option value="thermal80">Thermal (80mm)</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Select your printer type for receipt formatting
              </p>
            </div>

            {/* Auto Print */}
            <div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.auto_print === 'true'}
                  onChange={e => handleSettingChange('auto_print', e.target.checked ? 'true' : 'false')}
                  className="w-5 h-5 text-indigo-500 rounded cursor-pointer"
                />
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Auto-print receipts after checkout
                </span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 ml-8">
                Automatically print receipt when transaction completes
              </p>
            </div>
          </div>
        </motion.div>

        {/* Advanced Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 border border-gray-100 dark:border-slate-700 lg:col-span-2"
        >
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
            <Zap size={24} className="text-indigo-500" />
            Advanced Settings
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Backup Frequency */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Backup Frequency
              </label>
              <select
                value={settings.backup_frequency || 'daily'}
                onChange={e => handleSettingChange('backup_frequency', e.target.value)}
                className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {/* Session Timeout */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                value={settings.session_timeout || '60'}
                onChange={e => handleSettingChange('session_timeout', e.target.value)}
                min="5"
                max="480"
                className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Low Stock Alert */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Low Stock Alert Threshold
              </label>
              <input
                type="number"
                value={settings.low_stock_threshold || '10'}
                onChange={e => handleSettingChange('low_stock_threshold', e.target.value)}
                min="1"
                className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Number of items to trigger low stock warning
              </p>
            </div>

            {/* Tax Rate */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Default Tax Rate (%)
              </label>
              <input
                type="number"
                value={settings.tax_rate || '0'}
                onChange={e => handleSettingChange('tax_rate', e.target.value)}
                min="0"
                max="100"
                step="0.1"
                className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-8 flex gap-4 justify-end"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleResetSettings}
          disabled={!hasChanges}
          className="px-6 py-3 bg-gray-300 hover:bg-gray-400 dark:bg-slate-600 dark:hover:bg-slate-700 text-gray-800 dark:text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Reset
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSaveSettings}
          disabled={!hasChanges}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={18} />
          Save Settings
        </motion.button>
      </motion.div>
    </div>
  );
};

export default Settings;
