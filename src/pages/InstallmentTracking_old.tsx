import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Check, Clock, AlertCircle, Plus, X } from 'react-feather';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
        return 'text-green-500';
      case 'due':
        return 'text-blue-500';
      case 'overdue':
        return 'text-red-500';
      default:
        return 'text-gray-500';
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
        return 'bg-green-50 dark:bg-green-900/20';
      case 'due':
        return 'bg-blue-50 dark:bg-blue-900/20';
      case 'overdue':
        return 'bg-red-50 dark:bg-red-900/20';
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

  const filteredInvoices = invoices.map((inv) => ({
    ...inv,
    payments: inv.payments.filter((p) => filterStatus === 'all' || p.status === filterStatus),
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <Clock size={40} className="text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Installment Tracking</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage and track all installment payments
        </p>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3"
        >
          <AlertCircle size={20} className="text-red-500" />
          <span className="text-red-700 dark:text-red-300">{error}</span>
        </motion.div>
      )}

      {/* Statistics Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ staggerChildren: 0.1, delayChildren: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {/* Due Payments */}
        <motion.div
          whileHover={{ y: -5 }}
          className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg dark:shadow-xl border border-blue-100 dark:border-blue-900/30 backdrop-blur-xl bg-white/80 dark:bg-slate-800/80"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 dark:text-blue-400 text-sm font-semibold">Due Payments</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2">
                {stats.dueCount}
              </p>
              <p className="text-blue-600 dark:text-blue-400 text-sm mt-1">
                EGP {stats.totalDue.toFixed(2)}
              </p>
            </div>
            <Clock size={32} className="text-blue-500 opacity-20" />
          </div>
        </motion.div>

        {/* Overdue Payments */}
        <motion.div
          whileHover={{ y: -5 }}
          className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg dark:shadow-xl border border-red-100 dark:border-red-900/30 backdrop-blur-xl bg-white/80 dark:bg-slate-800/80"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-600 dark:text-red-400 text-sm font-semibold">Overdue</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2">
                {stats.overdueCount}
              </p>
              <p className="text-red-600 dark:text-red-400 text-sm mt-1">
                EGP {stats.totalOverdue.toFixed(2)}
              </p>
            </div>
            <AlertCircle size={32} className="text-red-500 opacity-20" />
          </div>
        </motion.div>

        {/* Paid Payments */}
        <motion.div
          whileHover={{ y: -5 }}
          className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg dark:shadow-xl border border-green-100 dark:border-green-900/30 backdrop-blur-xl bg-white/80 dark:bg-slate-800/80"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 dark:text-green-400 text-sm font-semibold">Paid</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2">
                {stats.paidCount}
              </p>
              <p className="text-green-600 dark:text-green-400 text-sm mt-1">
                EGP {stats.totalPaid.toFixed(2)}
              </p>
            </div>
            <Check size={32} className="text-green-500 opacity-20" />
          </div>
        </motion.div>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'due', 'paid', 'overdue'] as const).map((status) => (
            <motion.button
              key={status}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded-full font-medium transition-all ${
                filterStatus === status
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Invoices List */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        {filteredInvoices.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-gray-200 dark:border-slate-700"
          >
            <Clock size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              No installment {filterStatus !== 'all' ? filterStatus : 'payments'}
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
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden shadow-lg dark:shadow-xl"
                >
                  {/* Invoice Header */}
                  <motion.button
                    onClick={() =>
                      setExpandedInvoice(expandedInvoice === invoice.id ? null : invoice.id)
                    }
                    className="w-full p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-left flex-1">
                        <h3 className="font-bold text-gray-800 dark:text-gray-100">
                          Invoice #{invoice.id}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {invoice.customer_name || 'Walk-in Customer'} •{' '}
                          {new Date(invoice.created_at).toLocaleDateString()}
                        </p>
                        {invoice.customer_phone && (
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {invoice.customer_phone}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-gray-800 dark:text-gray-100">
                          EGP {invoice.total.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {invoice.payments.length} payments
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
                        <div className="p-6 space-y-4">
                          {/* Invoice Summary */}
                          <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-gray-200 dark:border-slate-700">
                            <div>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Down Payment
                              </p>
                              <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                                EGP {(invoice.down_payment || 0).toFixed(2)}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                Installment %
                              </p>
                              <p className="text-lg font-bold text-gray-800 dark:text-gray-100">
                                {(invoice.installment_percentage || 0).toFixed(1)}%
                              </p>
                            </div>
                          </div>

                          {/* Payment Schedule */}
                          <div className="space-y-3">
                            {invoice.payments.map((payment) => (
                              <motion.div
                                key={payment.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className={`${getStatusBg(payment.status)} rounded-xl p-4 flex items-center justify-between`}
                              >
                                <div className="flex items-center gap-4 flex-1">
                                  <div
                                    className={`p-2 rounded-full ${getStatusColor(payment.status)}`}
                                  >
                                    {getStatusIcon(payment.status)}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-gray-800 dark:text-gray-100">
                                      EGP {payment.amount.toFixed(2)}
                                    </p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">
                                      Due: {new Date(payment.due_date).toLocaleDateString()}
                                      {payment.paid_at &&
                                        ` • Paid: ${new Date(payment.paid_at).toLocaleDateString()}`}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
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
                                      className="p-2 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-full transition-colors"
                                      title="Mark as paid"
                                    >
                                      <Plus size={18} className="text-blue-500" />
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
      </motion.div>

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
              className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  Record Payment
                </h2>
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
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Payment Amount</p>
                  <p className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-2">
                    EGP {selectedPayment.amount.toFixed(2)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Due Date</p>
                  <p className="text-lg font-semibold text-gray-800 dark:text-gray-100 mt-2">
                    {new Date(selectedPayment.due_date).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Current Status</p>
                  <p className={`text-lg font-bold mt-2 capitalize ${getStatusColor(selectedPayment.status)}`}>
                    {selectedPayment.status}
                  </p>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={markPaymentAsPaid}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 rounded-2xl hover:shadow-lg transition-shadow"
                >
                  Confirm Payment
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowPaymentModal(false);
                    setSelectedPayment(null);
                  }}
                  className="w-full bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-100 font-bold py-3 rounded-2xl hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
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
