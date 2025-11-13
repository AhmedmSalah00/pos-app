import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, Phone, MapPin, Download, Upload, Check, Search } from 'react-feather';
import db from '../db/database';
import { useCSV } from '../hooks/useCSV';
import { useExcelExport } from '../hooks/useExcelExport';

interface Supplier {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  email?: string;
}

const Suppliers: React.FC = () => {
  const { exportToCSV, importFromCSV } = useCSV();
  const { exportToExcel } = useExcelExport();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    email: '',
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = () => {
    const allSuppliers = db.prepare('SELECT * FROM suppliers').all() as Supplier[];
    setSuppliers(allSuppliers);
  };

  const handleSaveSupplier = () => {
    if (!formData.name) {
      alert('Please enter supplier name');
      return;
    }

    try {
      if (editingSupplier) {
        db.prepare(`
          UPDATE suppliers 
          SET name = ?, phone = ?, address = ?, email = ?
          WHERE id = ?
        `).run(
          formData.name,
          formData.phone,
          formData.address,
          formData.email,
          editingSupplier.id
        );
      } else {
        db.prepare(`
          INSERT INTO suppliers (name, phone, address, email)
          VALUES (?, ?, ?, ?)
        `).run(
          formData.name,
          formData.phone,
          formData.address,
          formData.email
        );
      }
      loadSuppliers();
      resetForm();
      setShowModal(false);
    } catch (error) {
      alert('Error saving supplier: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleEditSupplier = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      phone: supplier.phone || '',
      address: supplier.address || '',
      email: supplier.email || '',
    });
    setShowModal(true);
  };

  const handleDeleteSupplier = (id: number) => {
    if (window.confirm('Are you sure you want to delete this supplier?')) {
      try {
        db.prepare('DELETE FROM suppliers WHERE id = ?').run(id);
        loadSuppliers();
      } catch (error) {
        alert('Error deleting supplier');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      address: '',
      email: '',
    });
    setEditingSupplier(null);
  };

  const handleExportCSV = () => {
    exportToCSV(filteredSuppliers, 'suppliers');
  };

  const handleExportExcel = () => {
    exportToExcel(filteredSuppliers, 'suppliers');
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const data = await importFromCSV(file);
      let successCount = 0;

      data.forEach((row: any) => {
        if (row.name) {
          try {
            db.prepare(`
              INSERT INTO suppliers (name, phone, address, email)
              VALUES (?, ?, ?, ?)
            `).run(
              row.name,
              row.phone || '',
              row.address || '',
              row.email || ''
            );
            successCount++;
          } catch (error) {
            // Silently skip duplicate or invalid rows
          }
        }
      });

      alert(`Successfully imported ${successCount} suppliers`);
      loadSuppliers();
    } catch (error) {
      alert('Error importing CSV: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    event.target.value = '';
  };

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.phone && s.phone.includes(searchTerm)) ||
    (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 min-h-screen">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center mb-8"
      >
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent dark:from-orange-400 dark:to-orange-300">
            Suppliers
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage supplier information</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white px-6 py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          <Plus size={20} />
          Add Supplier
        </motion.button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
      >
        <motion.div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-lg border border-gray-100 dark:border-slate-700">
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Suppliers</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{suppliers.length}</p>
        </motion.div>
        <motion.div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-xl p-6 shadow-lg border border-orange-200 dark:border-orange-900">
          <p className="text-orange-700 dark:text-orange-400 text-sm font-medium">Active Suppliers</p>
          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400 mt-2">{suppliers.length}</p>
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
              placeholder="Search by name, phone, or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-800 dark:text-white"
            />
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
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
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

      {/* Suppliers Table */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-800 border-b border-gray-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4 text-left text-gray-800 dark:text-white font-semibold">Name</th>
                <th className="px-6 py-4 text-left text-gray-800 dark:text-white font-semibold">Phone</th>
                <th className="px-6 py-4 text-left text-gray-800 dark:text-white font-semibold">Email</th>
                <th className="px-6 py-4 text-left text-gray-800 dark:text-white font-semibold">Address</th>
                <th className="px-6 py-4 text-center text-gray-800 dark:text-white font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              <AnimatePresence>
                {filteredSuppliers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-600 dark:text-gray-400">
                      No suppliers found
                    </td>
                  </tr>
                ) : (
                  filteredSuppliers.map((supplier) => (
                    <motion.tr
                      key={supplier.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-gray-800 dark:text-white font-semibold">{supplier.name}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        {supplier.phone ? (
                          <>
                            <Phone size={16} className="text-orange-500" />
                            {supplier.phone}
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400">
                        {supplier.email || '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        {supplier.address ? (
                          <>
                            <MapPin size={16} className="text-orange-500" />
                            {supplier.address.length > 20 ? supplier.address.substring(0, 20) + '...' : supplier.address}
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleEditSupplier(supplier)}
                            className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-all"
                          >
                            <Edit2 size={18} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDeleteSupplier(supplier.id)}
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
                <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 bg-clip-text text-transparent dark:from-orange-400 dark:to-orange-300">
                  {editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}
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
                    className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Supplier name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Address</label>
                  <textarea
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
                    placeholder="Address"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-6">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveSupplier}
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

export default Suppliers;
