import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, TrendingUp, Users, ShoppingCart, DollarSign, Calendar, FileText, Activity, PieChart as PieChartIcon } from 'react-feather';
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
import jsPDF from 'jspdf';
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
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalInvoices, setTotalInvoices] = useState(0);

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    loadReportData();
  }, [reportType, dateRange, startDate, endDate]);

  const loadReportData = () => {
    const dates = getDateRange();
    
    if (reportType === 'revenue') {
      loadRevenueReport(dates.start, dates.end);
    } else if (reportType === 'user') {
      loadUserReport(dates.start, dates.end);
    } else if (reportType === 'products') {
      loadProductReport(dates.start, dates.end);
    } else if (reportType === 'payments') {
      loadPaymentReport(dates.start, dates.end);
    }
  };

  const getDateRange = () => {
    const end = endDate ? new Date(endDate) : new Date();
    const start = new Date();
    
    if (startDate) {
      return { start: startDate, end: endDate };
    }
    
    switch (dateRange) {
      case 'week':
        start.setDate(end.getDate() - 7);
        break;
      case 'month':
        start.setMonth(end.getMonth() - 1);
        break;
      case 'year':
        start.setFullYear(end.getFullYear() - 1);
        break;
      default:
        return { start: '2020-01-01', end: end.toISOString().split('T')[0] };
    }
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
    };
  };

  const loadRevenueReport = (start: string, end: string) => {
    const data = db.prepare(`
      SELECT strftime('%Y-%m-%d', created_at) as date, COUNT(*) as invoices, SUM(total) as revenue
      FROM invoices
      WHERE created_at BETWEEN ? AND ?
      GROUP BY date
      ORDER BY date
    `).all(start, end) as DailyRevenue[];
    
    setDailyData(data);
    const total = data.reduce((sum, d) => sum + (d.revenue || 0), 0);
    const invoices = data.reduce((sum, d) => sum + d.invoices, 0);
    setTotalRevenue(total);
    setTotalInvoices(invoices);
  };

  const loadUserReport = (start: string, end: string) => {
    const data = db.prepare(`
      SELECT u.username, COUNT(i.id) as invoices, SUM(i.total) as revenue
      FROM users u
      LEFT JOIN invoices i ON u.id = i.user_id AND i.created_at BETWEEN ? AND ?
      GROUP BY u.id
      ORDER BY revenue DESC
    `).all(start, end) as UserReport[];
    
    setUserData(data.filter(u => u.invoices > 0));
  };

  const loadProductReport = (start: string, end: string) => {
    const data = db.prepare(`
      SELECT p.name, SUM(ii.quantity) as quantity, SUM(ii.quantity * ii.price) as revenue
      FROM products p
      JOIN invoice_items ii ON p.id = ii.product_id
      JOIN invoices i ON ii.invoice_id = i.id
      WHERE i.created_at BETWEEN ? AND ?
      GROUP BY p.id
      ORDER BY revenue DESC
      LIMIT 10
    `).all(start, end) as TopProduct[];
    
    setTopProducts(data);
  };

  const loadPaymentReport = (start: string, end: string) => {
    const data = db.prepare(`
      SELECT payment_method as method, COUNT(*) as count, SUM(total) as total
      FROM invoices
      WHERE created_at BETWEEN ? AND ?
      GROUP BY payment_method
    `).all(start, end) as PaymentMethod[];
    
    setPaymentData(data);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    let yPosition = 20;

    doc.setFontSize(18);
    doc.text(`${reportType.toUpperCase()} Report`, doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
    yPosition += 20;

    if (reportType === 'revenue') {
      doc.setFontSize(12);
      doc.text(`Total Revenue: ${totalRevenue.toFixed(2)} EGP`, 20, yPosition);
      yPosition += 10;
      doc.text(`Total Invoices: ${totalInvoices}`, 20, yPosition);
    }

    doc.output('datauristring');
    window.open(doc.output('datauristring'));
  };

  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 min-h-screen">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-green-400 bg-clip-text text-transparent dark:from-green-400 dark:to-green-300">
          Reports & Analytics
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">Analyze your business performance</p>
      </motion.div>

      {/* Filter Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-slate-700 mb-8"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="w-full p-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
            >
              <option value="revenue">Revenue</option>
              <option value="user">By User/Cashier</option>
              <option value="products">Top Products</option>
              <option value="payments">Payment Methods</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Date Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as any)}
              className="w-full p-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="all">All Time</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full p-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full p-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
            />
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={downloadPDF}
          className="mt-4 flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-2.5 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          <Download size={18} />
          Download PDF
        </motion.button>
      </motion.div>

      {/* KPI Cards */}
      {reportType === 'revenue' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ staggerChildren: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
        >
          <motion.div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
            <p className="text-gray-600 dark:text-gray-400 text-sm font-medium flex items-center gap-2">
              <DollarSign size={18} />
              Total Revenue
            </p>
            <p className="text-3xl font-bold text-gray-800 dark:text-white mt-3">{totalRevenue.toFixed(2)} EGP</p>
          </motion.div>
          <motion.div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-xl p-6 shadow-lg border border-green-200 dark:border-green-900">
            <p className="text-green-700 dark:text-green-400 text-sm font-medium flex items-center gap-2">
              <ShoppingCart size={18} />
              Total Invoices
            </p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-3">{totalInvoices}</p>
          </motion.div>
        </motion.div>
      )}

      {/* Charts Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        {/* Main Chart */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
            <Activity size={24} className="text-green-500" />
            {reportType === 'revenue' && 'Daily Revenue Trend'}
            {reportType === 'user' && 'Cashier Performance'}
            {reportType === 'products' && 'Top Products'}
            {reportType === 'payments' && 'Payment Methods'}
          </h2>

          {reportType === 'revenue' && dailyData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="date" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={{ fill: '#10b981', r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : reportType === 'user' && userData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="username" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : reportType === 'products' && topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="quantity" fill="#f59e0b" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : reportType === 'payments' && paymentData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ method, count }) => `${method}: ${count}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <p>No data available</p>
            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-slate-700">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-6">Details</h2>

          {reportType === 'revenue' && dailyData.length > 0 ? (
            <div className="overflow-y-auto max-h-80">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-800 dark:text-white">Date</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-800 dark:text-white">Invoices</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-800 dark:text-white">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {dailyData.map((item) => (
                    <tr key={item.date} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-2 text-gray-800 dark:text-white">{item.date}</td>
                      <td className="px-4 py-2 text-right text-gray-800 dark:text-white">{item.invoices}</td>
                      <td className="px-4 py-2 text-right text-green-600 dark:text-green-400 font-semibold">{(item.revenue || 0).toFixed(2)} EGP</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : reportType === 'user' && userData.length > 0 ? (
            <div className="overflow-y-auto max-h-80">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-800 dark:text-white">User</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-800 dark:text-white">Invoices</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-800 dark:text-white">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {userData.map((item) => (
                    <tr key={item.username} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-2 text-gray-800 dark:text-white">{item.username}</td>
                      <td className="px-4 py-2 text-right text-gray-800 dark:text-white">{item.invoices}</td>
                      <td className="px-4 py-2 text-right text-blue-600 dark:text-blue-400 font-semibold">{(item.revenue || 0).toFixed(2)} EGP</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : reportType === 'products' && topProducts.length > 0 ? (
            <div className="overflow-y-auto max-h-80">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50 dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-gray-800 dark:text-white">Product</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-800 dark:text-white">Qty</th>
                    <th className="px-4 py-2 text-right font-semibold text-gray-800 dark:text-white">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  {topProducts.map((item) => (
                    <tr key={item.name} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                      <td className="px-4 py-2 text-gray-800 dark:text-white">{item.name}</td>
                      <td className="px-4 py-2 text-right text-gray-800 dark:text-white">{item.quantity}</td>
                      <td className="px-4 py-2 text-right text-orange-600 dark:text-orange-400 font-semibold">{(item.revenue || 0).toFixed(2)} EGP</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <p>No data available</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Reports;
