import React, { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { AlertTriangle, TrendingUp, ShoppingCart, Users, Package, DollarSign, ChevronRight, FileText, Database } from 'react-feather'; // Added ChevronRight
import db from '../db/database';

interface RevenueData {
  name: string;
  revenue: number;
}

interface Product {
  id: number;
  name: string;
  stock: number;
}

interface KPI {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: string;
}

const Dashboard: React.FC = () => {
  const [dailyRevenue, setDailyRevenue] = useState<RevenueData[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<RevenueData[]>([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState<Product[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrders, setTotalOrders] = useState(0);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = () => {
    // Fetch daily revenue
    const dailyData = db.prepare(`
      SELECT strftime('%Y-%m-%d', created_at) as day, SUM(total) as revenue
      FROM invoices
      WHERE created_at >= date('now', '-7 days')
      GROUP BY day
    `).all() as { day: string; revenue: number }[];
    setDailyRevenue(dailyData.map(d => ({ name: d.day, revenue: d.revenue || 0 })));

    // Fetch monthly revenue
    const monthlyData = db.prepare(`
      SELECT strftime('%Y-%m', created_at) as month, SUM(total) as revenue
      FROM invoices
      GROUP BY month
    `).all() as { month: string; revenue: number }[];
    setMonthlyRevenue(monthlyData.map(m => ({ name: m.month, revenue: m.revenue || 0 })));

    // Fetch out of stock products
    const products = db.prepare('SELECT id, name, stock FROM products WHERE stock <= 0').all() as Product[];
    setOutOfStockProducts(products);

    // Fetch KPI data
    const totalRevenueResult = db.prepare('SELECT SUM(total) as total FROM invoices').get() as { total: number } | undefined;
    setTotalRevenue(totalRevenueResult?.total || 0);

    const totalOrdersResult = db.prepare('SELECT COUNT(*) as count FROM invoices').get() as { count: number } | undefined;
    setTotalOrders(totalOrdersResult?.count || 0);

    const totalCustomersResult = db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number } | undefined;
    setTotalCustomers(totalCustomersResult?.count || 0);

    const totalProductsResult = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number } | undefined;
    setTotalProducts(totalProductsResult?.count || 0);
  };

  // KPIs adapted for the new design
  const dashboardKpis = [
    { label: 'Daily Revenue', value: `$${dailyRevenue.length > 0 ? dailyRevenue[dailyRevenue.length - 1].revenue.toFixed(2) : '0.00'}`, icon: <TrendingUp size={24} className="text-green-500" /> },
    { label: 'Monthly Revenue', value: `$${monthlyRevenue.length > 0 ? monthlyRevenue[monthlyRevenue.length - 1].revenue.toFixed(2) : '0.00'}`, icon: <ShoppingCart size={24} className="text-blue-500" /> },
    { label: 'Total Sales', value: `$${totalRevenue.toFixed(2)}`, icon: <DollarSign size={24} className="text-purple-500" /> },
  ];

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
    <motion.div 
      className="h-[calc(100vh-10rem)] m-4 p-8 bg-white/30 backdrop-blur-lg rounded-3xl shadow-2xl flex flex-col"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut", delay: 0.2 }}
    >
      {/* Top Section: Dashboard Title and User Info (from Header) */}
      {/* This section is now handled by the Header component */}

      {/* Main Dashboard Content */}
      <div className="flex-1 grid grid-cols-12 gap-6">
        {/* Left Column */}
        <div className="col-span-8 flex flex-col space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-6">
            {dashboardKpis.map((kpi, idx) => (
              <motion.div
                key={idx}
                variants={itemVariants}
                className="bg-white/50 rounded-2xl p-5 shadow-lg flex flex-col justify-between"
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="text-gray-600 text-sm font-medium">{kpi.label}</p>
                  {kpi.icon}
                </div>
                <p className="text-2xl font-bold text-gray-800">{kpi.value}</p>
              </motion.div>
            ))}
          </div>

          {/* Sales Chart */}
          <motion.div
            variants={itemVariants}
            className="bg-white/50 rounded-2xl p-6 shadow-lg flex-1"
          >
            <h2 className="text-lg font-semibold text-gray-800 mb-4">SALES CHART</h2>
            {dailyRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={dailyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis dataKey="name" stroke="#9ca3af" />
                  <YAxis stroke="#9ca3af" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255,255,255,0.8)',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      color: '#333'
                    }}
                    labelStyle={{ color: '#333' }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} dot={{ fill: '#8884d8', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">
                <p>No sales data available yet</p>
              </div>
            )}
          </motion.div>
        </div>

        {/* Right Column */}
        <div className="col-span-4 flex flex-col space-y-6">
          {/* Out of Stock Alert */}
          {outOfStockProducts.length > 0 && (
            <motion.div
              variants={itemVariants}
              className="bg-white/50 rounded-2xl p-6 shadow-lg flex flex-col items-center justify-center text-center relative"
            >
              <div className="absolute top-0 right-0 -mt-4 -mr-4 bg-red-500 text-white rounded-full p-2 shadow-xl">
                <AlertTriangle size={24} />
              </div>
              <h3 className="font-bold text-red-700 text-lg mb-2">OUT-OF-STOCK ALERT</h3>
              <p className="text-gray-600 text-sm">Low stock on {outOfStockProducts.length} items</p>
              {/* Optionally list items here or link to products page */}
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-1 gap-4">
            <motion.button
              variants={itemVariants}
              className="w-full py-3 bg-white/70 rounded-full text-gray-800 font-semibold shadow-md hover:bg-white transition-colors flex items-center justify-center"
            >
              <FileText size={18} className="mr-2" />
              New Invoice
            </motion.button>
            <motion.button
              variants={itemVariants}
              className="w-full py-3 bg-white/70 rounded-full text-gray-800 font-semibold shadow-md hover:bg-white transition-colors flex items-center justify-center"
            >
              <Package size={18} className="mr-2" />
              Add Product
            </motion.button>
            <motion.button
              variants={itemVariants}
              className="w-full py-3 bg-white/70 rounded-full text-gray-800 font-semibold shadow-md hover:bg-white transition-colors flex items-center justify-center"
            >
              <Database size={18} className="mr-2" />
              Backup Data
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default Dashboard;
