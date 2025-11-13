import React, { useEffect, useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, ShoppingCart, Users, Package, DollarSign, AlertTriangle } from 'react-feather';
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

  const stats = [
    { label: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Total Orders', value: totalOrders.toString(), icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Customers', value: totalCustomers.toString(), icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Products', value: totalProducts.toString(), icon: Package, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-lg p-6 shadow-sm border border-gray-100"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Revenue (Last 7 Days)</h3>
          {dailyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <p>No sales data available</p>
            </div>
          )}
        </motion.div>

        {/* Monthly Revenue Chart */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-lg p-6 shadow-sm border border-gray-100"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Revenue</h3>
          {monthlyRevenue.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <p>No monthly data available</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Out of Stock Alert */}
      {outOfStockProducts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-red-50 border border-red-200 rounded-lg p-6"
        >
          <div className="flex items-center space-x-3">
            <AlertTriangle className="text-red-600" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-red-900">Out of Stock Alert</h3>
              <p className="text-red-700">{outOfStockProducts.length} products are out of stock</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {outOfStockProducts.slice(0, 5).map(product => (
              <div key={product.id} className="flex justify-between items-center text-sm">
                <span className="text-red-800">{product.name}</span>
                <span className="text-red-600 font-medium">Stock: {product.stock}</span>
              </div>
            ))}
            {outOfStockProducts.length > 5 && (
              <p className="text-sm text-red-600">...and {outOfStockProducts.length - 5} more</p>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;