import React, { useState, useEffect } from 'react';
import db from '../db/database';
import { useAuth } from '../contexts/AuthContext';
import { useCSV } from '../hooks/useCSV';
import { useExcelExport } from '../hooks/useExcelExport';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Download, Upload, Search, X, Check, Phone, MapPin, Users } from 'react-feather';

interface Customer {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  is_installment_customer?: boolean;
}

const Customers: React.FC = () => {
  const { user } = useAuth();
  const { exportToCSV, importFromCSV } = useCSV();
  const { exportToExcel } = useExcelExport();

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    is_installment_customer: false,
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = () => {
    const allCustomers = db.prepare('SELECT * FROM customers').all() as Customer[];
    setCustomers(allCustomers);
  };

  const handleSaveCustomer = () => {
    if (!formData.name) {
      alert('Please enter customer name');
      return;
    }

    try {
      if (editingCustomer) {
        db.prepare(`
          UPDATE customers 
          SET name = ?, phone = ?, address = ?, is_installment_customer = ?
          WHERE id = ?
        `).run(
          formData.name,
          formData.phone,
          formData.address,
          formData.is_installment_customer ? 1 : 0,
          editingCustomer.id
        );
      } else {
        db.prepare(`
          INSERT INTO customers (name, phone, address, is_installment_customer)
          VALUES (?, ?, ?, ?)
        `).run(
          formData.name,
          formData.phone,
          formData.address,
          formData.is_installment_customer ? 1 : 0
        );
      }
      loadCustomers();
      resetForm();
      setShowModal(false);
    } catch (error) {
      alert('Error saving customer: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      address: customer.address || '',
      is_installment_customer: customer.is_installment_customer || false,
    });
    setShowModal(true);
  };

  const handleDeleteCustomer = (id: number) => {
    if (window.confirm('Are you sure you want to delete this customer?')) {
      try {
        db.prepare('DELETE FROM customers WHERE id = ?').run(id);
        loadCustomers();
      } catch (error) {
        alert('Error deleting customer');
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      address: '',
      is_installment_customer: false,
    });
    setEditingCustomer(null);
  };

  const handleExportCSV = () => {
    exportToCSV(filteredCustomers, 'customers');
  };

  const handleExportExcel = () => {
    exportToExcel(filteredCustomers, 'customers');
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
              INSERT INTO customers (name, phone, address, is_installment_customer)
              VALUES (?, ?, ?, ?)
            `).run(
              row.name,
              row.phone || '',
              row.address || '',
              row.is_installment_customer ? 1 : 0
            );
            successCount++;
          } catch (error) {
            // Silently skip duplicate or invalid rows
          }
        }
      });

      alert(`Successfully imported ${successCount} customers`);
      loadCustomers();
    } catch (error) {
      alert('Error importing CSV: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }

    event.target.value = '';
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.phone && c.phone.includes(searchTerm))
  );

  const installmentCustomers = customers.filter(c => c.is_installment_customer).length;

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
            Customers
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Manage customer relationships</p>
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
          Add Customer
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
          <p className="text-gray-600 dark:text-gray-400 text-sm font-medium">Total Customers</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-white mt-2">{customers.length}</p>
        </motion.div>
        <motion.div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-xl p-6 shadow-lg border border-blue-200 dark:border-blue-900">
          <p className="text-blue-700 dark:text-blue-400 text-sm font-medium flex items-center gap-2">
            <Users size={16} />
            Regular Customers
          </p>
          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 mt-2">{customers.length - installmentCustomers}</p>
        </motion.div>
        <motion.div className="bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-xl p-6 shadow-lg border border-green-200 dark:border-green-900">
          <p className="text-green-700 dark:text-green-400 text-sm font-medium">Installment Customers</p>
          <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">{installmentCustomers}</p>
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
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
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

      {/* Customers Table */}
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
                <th className="px-6 py-4 text-left text-gray-800 dark:text-white font-semibold">Address</th>
                <th className="px-6 py-4 text-center text-gray-800 dark:text-white font-semibold">Installment</th>
                <th className="px-6 py-4 text-center text-gray-800 dark:text-white font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              <AnimatePresence>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-600 dark:text-gray-400">
                      No customers found
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((customer) => (
                    <motion.tr
                      key={customer.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-gray-800 dark:text-white font-semibold">{customer.name}</td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        {customer.phone ? (
                          <>
                            <Phone size={16} className="text-blue-500" />
                            {customer.phone}
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-400 flex items-center gap-2">
                        {customer.address ? (
                          <>
                            <MapPin size={16} className="text-blue-500" />
                            {customer.address}
                          </>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {customer.is_installment_customer ? (
                          <span className="px-3 py-1 bg-green-500/20 text-green-700 dark:text-green-400 rounded-full text-sm font-semibold">
                            Yes
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-400 rounded-full text-sm font-semibold">
                            No
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex gap-2 justify-center">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleEditCustomer(customer)}
                            className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all"
                          >
                            <Edit2 size={18} />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => handleDeleteCustomer(customer.id)}
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
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-300">
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
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
                    placeholder="Customer name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Phone number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Address</label>
                  <textarea
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full p-3 border border-gray-200 dark:border-slate-600 rounded-lg bg-gray-50 dark:bg-slate-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Address"
                    rows={3}
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <input
                    type="checkbox"
                    checked={formData.is_installment_customer}
                    onChange={e => setFormData({ ...formData, is_installment_customer: e.target.checked })}
                    className="w-5 h-5 text-blue-500 cursor-pointer"
                  />
                  <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                    Enable installment payments for this customer
                  </label>
                </div>

                <div className="flex gap-3 pt-6">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveCustomer}
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

export default Customers;
