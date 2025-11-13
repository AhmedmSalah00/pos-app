import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit, Trash2, X, Phone, MapPin, Download, AlertCircle, Check, Search } from 'react-feather';
import * as XLSX from 'xlsx';
import db from '../db/database';
import { useCSV } from '../hooks/useCSV';
import { useExcelExport } from '../hooks/useExcelExport';

interface Supplier {
  id: number;
  name: string;
  phone: string;
  address: string;
}

const Suppliers: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ name: '', phone: '', address: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const { importFromCSV } = useCSV();
  const { exportToExcel } = useExcelExport();

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    filterSuppliers();
  }, [suppliers, searchQuery]);

  const loadSuppliers = () => {
    try {
      const allSuppliers = db.prepare('SELECT * FROM suppliers ORDER BY name ASC').all() as Supplier[];
      setSuppliers(allSuppliers);
      setLoading(false);
    } catch (err) {
      console.error('Error loading suppliers:', err);
      setError('Failed to load suppliers');
      setLoading(false);
    }
  };

  const filterSuppliers = () => {
    const query = searchQuery.toLowerCase();
    const filtered = suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(query) ||
        s.phone.toLowerCase().includes(query) ||
        s.address.toLowerCase().includes(query)
    );
    setFilteredSuppliers(filtered);
  };

  const resetForm = () => {
    setFormData({ name: '', phone: '', address: '' });
    setError('');
    setIsEditing(false);
    setEditingId(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (supplier: Supplier) => {
    setEditingId(supplier.id);
    setIsEditing(true);
    setFormData({
      name: supplier.name,
      phone: supplier.phone,
      address: supplier.address,
    });
    setShowModal(true);
  };

  const validateForm = (): boolean => {
    setError('');

    if (!formData.name.trim()) {
      setError('Supplier name is required');
      return false;
    }

    if (!formData.phone.trim()) {
      setError('Phone number is required');
      return false;
    }

    // Check for duplicate name
    const existingSupplier = suppliers.find(
      (s) => s.name === formData.name && s.id !== editingId
    );
    if (existingSupplier) {
      setError('Supplier name already exists');
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    try {
      if (isEditing && editingId) {
        db.prepare('UPDATE suppliers SET name = ?, phone = ?, address = ? WHERE id = ?').run(
          formData.name,
          formData.phone,
          formData.address,
          editingId
        );
        setSuccess('Supplier updated successfully!');
      } else {
        db.prepare('INSERT INTO suppliers (name, phone, address) VALUES (?, ?, ?)').run(
          formData.name,
          formData.phone,
          formData.address
        );
        setSuccess('Supplier added successfully!');
      }

      setTimeout(() => {
        setShowModal(false);
        loadSuppliers();
        resetForm();
        setSuccess('');
      }, 1500);
    } catch (err) {
      setError('Failed to save supplier');
      console.error(err);
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      try {
        db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
        setSuccess('Supplier deleted successfully!');
        loadSuppliers();
        setTimeout(() => setSuccess(''), 2000);
      } catch (err) {
        setError('Failed to delete supplier');
        console.error(err);
      }
    }
  };

  const handleExportCSV = () => {
    const csv = suppliers
      .map((s) => `"${s.name}","${s.phone}","${s.address}"`)
      .join('\n');
    const header = '"Name","Phone","Address"\n';
    const element = document.createElement('a');
    element.setAttribute(
      'href',
      'data:text/csv;charset=utf-8,' + encodeURIComponent(header + csv)
    );
    element.setAttribute('download', `suppliers_${new Date().toISOString().split('T')[0]}.csv`);
    element.click();
    setSuccess('Exported to CSV!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const handleExportExcel = () => {
    exportToExcel(suppliers, `suppliers_${new Date().toISOString().split('T')[0]}`);
    setSuccess('Exported to Excel!');
    setTimeout(() => setSuccess(''), 2000);
  };

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedData = await importFromCSV(file);
      const validSuppliers = importedData.filter((item: any) => item.name && item.phone);

      if (validSuppliers.length === 0) {
        setError('No valid suppliers found in file');
        return;
      }

      validSuppliers.forEach((supplier: any) => {
        try {
          db.prepare('INSERT OR IGNORE INTO suppliers (name, phone, address) VALUES (?, ?, ?)').run(
            supplier.name,
            supplier.phone || '',
            supplier.address || ''
          );
        } catch (err) {
          console.error('Error importing supplier:', err);
        }
      });

      loadSuppliers();
      setSuccess(`Successfully imported ${validSuppliers.length} suppliers!`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Failed to import CSV file');
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin">
          <Phone size={40} className="text-blue-500" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Suppliers</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Manage your supplier contacts and information
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={openAddModal}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-xl hover:shadow-lg flex items-center gap-2"
          >
            <Plus size={20} />
            Add Supplier
          </motion.button>
        </div>
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

      {/* Stats & Controls */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Suppliers</p>
            <p className="text-3xl font-bold text-gray-800 dark:text-gray-100">{suppliers.length}</p>
          </div>

          <div className="flex gap-2">
            <label className="relative cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                className="absolute opacity-0"
              />
              <span className="inline-flex px-4 py-2 bg-green-500 text-white font-semibold rounded-lg hover:bg-green-600 transition-colors items-center gap-2">
                <Download size={18} />
                Import CSV
              </span>
            </label>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExportCSV}
              className="px-4 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 flex items-center gap-2"
            >
              <Download size={18} />
              CSV
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleExportExcel}
              className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Download size={18} />
              Excel
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by name, phone, or address..."
          className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </motion.div>

      {/* Suppliers Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <AnimatePresence>
          {filteredSuppliers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="lg:col-span-3 bg-white dark:bg-slate-800 rounded-2xl p-12 text-center border border-gray-200 dark:border-slate-700"
            >
              <Phone size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {suppliers.length === 0
                  ? 'No suppliers yet. Add your first supplier!'
                  : 'No suppliers match your search.'}
              </p>
              {suppliers.length === 0 && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={openAddModal}
                  className="px-6 py-2 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 inline-flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add First Supplier
                </motion.button>
              )}
            </motion.div>
          ) : (
            filteredSuppliers.map((supplier, index) => (
              <motion.div
                key={supplier.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-shadow"
              >
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 truncate">
                    {supplier.name}
                  </h3>

                  <div className="space-y-3">
                    {supplier.phone && (
                      <div className="flex items-center gap-3">
                        <Phone size={18} className="text-blue-500 flex-shrink-0" />
                        <a
                          href={`tel:${supplier.phone}`}
                          className="text-blue-600 dark:text-blue-400 hover:underline break-all"
                        >
                          {supplier.phone}
                        </a>
                      </div>
                    )}

                    {supplier.address && (
                      <div className="flex gap-3">
                        <MapPin size={18} className="text-green-500 flex-shrink-0 mt-1" />
                        <p className="text-gray-600 dark:text-gray-400 text-sm break-words">
                          {supplier.address}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-slate-700">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => openEditModal(supplier)}
                      className="flex-1 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-semibold rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-2"
                    >
                      <Edit size={16} />
                      Edit
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleDelete(supplier.id, supplier.name)}
                      className="flex-1 px-3 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2"
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
      </motion.div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowModal(false);
              resetForm();
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
                  {isEditing ? 'Edit Supplier' : 'Add New Supplier'}
                </h2>
                <motion.button
                  whileHover={{ rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full"
                >
                  <X size={24} className="text-gray-600 dark:text-gray-400" />
                </motion.button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Supplier Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., ABC Supplies"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g., +20-123-456-7890"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Address (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="e.g., 123 Main St, Cairo"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-3 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSubmit}
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition-shadow"
                  >
                    {isEditing ? 'Update Supplier' : 'Add Supplier'}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="w-full bg-gray-200 dark:bg-slate-700 text-gray-800 dark:text-gray-100 font-bold py-3 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
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

export default Suppliers;
