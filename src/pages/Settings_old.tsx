import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  DollarSign,
  Printer,
  Image,
  Download,
  Trash2,
  Save,
  Check,
  AlertCircle,
} from 'react-feather';
import db from '../db/database';

interface Setting {
  key: string;
  value: string;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<{ [key: string]: string }>({});
  const [logo, setLogo] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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

      if (settingsMap.logo && settingsMap.logo.startsWith('data:image')) {
        setLogo(settingsMap.logo);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('Failed to load settings');
      setLoading(false);
    }
  };

  const handleInputChange = (key: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
    setHasChanges(true);
    setSuccess('');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 500KB)
      if (file.size > 500000) {
        setError('Logo file must be less than 500KB');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const base64Logo = reader.result as string;
        setLogo(base64Logo);
        handleInputChange('logo', base64Logo);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogo(null);
    handleInputChange('logo', '');
  };

  const saveSettings = () => {
    try {
      setLoading(true);

      Object.entries(settings).forEach(([key, value]) => {
        const exists = db.prepare('SELECT * FROM settings WHERE key = ?').get(key);

        if (exists) {
          db.prepare('UPDATE settings SET value = ? WHERE key = ?').run(value, key);
        } else {
          db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run(key, value);
        }
      });

      setSuccess('Settings saved successfully!');
      setHasChanges(false);
      setError('');

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const resetSettings = () => {
    loadSettings();
    setHasChanges(false);
  };

  if (loading && Object.keys(settings).length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <Globe size={40} className="text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Manage application preferences and configuration</p>
      </motion.div>

      {/* Messages */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3"
          >
            <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center gap-3"
          >
            <Check size={20} className="text-green-500 flex-shrink-0" />
            <span className="text-green-700 dark:text-green-300">{success}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ staggerChildren: 0.1, delayChildren: 0.1 }}
        className="space-y-6"
      >
        {/* Language Settings */}
        <motion.div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Globe size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Language</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose your preferred language
              </p>
            </div>
          </div>

          <select
            value={settings.language || 'en'}
            onChange={(e) => handleInputChange('language', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="en">English (EN)</option>
            <option value="ar">العربية (AR)</option>
          </select>
        </motion.div>

        {/* Currency Settings */}
        <motion.div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <DollarSign size={24} className="text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Currency</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Set default currency for transactions
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              value={settings.currency || 'EGP'}
              onChange={(e) => handleInputChange('currency', e.target.value)}
              className="px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g., EGP, USD, EUR"
            />
            <div className="flex items-center px-4 py-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50">
              <span className="text-gray-600 dark:text-gray-400">
                Current: <strong className="text-gray-900 dark:text-gray-100">{settings.currency || 'EGP'}</strong>
              </span>
            </div>
          </div>
        </motion.div>

        {/* Printer Settings */}
        <motion.div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Printer size={24} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Printer Type</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose your printer format
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['A4', 'thermal'].map((type) => (
              <motion.button
                key={type}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleInputChange('printer_type', type)}
                className={`px-4 py-3 rounded-xl font-semibold transition-all ${
                  settings.printer_type === type
                    ? 'bg-purple-500 text-white shadow-lg'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-600 hover:bg-gray-200'
                }`}
              >
                {type === 'A4' ? 'A4 Paper' : 'Thermal Receipt'}
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Logo Settings */}
        <motion.div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <Image size={24} className="text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Store Logo</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Upload your store logo (max 500KB)
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Upload Area */}
            <div>
              <label className="block">
                <div className="relative border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <Download size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Drop image here or click
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    PNG, JPG up to 500KB
                  </p>
                </div>
              </label>
            </div>

            {/* Logo Preview */}
            <div className="flex flex-col items-center justify-center">
              {logo ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4 w-full"
                >
                  <img
                    src={logo}
                    alt="Store Logo"
                    className="h-40 w-40 object-contain mx-auto rounded-xl shadow-lg"
                  />
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={removeLogo}
                    className="w-full px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    Remove Logo
                  </motion.button>
                </motion.div>
              ) : (
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <Image size={48} className="mx-auto mb-3 opacity-50" />
                  <p>No logo uploaded</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* App Type Settings */}
        <motion.div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Globe size={24} className="text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Business Type</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure for your business type
              </p>
            </div>
          </div>

          <select
            value={settings.app_type || 'supermarket'}
            onChange={(e) => handleInputChange('app_type', e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="supermarket">Supermarket</option>
            <option value="installment">Installment Sales</option>
            <option value="warehouse">Warehouse</option>
            <option value="retail">Retail Store</option>
          </select>
        </motion.div>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex gap-4 sticky bottom-6 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg"
      >
        {hasChanges && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-sm text-orange-600 dark:text-orange-400 font-semibold self-center flex-1"
          >
            You have unsaved changes
          </motion.p>
        )}

        <div className="flex gap-3 ml-auto">
          {hasChanges && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetSettings}
              className="px-6 py-3 bg-gray-300 dark:bg-slate-700 text-gray-800 dark:text-gray-100 font-bold rounded-xl hover:bg-gray-400 dark:hover:bg-slate-600 transition-colors"
            >
              Reset
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={saveSettings}
            disabled={!hasChanges || loading}
            className={`px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
              hasChanges && !loading
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:shadow-lg'
                : 'bg-gray-300 dark:bg-slate-700 text-gray-600 dark:text-gray-500 cursor-not-allowed'
            }`}
          >
            <Save size={20} />
            Save Settings
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};

export default Settings;
