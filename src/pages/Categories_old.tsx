import React, { useState, useEffect } from 'react';
import db from '../db/database';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Check, Tag } from 'react-feather';

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
    if (window.confirm('Are you sure? Products in this category will need to be reassigned.')) {
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

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-100 dark:from-gray-800 dark:to-blue-900 p-6 rounded-xl">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-6"
      >
        <div>
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2 flex items-center gap-2">
            <Tag size={40} className="text-blue-500" />
            Categories
          </h1>
          <p className="text-gray-600 dark:text-gray-300">Manage product categories</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-500/70 hover:bg-blue-600/70 text-white px-4 py-2 rounded-lg font-semibold shadow-neumorphic-light dark:shadow-neumorphic-dark"
        >
          <Plus size={20} />
          Add Category
        </motion.button>
      </motion.div>

      {/* Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/30 dark:bg-black/30 backdrop-blur-md p-4 rounded-lg shadow-neumorphic-light dark:shadow-neumorphic-dark mb-6"
      >
        <p className="text-gray-600 dark:text-gray-400 text-sm">Total Categories</p>
        <p className="text-3xl font-bold text-gray-800 dark:text-white">{categories.length}</p>
      </motion.div>

      {/* Categories Grid */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {categories.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-white/30 dark:bg-black/30 backdrop-blur-md rounded-lg">
            <p className="text-gray-600 dark:text-gray-400 text-lg">No categories yet. Create one to get started!</p>
          </div>
        ) : (
          <AnimatePresence>
            {categories.map((category) => (
              <motion.div
                key={category.id}
                variants={itemVariants}
                className="bg-white/30 dark:bg-black/30 backdrop-blur-md p-6 rounded-lg shadow-neumorphic-light dark:shadow-neumorphic-dark hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{category.name}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {category.count} {category.count === 1 ? 'product' : 'products'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEditCategory(category)}
                      className="p-2 bg-blue-500/70 hover:bg-blue-600/70 text-white rounded-lg"
                    >
                      <Edit2 size={18} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-2 bg-red-500/70 hover:bg-red-600/70 text-white rounded-lg"
                    >
                      <Trash2 size={18} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 w-96 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                  {editingCategory ? 'Edit Category' : 'Add New Category'}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={() => setShowModal(false)}
                  className="text-gray-600 dark:text-gray-400"
                >
                  <X size={24} />
                </motion.button>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Category Name *</label>
                <input
                  type="text"
                  value={categoryName}
                  onChange={e => setCategoryName(e.target.value)}
                  placeholder="e.g., Electronics, Clothing, etc."
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex gap-2 pt-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSaveCategory}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-500/70 hover:bg-green-600/70 text-white py-2 rounded-lg font-semibold"
                >
                  <Check size={20} />
                  Save
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowModal(false)}
                  className="flex-1 flex items-center justify-center gap-2 bg-gray-500/70 hover:bg-gray-600/70 text-white py-2 rounded-lg font-semibold"
                >
                  <X size={20} />
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

export default Categories;
