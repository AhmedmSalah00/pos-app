import React, { useState, useEffect } from 'react';
import db from '../db/database';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Check, Tag, Package } from 'react-feather';

interface Category {
  id: number;
  name: string;
}

interface CategoryWithCount extends Category {
  count: number;
}

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = () => {
    const allCategories = db.prepare('SELECT * FROM categories').all() as Category[];
    const categoriesWithCount = allCategories.map(cat => {
      const count = (db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(cat.id) as { count: number }).count;
      return { ...cat, count };
    });
    setCategories(categoriesWithCount);
  };

  const handleSaveCategory = () => {
    if (!categoryName.trim()) {
      alert('Please enter category name');
      return;
    }

    try {
      if (editingCategory) {
        db.prepare('UPDATE categories SET name = ? WHERE id = ?').run(categoryName, editingCategory.id);
      } else {
        db.prepare('INSERT INTO categories (name) VALUES (?)').run(categoryName);
      }
      loadCategories();
      resetForm();
      setShowModal(false);
    } catch (error) {
      alert('Error saving category: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCategoryName(category.name);
    setShowModal(true);
  };

  const handleDeleteCategory = (id: number) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      try {
        db.prepare('DELETE FROM categories WHERE id = ?').run(id);
        loadCategories();
      } catch (error) {
        alert('Error deleting category');
      }
    }
  };

  const resetForm = () => {
    setCategoryName('');
    setEditingCategory(null);
  };

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalProducts = categories.reduce((sum, cat) => sum + cat.count, 0);

  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 min-h-screen">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-8"
      >
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent dark:from-purple-400 dark:to-purple-300">
            Categories
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Organize your product categories</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          <Plus size={20} />
          Add Category
        </motion.button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ staggerChildren: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
      >
        <motion.div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium flex items-center gap-2">
            <Tag size={16} />
            Total Categories
          </p>
          <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{categories.length}</p>
        </motion.div>
        <motion.div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-xl p-6 shadow-lg border border-purple-200 dark:border-purple-900">
          <p className="text-purple-700 dark:text-purple-400 text-sm font-medium flex items-center gap-2">
            <Package size={16} />
            Total Products
          </p>
          <p className="text-3xl font-bold text-purple-600 dark:text-purple-400 mt-2">{totalProducts}</p>
        </motion.div>
        <motion.div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-xl p-6 shadow-lg border border-blue-200 dark:border-blue-900">
          <p className="text-blue-700 dark:text-blue-400 text-sm font-medium">Avg Products/Category</p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">
            {categories.length > 0 ? (totalProducts / categories.length).toFixed(1) : '0'}
          </p>
        </motion.div>
      </motion.div>

      {/* Search */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 mb-8"
      >
        <input
          type="text"
          placeholder="Search categories..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-800 dark:text-white"
        />
      </motion.div>

      {/* Categories Grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        <AnimatePresence>
          {filteredCategories.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white dark:bg-slate-800 rounded-xl">
              <p className="text-gray-600 dark:text-gray-400">No categories found</p>
            </div>
          ) : (
            filteredCategories.map((category) => (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden hover:shadow-xl transition-all"
              >
                <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 text-white">
                  <div className="flex items-start justify-between mb-2">
                    <Tag size={24} />
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleEditCategory(category)}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
                      >
                        <Edit2 size={18} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDeleteCategory(category.id)}
                        className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </motion.button>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold">{category.name}</h3>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Products</span>
                    <span className="text-3xl font-bold text-purple-600 dark:text-purple-400">{category.count}</span>
                  </div>
                  <div className="mt-4 w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all"
                      style={{
                        width: totalProducts > 0 ? `${(category.count / totalProducts) * 100}%` : '0%'
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                    {totalProducts > 0 ? ((category.count / totalProducts) * 100).toFixed(1) : '0'}% of total
                  </p>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
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
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent dark:from-purple-400 dark:to-purple-300">
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
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
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Category Name *</label>
                  <input
                    type="text"
                    value={categoryName}
                    onChange={e => setCategoryName(e.target.value)}
                    className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter category name"
                    autoFocus
                  />
                </div>

                <div className="flex gap-3 pt-6">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveCategory}
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

export default Categories;
