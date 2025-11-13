import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, TrendingUp, Users, ShoppingCart, DollarSign, Calendar, Filter } from 'react-feather';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import db from '../db/database';

interface DailyRevenue {
  date: string;
  invoices: number;
  revenue: number;
}

interface UserReport {
  username: string;
  invoices: number;
  revenue: number;
}

interface TopProduct {
  name: string;
  quantity: number;
  revenue: number;
}

interface PaymentMethod {
  method: string;
  count: number;
  total: number;
}

const Reports: React.FC = () => {
  const [reportType, setReportType] = useState<'revenue' | 'user' | 'products' | 'payments'>('revenue');
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dailyData, setDailyData] = useState<DailyRevenue[]>([]);
  const [userData, setUserData] = useState<UserReport[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [paymentData, setPaymentData] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalInvoices, setTotalInvoices] = useState(0);

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  // Set default dates
  useEffect(() => {
    const today = new Date();
    const start = new Date(today);
    start.setDate(start.getDate() - 30);

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);

    loadReports('month');
  }, []);

  const getDateRangeQuery = () => {
    const today = new Date().toISOString().split('T')[0];
    let days = 30;

    if (dateRange === 'week') days = 7;
    else if (dateRange === 'month') days = 30;
    else if (dateRange === 'year') days = 365;
    else return ''; // all

    const start = new Date();
    start.setDate(start.getDate() - days);
    const startStr = start.toISOString().split('T')[0];

    return `WHERE DATE(created_at) >= '${startStr}' AND DATE(created_at) <= '${today}'`;
  };

  const loadReports = (range?: string) => {
    try {
      setLoading(true);
      const whereClause = range ? getDateRangeQuery() : '';

      // Daily Revenue Data
      const dailyQuery = `
        SELECT 
          DATE(created_at) as date,
          COUNT(id) as invoices,
          ROUND(SUM(total), 2) as revenue
        FROM invoices
        ${whereClause}
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `;
      const daily = db.prepare(dailyQuery).all() as DailyRevenue[];
      setDailyData(daily);

      // User Performance Data
      const userQuery = `
        SELECT 
          u.username,
          COUNT(i.id) as invoices,
          ROUND(SUM(i.total), 2) as revenue
        FROM invoices i
        LEFT JOIN users u ON i.user_id = u.id
        ${whereClause}
        GROUP BY u.username
        ORDER BY revenue DESC
      `;
      const users = db.prepare(userQuery).all() as UserReport[];
      setUserData(users);

      // Top Products Data
      const productsQuery = `
        SELECT 
          p.name,
          SUM(ii.quantity) as quantity,
          ROUND(SUM(ii.quantity * ii.price), 2) as revenue
        FROM invoice_items ii
        JOIN products p ON ii.product_id = p.id
        JOIN invoices i ON ii.invoice_id = i.id
        ${whereClause}
        GROUP BY p.name
        ORDER BY revenue DESC
        LIMIT 10
      `;
      const products = db.prepare(productsQuery).all() as TopProduct[];
      setTopProducts(products);

      // Payment Methods Data
      const paymentsQuery = `
        SELECT 
          payment_method as method,
          COUNT(id) as count,
          ROUND(SUM(total), 2) as total
        FROM invoices
        ${whereClause}
        GROUP BY payment_method
      `;
      const payments = db.prepare(paymentsQuery).all() as PaymentMethod[];
      setPaymentData(payments);

      // Summary Stats
      const stats = db
        .prepare(`
          SELECT 
            ROUND(SUM(total), 2) as total_revenue,
            COUNT(id) as total_invoices
          FROM invoices
          ${whereClause}
        `)
        .get() as { total_revenue: number; total_invoices: number };

      setTotalRevenue(stats.total_revenue || 0);
      setTotalInvoices(stats.total_invoices || 0);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      reportType === 'revenue' ? dailyData : reportType === 'user' ? userData : topProducts
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    XLSX.writeFile(wb, `report_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const data =
      reportType === 'revenue' ? dailyData : reportType === 'user' ? userData : topProducts;
    const columns = Object.keys(data[0] || {});
    const rows = data.map((item) => Object.values(item));

    (doc as any).autoTable({
      head: [columns],
      body: rows,
      startY: 30,
    });

    doc.text(
      `${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report - ${new Date().toLocaleDateString()}`,
      14,
      15
    );
    doc.save(`report_${reportType}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <TrendingUp size={40} className="text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Reports & Analytics</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Sales analysis, trends, and performance metrics
        </p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ staggerChildren: 0.1, delayChildren: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <motion.div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-blue-100 dark:border-blue-900/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 dark:text-blue-400 text-sm font-semibold">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2">
                EGP {totalRevenue.toFixed(2)}
              </p>
            </div>
            <DollarSign size={32} className="text-blue-500 opacity-20" />
          </div>
        </motion.div>

        <motion.div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-green-100 dark:border-green-900/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 dark:text-green-400 text-sm font-semibold">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2">
                {totalInvoices}
              </p>
            </div>
            <ShoppingCart size={32} className="text-green-500 opacity-20" />
          </div>
        </motion.div>

        <motion.div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-purple-100 dark:border-purple-900/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-600 dark:text-purple-400 text-sm font-semibold">Avg per Sale</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-2">
                EGP {totalInvoices > 0 ? (totalRevenue / totalInvoices).toFixed(2) : '0.00'}
              </p>
            </div>
            <TrendingUp size={32} className="text-purple-500 opacity-20" />
          </div>
        </motion.div>

        <motion.div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-lg border border-orange-100 dark:border-orange-900/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-600 dark:text-orange-400 text-sm font-semibold">Top User</p>
              <p className="text-xl font-bold text-gray-800 dark:text-gray-100 mt-2">
                {userData[0]?.username || 'N/A'}
              </p>
              <p className="text-orange-600 dark:text-orange-400 text-xs mt-1">
                {userData[0]?.invoices || 0} sales
              </p>
            </div>
            <Users size={32} className="text-orange-500 opacity-20" />
          </div>
        </motion.div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg"
      >
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter size={20} className="text-gray-600 dark:text-gray-400" />
            <span className="font-semibold text-gray-700 dark:text-gray-300">Date Range:</span>
          </div>
          {(['week', 'month', 'year', 'all'] as const).map((range) => (
            <motion.button
              key={range}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setDateRange(range);
                loadReports(range);
              }}
              className={`px-4 py-2 rounded-full font-medium transition-all ${
                dateRange === range
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {range === 'week' ? 'Last 7 Days' : range === 'month' ? 'Last 30 Days' : range === 'year' ? 'Last Year' : 'All Time'}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Report Type Selector */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex gap-2 flex-wrap"
      >
        {(['revenue', 'user', 'products', 'payments'] as const).map((type) => (
          <motion.button
            key={type}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setReportType(type)}
            className={`px-6 py-3 rounded-full font-semibold transition-all ${
              reportType === type
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-slate-700'
            }`}
          >
            {type === 'revenue' ? 'Revenue' : type === 'user' ? 'By User' : type === 'products' ? 'Top Products' : 'Payment Methods'}
          </motion.button>
        ))}
      </motion.div>

      {/* Charts */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg"
      >
        {reportType === 'revenue' && dailyData.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">Daily Revenue</h2>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  cursor={{ stroke: '#3b82f6', strokeWidth: 2 }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="invoices"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {reportType === 'user' && userData.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">Cashier Performance</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={userData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="username" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                <Bar dataKey="invoices" fill="#10b981" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {reportType === 'products' && topProducts.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">Top 10 Products</h2>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" stroke="#6b7280" />
                <YAxis dataKey="name" type="category" width={150} stroke="#6b7280" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {reportType === 'payments' && paymentData.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">Payment Methods Distribution</h2>
            <ResponsiveContainer width="100%" height={400}>
              <PieChart>
                <Pie
                  data={paymentData}
                  dataKey="total"
                  nameKey="method"
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  label
                >
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </motion.div>

      {/* Data Table & Export */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">Data Table</h2>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={exportToExcel}
              className="px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 flex items-center gap-2"
            >
              <Download size={18} />
              Excel
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={exportToPDF}
              className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 flex items-center gap-2"
            >
              <Download size={18} />
              PDF
            </motion.button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-700">
                {(reportType === 'revenue'
                  ? ['date', 'invoices', 'revenue']
                  : reportType === 'user'
                    ? ['username', 'invoices', 'revenue']
                    : reportType === 'products'
                      ? ['name', 'quantity', 'revenue']
                      : ['method', 'count', 'total']
                ).map((col) => (
                  <th
                    key={col}
                    className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300"
                  >
                    {col.charAt(0).toUpperCase() + col.slice(1)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(reportType === 'revenue'
                ? dailyData
                : reportType === 'user'
                  ? userData
                  : reportType === 'products'
                    ? topProducts
                    : paymentData
              ).map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-gray-100 dark:border-slate-700/50 hover:bg-gray-50 dark:hover:bg-slate-700/50"
                >
                  {Object.values(row).map((val, i) => (
                    <td key={i} className="py-3 px-4 text-gray-700 dark:text-gray-300">
                      {typeof val === 'number' && val > 100 ? val.toFixed(2) : val}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default Reports;
