import React, { useState, useEffect } from 'react';
import db from '../db/database';
import { useAuth } from '../contexts/AuthContext';
import { useCSV } from '../hooks/useCSV';
import { useExcelExport } from '../hooks/useExcelExport';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Download, Upload, Search, AlertTriangle, X, Check, Grid, List } from 'react-feather';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category_id?: number;
  barcode?: string;
  image?: string;
}

interface Category {
  id: number;
  name: string;
}

interface Setting {
  value: string;
}

const Products: React.FC = () => {
  const { user } = useAuth();
  const { exportToCSV, importFromCSV } = useCSV();
  const { exportToExcel } = useExcelExport();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    stock: 0,
    category_id: null as number | null,
    barcode: '',
  });

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const loadProducts = () => {
    const allProducts = db.prepare('SELECT * FROM products').all() as Product[];
    setProducts(allProducts);
  };

  const loadCategories = () => {
    const allCategories = db.prepare('SELECT * FROM categories').all() as Category[];
    setCategories(allCategories);
  };

  const handleSaveProduct = () => {
    if (!formData.name || formData.price <= 0) {
      alert('Please fill all required fields');
      return;
    }

    try {
      if (editingProduct) {
        db.prepare(`
          UPDATE products 
          SET name = ?, price = ?, stock = ?, category_id = ?, barcode = ?
          WHERE id = ?
        `).run(
          formData.name,
          formData.price,
          formData.stock,
          formData.category_id,
          formData.barcode,
          editingProduct.id
        );
      } else {
        db.prepare(`
          INSERT INTO products (name, price, stock, category_id, barcode)
          VALUES (?, ?, ?, ?, ?)
        `).run(
          formData.name,
          formData.price,
          formData.stock,
          formData.category_id,
          formData.barcode
        );
      }
      loadProducts();
      resetForm();
      setShowModal(false);
    } catch (error) {
      alert('Error saving product: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price,
      stock: product.stock,
      category_id: product.category_id || null,
      barcode: product.barcode || '',
    });
    setShowModal(true);
  };

  const handleDeleteProduct = (id: number) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        db.prepare('DELETE FROM products WHERE id = ?').run(id);
        loadProducts();
      } catch (error) {
        alert('Error deleting product');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      price: 0,
      stock: 0,
      category_id: null,
      barcode: '',
    });
    setEditingProduct(null);
  };

  const handleExportCSV = () => {
    exportToCSV(filteredProducts, 'products');
  };

  const handleExportExcel = () => {
    exportToExcel(filteredProducts, 'products');
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await importFromCSV(file);
      let successCount = 0;

      data.forEach((row: any) => {
        if (row.name && row.price) {
          try {
            db.prepare(`
              INSERT INTO products (name, price, stock, category_id, barcode)
              VALUES (?, ?, ?, ?, ?)
            `).run(
              row.name,
              parseFloat(row.price),
              parseInt(row.stock) || 0,
              row.category_id ? parseInt(row.category_id) : null,
              row.barcode || ''
            );
            successCount++;
          } catch (error) {
            // Silently skip duplicate or invalid rows
          }
        }
      });

      alert(`Successfully imported ${successCount} products`);
      loadProducts();
    } catch (error) {
      alert('Error importing CSV: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    // Reset file input
    event.target.value = '';
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.barcode && p.barcode.includes(searchTerm));
    const matchesCategory = filterCategory === null || p.category_id === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const outOfStockCount = products.filter(p => p.stock === 0).length;
  const lowStockCount = products.filter(p => p.stock > 0 && p.stock < 10).length;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 min-h-screen">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-8"
      >
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-300">
            Products
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage your inventory efficiently</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          <Plus size={20} />
          Add Product
        </motion.button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ staggerChildren: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
      >
        <motion.div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Products</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{products.length}</p>
        </motion.div>
        <motion.div className="bg-gradient-to-br from-red-500/10 to-red-600/10 rounded-xl p-6 shadow-lg border border-red-200 dark:border-red-900">
          <p className="text-red-700 dark:text-red-400 text-sm font-medium flex items-center gap-2">
            <AlertTriangle size={16} />
            Out of Stock
          </p>
          <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">{outOfStockCount}</p>
        </motion.div>
        <motion.div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 rounded-xl p-6 shadow-lg border border-yellow-200 dark:border-yellow-900">
          <p className="text-yellow-700 dark:text-yellow-400 text-sm font-medium flex items-center gap-2">
            <AlertTriangle size={16} />
            Low Stock
          </p>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">{lowStockCount}</p>
        </motion.div>
        <motion.div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-xl p-6 shadow-lg border border-green-200 dark:border-green-900">
          <p className="text-green-700 dark:text-green-400 text-sm font-medium">Total Value</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
            {(products.reduce((sum, p) => sum + p.price * p.stock, 0) / 1000).toFixed(1)}K
          </p>
        </motion.div>
      </motion.div>

      {/* Filters and Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 mb-8"
      >
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or barcode..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
            />
          </div>

          <select
            value={filterCategory || ''}
            onChange={e => setFilterCategory(e.target.value ? parseInt(e.target.value) : null)}
            className="px-4 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('table')}
              className={`p-2.5 rounded-lg transition-all ${
                viewMode === 'table'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <List size={20} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-lg transition-all ${
                viewMode === 'grid'
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <Grid size={20} />
            </motion.button>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2.5 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <Download size={18} />
            CSV
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2.5 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <Download size={18} />
            Excel
          </motion.button>

          <label className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2.5 rounded-lg font-semibold cursor-pointer shadow-lg hover:shadow-xl transition-all">
            <Upload size={18} />
            Import
            <input
              type="file"
              accept=".csv"
              onChange={handleImportCSV}
              className="hidden"
            />
          </label>
        </div>
      </motion.div>

      {/* Products View */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {viewMode === 'table' ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-800 border-b border-gray-200 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-gray-800 dark:text-white font-semibold">Name</th>
                    <th className="px-6 py-4 text-left text-gray-800 dark:text-white font-semibold">Category</th>
                    <th className="px-6 py-4 text-left text-gray-800 dark:text-white font-semibold">Barcode</th>
                    <th className="px-6 py-4 text-right text-gray-800 dark:text-white font-semibold">Price</th>
                    <th className="px-6 py-4 text-right text-gray-800 dark:text-white font-semibold">Stock</th>
                    <th className="px-6 py-4 text-right text-gray-800 dark:text-white font-semibold">Value</th>
                    <th className="px-6 py-4 text-center text-gray-800 dark:text-white font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                  <AnimatePresence>
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-8 text-center text-gray-600 dark:text-gray-400">
                          No products found
                        </td>
                      </tr>
                    ) : (
                      filteredProducts.map((product) => (
                        <motion.tr
                          key={product.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                        >
                          <td className="px-6 py-4 text-gray-800 dark:text-white font-semibold">{product.name}</td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                            {categories.find(c => c.id === product.category_id)?.name || '-'}
                          </td>
                          <td className="px-6 py-4 text-gray-600 dark:text-gray-400 font-mono text-sm">{product.barcode || '-'}</td>
                          <td className="px-6 py-4 text-right text-gray-800 dark:text-white font-semibold">
                            {product.price.toFixed(2)} EGP
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                              product.stock === 0
                                ? 'bg-red-500/20 text-red-700 dark:text-red-400'
                                : product.stock < 10
                                ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                                : 'bg-green-500/20 text-green-700 dark:text-green-400'
                            }`}>
                              {product.stock}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right text-gray-800 dark:text-white font-semibold">
                            {(product.price * product.stock).toFixed(2)} EGP
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex gap-2 justify-center">
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleEditProduct(product)}
                                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all"
                              >
                                <Edit2 size={18} />
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => handleDeleteProduct(product.id)}
                                className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-all"
                              >
                                <Trash2 size={18} />
                              </motion.button>
                            </div>
                          </td>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {filteredProducts.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <p className="text-gray-600 dark:text-gray-400">No products found</p>
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-all"
                  >
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2 truncate">{product.name}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                        {categories.find(c => c.id === product.category_id)?.name || 'Uncategorized'}
                      </p>

                      <div className="mb-4">
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{product.price.toFixed(2)} EGP</p>
                      </div>

                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-sm text-gray-600 dark:text-gray-400">Stock Level</p>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            product.stock === 0
                              ? 'bg-red-500/20 text-red-700 dark:text-red-400'
                              : product.stock < 10
                              ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400'
                              : 'bg-green-500/20 text-green-700 dark:text-green-400'
                          }`}>
                            {product.stock} units
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className="h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min((product.stock / 100) * 100, 100)}%`,
                              backgroundColor: product.stock === 0 ? '#ef4444' : product.stock < 10 ? '#eab308' : '#10b981'
                            }}
                          />
                        </div>
                      </div>

                      {product.barcode && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mb-4 font-mono">{product.barcode}</p>
                      )}

                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleEditProduct(product)}
                          className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-semibold transition-all"
                        >
                          <Edit2 size={16} />
                          Edit
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleDeleteProduct(product.id)}
                          className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg font-semibold transition-all"
                        >
                          <Trash2 size={16} />
                          Delete
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
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
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm"
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
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-300">
                  {editingProduct ? 'Edit Product' : 'Add New Product'}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={() => setShowModal(false)}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  <X size={24} />
                </motion.button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Product name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Category</label>
                  <select
                    value={formData.category_id || ''}
                    onChange={e => setFormData({ ...formData, category_id: e.target.value ? parseInt(e.target.value) : null })}
                    className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Barcode</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Barcode or SKU"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Price *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={e => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                      className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Stock</label>
                    <input
                      type="number"
                      value={formData.stock}
                      onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                      className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveProduct}
                    className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    <Check size={20} />
                    Save
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowModal(false)}
                    className="flex-1 flex items-center justify-center gap-2 bg-gray-300 hover:bg-gray-400 dark:bg-slate-600 dark:hover:bg-slate-700 text-gray-800 dark:text-white py-3 rounded-lg font-semibold transition-all"
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

export default Products;
