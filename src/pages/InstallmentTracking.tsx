import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  ChevronUp,
  Check,
  Clock,
  AlertCircle,
  Plus,
  X,
  TrendingUp,
  Calendar,
  Phone,
  DollarSign,
  Activity,
  Eye,
  EyeOff,
} from 'react-feather';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import db from '../db/database';

interface InstallmentPayment {
  id: number;
  invoice_id: number;
  due_date: string;
  amount: number;
  paid_at: string | null;
  status: 'due' | 'paid' | 'overdue';
}

interface Invoice {
  id: number;
  customer_id: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  created_at: string;
  total: number;
  down_payment: number | null;
  installment_percentage: number | null;
}

interface InvoiceWithPayments extends Invoice {
  payments: InstallmentPayment[];
}

const InstallmentTracking: React.FC = () => {
  const [invoices, setInvoices] = useState<InvoiceWithPayments[]>([]);
  const [expandedInvoice, setExpandedInvoice] = useState<number | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<InstallmentPayment | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'due' | 'paid' | 'overdue'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b'];

  // Load installments
  useEffect(() => {
    loadInstallments();
    // Auto-update status based on due dates
    updatePaymentStatuses();
  }, []);

  const loadInstallments = () => {
    try {
      setLoading(true);
      // Get all invoices with installments
      const invoicesData = db
        .prepare(
          `
        SELECT 
          i.id, 
          i.customer_id, 
          c.name as customer_name,
          c.phone as customer_phone,
          i.created_at, 
          i.total,
          i.down_payment,
          i.installment_percentage
        FROM invoices i
        LEFT JOIN customers c ON i.customer_id = c.id
        WHERE i.installment_percentage > 0
        ORDER BY i.created_at DESC
      `
        )
        .all() as Array<{
        id: number;
        customer_id: number | null;
        customer_name: string | null;
        customer_phone: string | null;
        created_at: string;
        total: number;
        down_payment: number | null;
        installment_percentage: number | null;
      }>;

      // Get payments for each invoice
      const invoicesWithPayments: InvoiceWithPayments[] = invoicesData.map((inv) => {
        const payments = db
          .prepare('SELECT * FROM installment_payments WHERE invoice_id = ? ORDER BY due_date ASC')
          .all(inv.id) as InstallmentPayment[];

        return {
          ...inv,
          payments,
        };
      });

      setInvoices(invoicesWithPayments);
      setError('');
    } catch (err) {
      setError('Failed to load installments');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatuses = () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Update due -> overdue
      db.prepare(
        `
        UPDATE installment_payments 
        SET status = 'overdue' 
        WHERE status = 'due' AND due_date < ? AND paid_at IS NULL
      `
      ).run(today);

      loadInstallments();
    } catch (err) {
      console.error('Error updating payment statuses:', err);
    }
  };

  const markPaymentAsPaid = () => {
    if (!selectedPayment) return;

    try {
      const today = new Date().toISOString().split('T')[0];

      db.prepare('UPDATE installment_payments SET status = ?, paid_at = ? WHERE id = ?').run(
        'paid',
        today,
        selectedPayment.id
      );

      setError('');
      loadInstallments();
      setShowPaymentModal(false);
      setSelectedPayment(null);
    } catch (err) {
      setError('Failed to record payment');
      console.error(err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 dark:text-green-400';
      case 'due':
        return 'text-blue-600 dark:text-blue-400';
      case 'overdue':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <Check size={18} />;
      case 'overdue':
        return <AlertCircle size={18} />;
      case 'due':
        return <Clock size={18} />;
      default:
        return null;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800';
      case 'due':
        return 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800';
      case 'overdue':
        return 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800';
      default:
        return 'bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const calculateStats = () => {
    let totalDue = 0;
    let totalPaid = 0;
    let totalOverdue = 0;
    let dueCount = 0;
    let paidCount = 0;
    let overdueCount = 0;

    invoices.forEach((invoice) => {
      invoice.payments.forEach((payment) => {
        if (payment.status === 'due') {
          totalDue += payment.amount;
          dueCount++;
        } else if (payment.status === 'paid') {
          totalPaid += payment.amount;
          paidCount++;
        } else if (payment.status === 'overdue') {
          totalOverdue += payment.amount;
          overdueCount++;
        }
      });
    });

    return { totalDue, totalPaid, totalOverdue, dueCount, paidCount, overdueCount };
  };

  const stats = calculateStats();

  const filteredInvoices = invoices
    .filter(inv =>
      searchQuery === '' ||
      inv.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.id.toString().includes(searchQuery) ||
      inv.customer_phone?.includes(searchQuery)
    )
    .map((inv) => ({
      ...inv,
      payments: inv.payments.filter((p) => filterStatus === 'all' || p.status === filterStatus),
    }));

  // Chart data - payment status distribution
  const statusData = [
    { name: 'Paid', value: stats.paidCount },
    { name: 'Due', value: stats.dueCount },
    { name: 'Overdue', value: stats.overdueCount },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity }}>
          <Clock size={48} className="text-indigo-500" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-400 bg-clip-text text-transparent dark:from-indigo-400 dark:to-indigo-300">
          Installment Tracking
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Manage and track all payment schedules</p>
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

      {/* Statistics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
      >
        {/* Due Payments */}
        <motion.div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-slate-700 hover:shadow-xl transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Due Payments</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{stats.dueCount}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                EGP {stats.totalDue.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Clock size={24} className="text-blue-600 dark:text-blue-400" />
            </div>
          </div>
        </motion.div>

        {/* Overdue Payments */}
        <motion.div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-slate-700 hover:shadow-xl transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Overdue</p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{stats.overdueCount}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                EGP {stats.totalOverdue.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertCircle size={24} className="text-red-600 dark:text-red-400" />
            </div>
          </div>
        </motion.div>

        {/* Paid Payments */}
        <motion.div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-slate-700 hover:shadow-xl transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Paid</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{stats.paidCount}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                EGP {stats.totalPaid.toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Check size={24} className="text-green-600 dark:text-green-400" />
            </div>
          </div>
        </motion.div>

        {/* Total */}
        <motion.div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-slate-700 hover:shadow-xl transition-all">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Value</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">
                {(stats.dueCount + stats.paidCount + stats.overdueCount)}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                EGP {(stats.totalDue + stats.totalPaid + stats.totalOverdue).toFixed(2)}
              </p>
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <TrendingUp size={24} className="text-purple-600 dark:text-purple-400" />
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Charts */}
      {invoices.length > 0 && statusData.some(s => s.value > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-slate-700 mb-8"
        >
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Activity size={20} />
            Payment Status Overview
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={statusData.filter(s => s.value > 0)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => (value > 0 ? `${name}: ${value}` : '')}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Search and Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-slate-700 mb-8"
      >
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Search (Name, Invoice #, Phone)
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Payment Status
            </label>
            <div className="flex gap-2">
              {(['all', 'due', 'paid', 'overdue'] as const).map((status) => (
                <motion.button
                  key={status}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
                    filterStatus === status
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-slate-600'
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Invoices List */}
      {filteredInvoices.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-12 text-center border border-gray-100 dark:border-slate-700"
        >
          <Clock size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            No installment {filterStatus !== 'all' ? filterStatus : 'payments'} found
          </p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence>
            {filteredInvoices.map((invoice, index) => (
              <motion.div
                key={invoice.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700 overflow-hidden shadow-lg hover:shadow-xl transition-all"
              >
                {/* Invoice Header */}
                <motion.button
                  onClick={() =>
                    setExpandedInvoice(expandedInvoice === invoice.id ? null : invoice.id)
                  }
                  className="w-full p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 text-left">
                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                      <DollarSign size={20} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        Invoice #{invoice.id}
                        {invoice.payments.some(p => p.status === 'overdue') && (
                          <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold rounded-full">
                            OVERDUE
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {invoice.customer_name || 'Walk-in'} • {new Date(invoice.created_at).toLocaleDateString()}
                      </p>
                      {invoice.customer_phone && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 flex items-center gap-1">
                          <Phone size={12} />
                          {invoice.customer_phone}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                        EGP {invoice.total.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {invoice.payments.length} installments
                      </p>
                    </div>
                  </div>
                  <motion.div
                    animate={{ rotate: expandedInvoice === invoice.id ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="ml-4"
                  >
                    {expandedInvoice === invoice.id ? (
                      <ChevronUp size={24} className="text-gray-600 dark:text-gray-400" />
                    ) : (
                      <ChevronDown size={24} className="text-gray-600 dark:text-gray-400" />
                    )}
                  </motion.div>
                </motion.button>

                {/* Expanded Payment Details */}
                <AnimatePresence>
                  {expandedInvoice === invoice.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t border-gray-200 dark:border-slate-700"
                    >
                      <div className="p-6 space-y-6">
                        {/* Invoice Summary */}
                        <div className="grid grid-cols-3 gap-4 pb-6 border-b border-gray-200 dark:border-slate-700">
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Total</p>
                            <p className="text-lg font-bold text-gray-800 dark:text-white mt-2">
                              EGP {invoice.total.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Down Payment</p>
                            <p className="text-lg font-bold text-gray-800 dark:text-white mt-2">
                              EGP {(invoice.down_payment || 0).toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">Installment %</p>
                            <p className="text-lg font-bold text-gray-800 dark:text-white mt-2">
                              {(invoice.installment_percentage || 0).toFixed(1)}%
                            </p>
                          </div>
                        </div>

                        {/* Payment Schedule */}
                        <div className="space-y-3">
                          <h4 className="font-bold text-gray-800 dark:text-white">Payment Schedule</h4>
                          {invoice.payments.map((payment) => (
                            <motion.div
                              key={payment.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className={`${getStatusBg(payment.status)} rounded-lg p-4 flex items-center justify-between`}
                            >
                              <div className="flex items-center gap-4 flex-1">
                                <div className={`p-2 rounded-full ${getStatusColor(payment.status)}`}>
                                  {getStatusIcon(payment.status)}
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-800 dark:text-white">
                                    EGP {payment.amount.toFixed(2)}
                                  </p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 flex items-center gap-1">
                                    <Calendar size={14} />
                                    Due: {new Date(payment.due_date).toLocaleDateString()}
                                    {payment.paid_at &&
                                      ` • Paid: ${new Date(payment.paid_at).toLocaleDateString()}`}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span
                                  className={`${getStatusColor(payment.status)} text-xs font-bold px-3 py-1 rounded-full capitalize`}
                                >
                                  {payment.status}
                                </span>
                                {payment.status !== 'paid' && (
                                  <motion.button
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    onClick={() => {
                                      setSelectedPayment(payment);
                                      setShowPaymentModal(true);
                                    }}
                                    className="p-2 bg-indigo-100 dark:bg-indigo-900/30 hover:bg-indigo-200 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg transition-colors"
                                    title="Record payment"
                                  >
                                    <Check size={16} />
                                  </motion.button>
                                )}
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Payment Modal */}
      <AnimatePresence>
        {showPaymentModal && selectedPayment && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowPaymentModal(false);
              setSelectedPayment(null);
            }}
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
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Record Payment</h2>
                <motion.button
                  whileHover={{ rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedPayment(null);
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                >
                  <X size={24} className="text-gray-600 dark:text-gray-400" />
                </motion.button>
              </div>

              <div className="space-y-6">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-800">
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Payment Amount</p>
                  <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">
                    EGP {selectedPayment.amount.toFixed(2)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Due Date</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-white mt-2 flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" />
                    {new Date(selectedPayment.due_date).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">Current Status</p>
                  <p className={`text-lg font-bold mt-2 capitalize flex items-center gap-2 ${getStatusColor(selectedPayment.status)}`}>
                    {getStatusIcon(selectedPayment.status)}
                    {selectedPayment.status}
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={markPaymentAsPaid}
                  className="w-full bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white font-bold py-3 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  Confirm Payment
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedPayment(null);
                  }}
                  className="w-full bg-gray-300 dark:bg-slate-600 hover:bg-gray-400 dark:hover:bg-slate-700 text-gray-800 dark:text-white font-bold py-3 rounded-lg transition-all"
                >
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

export default InstallmentTracking;
