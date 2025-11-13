import React, { useState, useEffect } from 'react';
import db from '../db/database';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, X, Check, Calendar, DollarSign } from 'react-feather';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface Expense {
  id: number;
  description: string;
  amount: number;
  created_at: string;
}

const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    amount: 0,
  });
  const [dateFilter, setDateFilter] = useState('all'); // all, today, week, month

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = () => {
    const allExpenses = db.prepare('SELECT * FROM expenses ORDER BY created_at DESC').all() as Expense[];
    setExpenses(allExpenses);
  };

  const handleSaveExpense = () => {
    if (!formData.description || formData.amount <= 0) {
      alert('Please fill all fields with valid values');
      return;
    }

    try {
      db.prepare(`
        INSERT INTO expenses (description, amount)
        VALUES (?, ?)
      `).run(formData.description, formData.amount);
      
      loadExpenses();
      setFormData({ description: '', amount: 0 });
      setShowModal(false);
    } catch (error) {
      alert('Error saving expense: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleDeleteExpense = (id: number) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
        loadExpenses();
      } catch (error) {
        alert('Error deleting expense');
      }
    }
  };

  const getFilteredExpenses = () => {
    const now = new Date();
    return expenses.filter(exp => {
      const expDate = new Date(exp.created_at);
      
      switch (dateFilter) {
        case 'today':
          return expDate.toDateString() === now.toDateString();
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return expDate >= weekAgo;
        case 'month':
          return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
        default:
          return true;
      }
    });
  };

  const filteredExpenses = getFilteredExpenses();
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);

  // Prepare chart data (daily expenses for the current month)
  const chartData = expenses
    .filter(exp => {
      const expDate = new Date(exp.created_at);
      const now = new Date();
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    })
    .reduce((acc, exp) => {
      const date = new Date(exp.created_at).toLocaleDateString();
      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.amount += exp.amount;
      } else {
        acc.push({ date, amount: exp.amount });
      }
      return acc;
    }, [] as Array<{ date: string; amount: number }>)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-100 dark:from-gray-800 dark:to-blue-900 p-6 rounded-xl">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-6"
      >
        <div>
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
            <DollarSign size={40} className="text-red-500" />
            Expenses
          </h1>
          <p className="text-gray-600 dark:text-gray-300">Track your business expenses</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-blue-500/70 hover:bg-blue-600/70 text-white px-4 py-2 rounded-lg font-semibold shadow-neumorphic-light dark:shadow-neumorphic-dark"
        >
          <Plus size={20} />
          Add Expense
        </motion.button>
      </motion.div>

      {/* Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6"
      >
        <div className="bg-red-500/20 dark:bg-red-900/20 backdrop-blur-md p-4 rounded-lg shadow-neumorphic-light dark:shadow-neumorphic-dark border border-red-300 dark:border-red-700">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Total Expenses (Filtered)</p>
          <p className="text-3xl font-bold text-red-600">{totalExpenses.toFixed(2)} EGP</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{filteredExpenses.length} expenses</p>
        </div>
        <div className="bg-orange-500/20 dark:bg-orange-900/20 backdrop-blur-md p-4 rounded-lg shadow-neumorphic-light dark:shadow-neumorphic-dark border border-orange-300 dark:border-orange-700">
          <p className="text-gray-600 dark:text-gray-400 text-sm">All Time Expenses</p>
          <p className="text-3xl font-bold text-orange-600">{expenses.reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)} EGP</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{expenses.length} total expenses</p>
        </div>
      </motion.div>

      {/* Filter Buttons */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-2 mb-6"
      >
        {['all', 'today', 'week', 'month'].map(filter => (
          <motion.button
            key={filter}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setDateFilter(filter)}
            className={`px-4 py-2 rounded-lg font-semibold transition-all ${
              dateFilter === filter
                ? 'bg-blue-500/70 text-white'
                : 'bg-white/30 dark:bg-black/30 text-gray-800 dark:text-white hover:bg-blue-500/50'
            }`}
          >
            {filter.charAt(0).toUpperCase() + filter.slice(1)}
          </motion.button>
        ))}
      </motion.div>

      {/* Chart */}
      {chartData.length > 0 && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white/30 dark:bg-black/30 backdrop-blur-md p-4 rounded-lg shadow-neumorphic-light dark:shadow-neumorphic-dark mb-6"
        >
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4">Monthly Expenses Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
              <XAxis dataKey="date" stroke="rgba(128, 128, 128, 0.5)" />
              <YAxis stroke="rgba(128, 128, 128, 0.5)" />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
              />
              <Bar dataKey="amount" fill="#ff6b6b" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Expenses List */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white/30 dark:bg-black/30 backdrop-blur-md rounded-lg shadow-neumorphic-light dark:shadow-neumorphic-dark overflow-hidden"
      >
        {filteredExpenses.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">No expenses found for this period</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/50 dark:bg-black/50 border-b border-gray-300 dark:border-gray-600">
                <tr>
                  <th className="px-6 py-4 text-left text-gray-800 dark:text-white font-semibold">Description</th>
                  <th className="px-6 py-4 text-left text-gray-800 dark:text-white font-semibold">Date</th>
                  <th className="px-6 py-4 text-right text-gray-800 dark:text-white font-semibold">Amount</th>
                  <th className="px-6 py-4 text-center text-gray-800 dark:text-white font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-300 dark:divide-gray-600">
                <AnimatePresence>
                  {filteredExpenses.map((expense) => (
                    <motion.tr
                      key={expense.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-white/40 dark:hover:bg-black/40 transition-colors"
                    >
                      <td className="px-6 py-4 text-gray-800 dark:text-white font-semibold">{expense.description}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <Calendar size={16} />
                        {new Date(expense.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right text-red-600 font-bold">
                        -{expense.amount.toFixed(2)} EGP
                      </td>
                      <td className="px-6 py-4 text-center">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="p-2 bg-red-500/70 hover:bg-red-600/70 text-white rounded-lg"
                        >
                          <Trash2 size={18} />
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 w-96 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Add New Expense</h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={() => setShowModal(false)}
                  className="text-gray-600 dark:text-gray-400"
                >
                  <X size={24} />
                </motion.button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Description *</label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Rent, Utilities, etc."
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Amount *</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                      placeholder="0.00"
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                    />
                    <span className="absolute right-3 top-2.5 text-gray-600 dark:text-gray-400 font-semibold">EGP</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveExpense}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-500/70 hover:bg-green-600/70 text-white py-2 rounded-lg font-semibold"
                  >
                    <Check size={20} />
                    Save
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowModal(false)}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-500/70 hover:bg-gray-600/70 text-white py-2 rounded-lg font-semibold"
                  >
                    <X size={20} />
                    Cancel
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Expenses;
