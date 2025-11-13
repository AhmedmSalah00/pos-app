import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Trash2,
  X,
  Check,
  TrendingDown,
  Calendar,
  DollarSign,
  AlertCircle,
  Eye,
  EyeOff,
} from 'react-feather';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import db from '../db/database';

interface Expense {
  id: number;
  description: string;
  amount: number;
  created_at: string;
}

const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
  });
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  const expenseCategories = ['Rent', 'Utilities', 'Supplies', 'Transportation', 'Maintenance', 'Other'];
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    loadExpenses();
  }, []);

  const loadExpenses = () => {
    try {
      const allExpenses = db.prepare('SELECT * FROM expenses ORDER BY created_at DESC').all() as Expense[];
      setExpenses(allExpenses);
      setError('');
    } catch (err) {
      setError('Failed to load expenses');
    }
  };

  const handleSaveExpense = () => {
    if (!formData.description.trim() || !formData.amount) {
      setError('Please fill all fields with valid values');
      return;
    }

    try {
      const amount = parseFloat(formData.amount);
      if (amount <= 0) {
        setError('Amount must be greater than 0');
        return;
      }

      if (editingId) {
        db.prepare('UPDATE expenses SET description = ?, amount = ? WHERE id = ?').run(
          formData.description,
          amount,
          editingId
        );
      } else {
        db.prepare('INSERT INTO expenses (description, amount) VALUES (?, ?)').run(
          formData.description,
          amount
        );
      }

      loadExpenses();
      setFormData({ description: '', amount: '' });
      setShowModal(false);
      setEditingId(null);
      setError('');
    } catch (err) {
      setError('Error saving expense: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDeleteExpense = (id: number) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        db.prepare('DELETE FROM expenses WHERE id = ?').run(id);
        loadExpenses();
      } catch (err) {
        setError('Error deleting expense');
      }
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingId(expense.id);
    setFormData({
      description: expense.description,
      amount: expense.amount.toString(),
    });
    setShowModal(true);
  };

  const handleOpenModal = () => {
    setEditingId(null);
    setFormData({ description: '', amount: '' });
    setError('');
    setShowModal(true);
  };

  const getFilteredExpenses = () => {
    const now = new Date();
    let filtered = expenses;

    // Date filter
    filtered = filtered.filter(exp => {
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

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(exp =>
        exp.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const filteredExpenses = getFilteredExpenses();
  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const totalAllTime = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  const avgExpense = filteredExpenses.length > 0 ? totalExpenses / filteredExpenses.length : 0;

  // Chart data - daily expenses for current month
  const monthlyChartData = expenses
    .filter(exp => {
      const expDate = new Date(exp.created_at);
      const now = new Date();
      return expDate.getMonth() === now.getMonth() && expDate.getFullYear() === now.getFullYear();
    })
    .reduce(
      (acc, exp) => {
        const date = new Date(exp.created_at).toLocaleDateString();
        const existing = acc.find(item => item.date === date);
        if (existing) {
          existing.amount += exp.amount;
        } else {
          acc.push({ date, amount: exp.amount });
        }
        return acc;
      },
      [] as Array<{ date: string; amount: number }>
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Category distribution
  const categoryData = expenseCategories.map(cat => ({
    name: cat,
    value: filteredExpenses
      .filter(e => e.description.includes(cat))
      .reduce((sum, e) => sum + e.amount, 0),
  }));

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex justify-between items-start"
      >
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-400 bg-clip-text text-transparent dark:from-red-400 dark:to-red-300">
            Expenses
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Track and manage business expenses</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleOpenModal}
          className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          <Plus size={20} />
          Add Expense
        </motion.button>
      </motion.div>

      {/* Error Message */}
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

      {/* Stats Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        {/* Total Expenses (Filtered) */}
        <motion.div
          variants={itemVariants}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-slate-700 hover:shadow-xl transition-all"
        >
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total (Period)</p>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
            {totalExpenses.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-3 flex items-center gap-1">
            <TrendingDown size={14} />
            {filteredExpenses.length} expenses
          </p>
        </motion.div>

        {/* Total All Time */}
        <motion.div
          variants={itemVariants}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-slate-700 hover:shadow-xl transition-all"
        >
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total (All Time)</p>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
            {totalAllTime.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">
            {expenses.length} total expenses
          </p>
        </motion.div>

        {/* Average Expense */}
        <motion.div
          variants={itemVariants}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-slate-700 hover:shadow-xl transition-all"
        >
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Average</p>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
            {avgExpense.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">Per expense</p>
        </motion.div>

        {/* Highest Single Expense */}
        <motion.div
          variants={itemVariants}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-slate-700 hover:shadow-xl transition-all"
        >
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Highest</p>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
            {filteredExpenses.length > 0 ? Math.max(...filteredExpenses.map(e => e.amount)).toFixed(2) : '0.00'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">Single expense</p>
        </motion.div>
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Monthly Trend */}
        {monthlyChartData.length > 0 && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-slate-700"
          >
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Monthly Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={monthlyChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.1)" />
                <XAxis dataKey="date" stroke="rgba(128, 128, 128, 0.5)" />
                <YAxis stroke="rgba(128, 128, 128, 0.5)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    border: 'none',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ fill: '#ef4444' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        )}

        {/* Category Distribution */}
        {categoryData.some(c => c.value > 0) && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-slate-700"
          >
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Category Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData.filter(c => c.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) =>
                    value > 0 ? `${name}: ${value.toFixed(0)}` : ''
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => typeof value === 'number' ? value.toFixed(2) : value} />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        )}
      </div>

      {/* Filters */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-slate-700 mb-8"
      >
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Date Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Date Range
            </label>
            <div className="flex gap-2">
              {(['all', 'today', 'week', 'month'] as const).map(filter => (
                <motion.button
                  key={filter}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setDateFilter(filter)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    dateFilter === filter
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-slate-600'
                  }`}
                >
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search expenses..."
              className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>
      </motion.div>

      {/* Expenses Table */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden"
      >
        {filteredExpenses.length === 0 ? (
          <div className="p-12 text-center">
            <TrendingDown size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">No expenses found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Description
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Date
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                <AnimatePresence>
                  {filteredExpenses.map(expense => (
                    <motion.tr
                      key={expense.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold text-gray-800 dark:text-white">
                        {expense.description}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        <Calendar size={16} className="text-gray-400" />
                        {new Date(expense.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-red-600 dark:text-red-400">
                        -{expense.amount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center flex items-center justify-center gap-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleEditExpense(expense)}
                          className="p-2 bg-blue-100 dark:bg-blue-900/30 hover:bg-blue-200 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-lg transition-colors"
                        >
                          <DollarSign size={18} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="p-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-colors"
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
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-100 dark:border-slate-700"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                  {editingId ? 'Edit Expense' : 'Add New Expense'}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={() => setShowModal(false)}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  <X size={24} />
                </motion.button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 rounded-lg text-sm flex items-center gap-2"
                >
                  <AlertCircle size={16} />
                  {error}
                </motion.div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    placeholder="e.g., Rent, Utilities..."
                    className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Amount
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={e => setFormData({ ...formData, amount: e.target.value })}
                      placeholder="0.00"
                      className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 pr-12"
                    />
                    <span className="absolute right-3 top-2.5 text-gray-600 dark:text-gray-400 font-semibold">
                      EGP
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveExpense}
                  className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-2 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  <Check size={18} />
                  {editingId ? 'Update' : 'Save'}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowModal(false)}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-300 dark:bg-slate-600 hover:bg-gray-400 dark:hover:bg-slate-700 text-gray-800 dark:text-white py-2 rounded-lg font-semibold transition-all"
                >
                  <X size={18} />
                  Cancel
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Expenses;
