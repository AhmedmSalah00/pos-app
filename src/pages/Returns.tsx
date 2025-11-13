import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  AlertCircle,
  Check,
  Trash2,
  Plus,
  TrendingDown,
  Calendar,
  RotateCcw,
  Package,
  DollarSign,
  Eye,
  EyeOff,
} from 'react-feather';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import db from '../db/database';

interface InvoiceItem {
  id: number;
  invoice_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  discount: number;
  tax: number;
}

interface Invoice {
  id: number;
  customer_id: number | null;
  customer_name: string | null;
  created_at: string;
  total: number;
}

interface ReturnItem {
  itemId: number;
  quantity: number;
  reason: string;
  isDamaged: boolean;
}

interface ReturnRecord {
  id: number;
  invoice_id: number;
  product_name: string;
  quantity: number;
  reason: string;
  is_damaged: boolean;
  created_at: string;
}

const Returns: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [returnReasons, setReturnReasons] = useState<ReturnRecord[]>([]);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InvoiceItem | null>(null);
  const [returnQuantity, setReturnQuantity] = useState(1);
  const [returnReason, setReturnReason] = useState('');
  const [isDamaged, setIsDamaged] = useState(false);

  const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
  const returnReasons_list = ['Defective', 'Wrong Item', 'Changed Mind', 'Expired', 'Damaged in Shipping', 'Other'];

  // Load all returns history on mount
  useEffect(() => {
    loadReturnsHistory();
  }, []);

  const loadReturnsHistory = () => {
    try {
      const returns = db
        .prepare(
          `
        SELECT 
          r.id,
          r.invoice_id,
          p.name as product_name,
          r.quantity,
          r.reason,
          r.is_damaged,
          r.created_at
        FROM returns r
        JOIN products p ON r.product_id = p.id
        ORDER BY r.created_at DESC
        LIMIT 100
      `
        )
        .all() as ReturnRecord[];

      setReturnReasons(returns);
      setError('');
    } catch (err) {
      console.error('Error loading returns history:', err);
      setError('Failed to load returns history');
    }
  };

  const searchInvoice = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter an invoice number');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');

      const foundInvoice = db
        .prepare(
          `
        SELECT 
          i.id,
          i.customer_id,
          c.name as customer_name,
          i.created_at,
          i.total
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE i.id = ?
      `
        )
        .get(searchQuery) as Invoice | undefined;

      if (!foundInvoice) {
        setError('Invoice not found');
        setInvoice(null);
        setItems([]);
        return;
      }

      const foundItems = db
        .prepare(
          `
        SELECT 
          ii.id,
          ii.invoice_id,
          ii.product_id,
          p.name as product_name,
          ii.quantity,
          ii.price,
          ii.discount,
          ii.tax
        FROM invoice_items ii
        JOIN products p ON ii.product_id = p.id
        WHERE ii.invoice_id = ?
      `
        )
        .all(searchQuery) as InvoiceItem[];

      setInvoice(foundInvoice);
      setItems(foundItems);
      setReturnItems([]);
      setSuccess(`Found invoice #${foundInvoice.id}`);
    } catch (err) {
      setError('Failed to search invoice');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openReturnModal = (item: InvoiceItem) => {
    setSelectedItem(item);
    setReturnQuantity(1);
    setReturnReason('Defective');
    setIsDamaged(false);
    setShowReturnModal(true);
  };

  const processReturn = () => {
    if (!selectedItem || !invoice) return;

    try {
      const refundAmount = selectedItem.price * returnQuantity;

      // Insert return record
      db.prepare(
        `
        INSERT INTO returns (invoice_id, product_id, quantity, reason, is_damaged, created_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `
      ).run(invoice.id, selectedItem.product_id, returnQuantity, returnReason, isDamaged ? 1 : 0);

      // Update stock if not damaged
      if (!isDamaged) {
        db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(
          returnQuantity,
          selectedItem.product_id
        );
      }

      setSuccess(`Return processed! Refund: EGP ${refundAmount.toFixed(2)}`);
      setShowReturnModal(false);
      setSelectedItem(null);

      // Reload data
      setTimeout(() => {
        loadReturnsHistory();
        searchInvoice();
      }, 500);
    } catch (err) {
      setError('Failed to process return');
      console.error(err);
    }
  };

  const calculateRefund = () => {
    if (!selectedItem) return 0;
    return selectedItem.price * returnQuantity;
  };

  const handleDeleteReturn = (id: number) => {
    if (window.confirm('Delete this return record?')) {
      try {
        db.prepare('DELETE FROM returns WHERE id = ?').run(id);
        loadReturnsHistory();
        setSuccess('Return record deleted');
        setTimeout(() => setSuccess(''), 3000);
      } catch (err) {
        setError('Failed to delete return record');
      }
    }
  };

  // Calculate stats
  const totalReturns = returnReasons.length;
  const totalRefunded = returnReasons.reduce((sum, r) => sum + (r.quantity * (items.find(i => i.product_name === r.product_name)?.price || 0)), 0);
  const damagedCount = returnReasons.filter(r => r.is_damaged).length;

  // Reason distribution
  const reasonData = returnReasons_list.map(reason => ({
    name: reason,
    count: returnReasons.filter(r => r.reason === reason).length,
  }));

  // Returns by day (last 7 days)
  const dailyReturns = returnReasons
    .filter(r => {
      const date = new Date(r.created_at);
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      return date >= sevenDaysAgo;
    })
    .reduce(
      (acc, r) => {
        const date = new Date(r.created_at).toLocaleDateString();
        const existing = acc.find(item => item.date === date);
        if (existing) {
          existing.count += 1;
        } else {
          acc.push({ date, count: 1 });
        }
        return acc;
      },
      [] as Array<{ date: string; count: number }>
    )
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-red-600 to-red-400 bg-clip-text text-transparent dark:from-red-400 dark:to-red-300">
          Returns & Refunds
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Manage product returns and process refunds</p>
      </motion.div>

      {/* Messages */}
      <AnimatePresence>
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
      </AnimatePresence>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        <motion.div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-slate-700">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Returns</p>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{totalReturns}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-3 flex items-center gap-1">
            <RotateCcw size={14} />
            This month
          </p>
        </motion.div>

        <motion.div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-slate-700">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Refunded</p>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">
            {totalRefunded.toFixed(2)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">EGP</p>
        </motion.div>

        <motion.div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-slate-700">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Damaged Items</p>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">{damagedCount}</p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">Not restocked</p>
        </motion.div>

        <motion.div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-slate-700">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Avg per Return</p>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
            {totalReturns > 0 ? (totalRefunded / totalReturns).toFixed(2) : '0.00'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500 mt-3">EGP</p>
        </motion.div>
      </motion.div>

      {/* Search Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-slate-700 mb-8"
      >
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Search Invoice</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchInvoice()}
            placeholder="Enter invoice number..."
            className="flex-1 px-4 py-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={searchInvoice}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Search size={18} />
            Search
          </motion.button>
        </div>
      </motion.div>

      {/* Charts */}
      {returnReasons.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {dailyReturns.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-slate-700"
            >
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Returns Trend (7 Days)</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={dailyReturns}>
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
                  <Bar dataKey="count" fill="#ef4444" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {reasonData.some(r => r.count > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-slate-700"
            >
              <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Returns by Reason</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={reasonData.filter(r => r.count > 0)}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, count }) => (count > 0 ? `${name}: ${count}` : '')}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {reasonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </div>
      )}

      {/* Invoice Details */}
      <AnimatePresence>
        {invoice && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-slate-700 mb-8"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Invoice #</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{invoice.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Customer</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-white mt-1">
                  {invoice.customer_name || 'Walk-in'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Date</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-white mt-1">
                  {new Date(invoice.created_at).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Total</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  EGP {invoice.total.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Items List */}
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Invoice Items</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-slate-600 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                      <Package size={16} className="text-blue-500" />
                      {item.product_name}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Qty: {item.quantity} × EGP {item.price.toFixed(2)} = EGP {(item.quantity * item.price).toFixed(2)}
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openReturnModal(item)}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-all flex items-center gap-2"
                  >
                    <RotateCcw size={16} />
                    Return
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Returns History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <TrendingDown size={24} className="text-red-500" />
            Recent Returns
          </h2>
        </div>

        {returnReasons.length === 0 ? (
          <div className="p-12 text-center">
            <RotateCcw size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-lg">No returns yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-700 border-b border-gray-200 dark:border-slate-600">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Invoice
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Product
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Qty
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Reason
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Date
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-600">
                <AnimatePresence>
                  {returnReasons.slice(0, 20).map((ret) => (
                    <motion.tr
                      key={ret.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold text-gray-800 dark:text-white">
                        #{ret.invoice_id}
                      </td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300">{ret.product_name}</td>
                      <td className="px-6 py-4 font-semibold text-gray-800 dark:text-white">{ret.quantity}</td>
                      <td className="px-6 py-4 text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        {ret.reason}
                        {ret.is_damaged && (
                          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-semibold rounded-full">
                            Damaged
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400 text-sm flex items-center gap-2">
                        <Calendar size={14} />
                        {new Date(ret.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleDeleteReturn(ret.id)}
                          className="p-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
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

      {/* Return Modal */}
      <AnimatePresence>
        {showReturnModal && selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowReturnModal(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-xl p-8 w-full max-w-md shadow-2xl border border-gray-100 dark:border-slate-700"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Process Return</h2>
                <motion.button
                  whileHover={{ rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowReturnModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                >
                  <X size={24} className="text-gray-600 dark:text-gray-400" />
                </motion.button>
              </div>

              <div className="space-y-6">
                {/* Product Info */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Product</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-white mt-2">
                    {selectedItem.product_name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Price: EGP {selectedItem.price.toFixed(2)}
                  </p>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Return Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedItem.quantity}
                    value={returnQuantity}
                    onChange={(e) => setReturnQuantity(Math.min(selectedItem.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    Available: {selectedItem.quantity} units
                  </p>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Return Reason
                  </label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    {returnReasons_list.map(reason => (
                      <option key={reason} value={reason}>{reason}</option>
                    ))}
                  </select>
                </div>

                {/* Damaged Checkbox */}
                <label className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800 cursor-pointer hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={isDamaged}
                    onChange={(e) => setIsDamaged(e.target.checked)}
                    className="w-5 h-5 text-red-500 rounded cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Mark as damaged (won't be restocked)
                  </span>
                </label>

                {/* Refund Amount */}
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Refund Amount</p>
                  <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                    EGP {calculateRefund().toFixed(2)}
                  </p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={processReturn}
                    className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={18} />
                    Process Return
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowReturnModal(false)}
                    className="flex-1 bg-gray-300 dark:bg-slate-600 hover:bg-gray-400 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-bold py-3 rounded-lg transition-all"
                  >
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

export default Returns;
