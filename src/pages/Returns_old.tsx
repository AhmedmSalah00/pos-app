import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, AlertCircle, Check, Trash2, Plus } from 'react-feather';
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
        LIMIT 50
      `
        )
        .all() as ReturnRecord[];

      setReturnReasons(returns);
    } catch (err) {
      console.error('Error loading returns history:', err);
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

      setSuccess(`Return processed: -EGP ${refundAmount.toFixed(2)}`);
      setShowReturnModal(false);
      setSelectedItem(null);

      // Reload data
      loadReturnsHistory();
      searchInvoice();
    } catch (err) {
      setError('Failed to process return');
      console.error(err);
    }
  };

  const calculateRefund = () => {
    if (!selectedItem) return 0;
    return selectedItem.price * returnQuantity;
  };

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Returns & Refunds</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Manage product returns and refunds</p>
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

      {/* Search Box */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
          Search Invoice by Number
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchInvoice()}
            placeholder="Enter invoice number..."
            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={searchInvoice}
            disabled={loading}
            className="px-6 py-3 bg-blue-500 text-white font-semibold rounded-xl hover:bg-blue-600 disabled:bg-gray-400 transition-colors flex items-center gap-2"
          >
            <Search size={20} />
            Search
          </motion.button>
        </div>
      </motion.div>

      {/* Invoice Details */}
      <AnimatePresence>
        {invoice && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Invoice #</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{invoice.id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Customer</p>
                <p className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                  {invoice.customer_name || 'Walk-in'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Date</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">
                  {new Date(invoice.created_at).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Items List */}
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">Invoice Items</h3>
            <div className="space-y-3">
              {items.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 flex items-center justify-between"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 dark:text-gray-100">{item.product_name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Qty: {item.quantity} × EGP {item.price.toFixed(2)} = EGP{' '}
                      {(item.quantity * item.price).toFixed(2)}
                    </p>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => openReturnModal(item)}
                    className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                  >
                    <Plus size={18} />
                    Return
                  </motion.button>
                </motion.div>
              ))}
            </div>

            {/* Invoice Total */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-slate-600">
              <div className="flex justify-between items-center">
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-100">Invoice Total</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">EGP {invoice.total.toFixed(2)}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Returns History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg"
      >
        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4">Recent Returns</h2>
        {returnReasons.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400">No returns yet</p>
        ) : (
          <div className="space-y-3">
            {returnReasons.slice(0, 10).map((ret) => (
              <motion.div
                key={ret.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700/50 rounded-xl"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 dark:text-gray-100">
                    Invoice #{ret.invoice_id} - {ret.product_name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Qty: {ret.quantity} • Reason: {ret.reason}
                    {ret.is_damaged && ' • DAMAGED'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {new Date(ret.created_at).toLocaleDateString()}
                  </p>
                </div>
                {ret.is_damaged && (
                  <div className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold rounded-full">
                    Damaged
                  </div>
                )}
              </motion.div>
            ))}
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
              className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Process Return</h2>
                <motion.button
                  whileHover={{ rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowReturnModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full"
                >
                  <X size={24} className="text-gray-600 dark:text-gray-400" />
                </motion.button>
              </div>

              <div className="space-y-6">
                {/* Product Info */}
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Product</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-100 mt-1">
                    {selectedItem.product_name}
                  </p>
                </div>

                {/* Quantity */}
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">Return Quantity</label>
                  <input
                    type="number"
                    min="1"
                    max={selectedItem.quantity}
                    value={returnQuantity}
                    onChange={(e) => setReturnQuantity(Math.min(selectedItem.quantity, Math.max(1, parseInt(e.target.value) || 1)))}
                    className="w-full mt-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">Available: {selectedItem.quantity}</p>
                </div>

                {/* Reason */}
                <div>
                  <label className="text-sm text-gray-600 dark:text-gray-400">Return Reason</label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    className="w-full mt-2 px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100"
                  >
                    <option>Defective</option>
                    <option>Wrong Item</option>
                    <option>Changed Mind</option>
                    <option>Expired</option>
                    <option>Damaged in Shipping</option>
                    <option>Other</option>
                  </select>
                </div>

                {/* Damaged Checkbox */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isDamaged}
                    onChange={(e) => setIsDamaged(e.target.checked)}
                    className="w-5 h-5 rounded"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Mark as damaged (no restock)</span>
                </label>

                {/* Refund Amount */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Refund Amount</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
                    EGP {calculateRefund().toFixed(2)}
                  </p>
                </div>

                {/* Buttons */}
                <div className="space-y-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={processReturn}
                    className="w-full bg-gradient-to-r from-red-500 to-red-600 text-white font-bold py-3 rounded-2xl hover:shadow-lg transition-shadow"
                  >
                    Process Return
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowReturnModal(false)}
                    className="w-full bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-100 font-bold py-3 rounded-2xl hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
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
