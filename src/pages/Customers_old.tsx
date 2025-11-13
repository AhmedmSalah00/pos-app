import React, { useState, useEffect } from 'react';
import db from '../db/database';
import { useAuth } from '../contexts/AuthContext';
import { useCSV } from '../hooks/useCSV';
import { useExcelExport } from '../hooks/useExcelExport';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Download, Upload, Search, X, Check, Phone, MapPin } from 'react-feather';

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
              row.is_installment_customer === 'true' || row.is_installment_customer === 1 ? 1 : 0
            );
            successCount++;
          } catch (error) {
            // Silently skip duplicate rows
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

  const installmentCustomerCount = customers.filter(c => c.is_installment_customer).length;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
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
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">Customers</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage customer information</p>
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
          Add Customer
        </motion.button>
      </motion.div>

      {/* Stats */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-3 gap-4 mb-6"
      >
        <div className="bg-white/30 dark:bg-black/30 backdrop-blur-md p-4 rounded-lg shadow-neumorphic-light dark:shadow-neumorphic-dark">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Total Customers</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-white">{customers.length}</p>
        </div>
        <div className="bg-blue-500/20 p-4 rounded-lg shadow-neumorphic-light dark:shadow-neumorphic-dark border border-blue-300 dark:border-blue-700">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Installment Customers</p>
          <p className="text-3xl font-bold text-blue-600">{installmentCustomerCount}</p>
        </div>
        <div className="bg-green-500/20 p-4 rounded-lg shadow-neumorphic-light dark:shadow-neumorphic-dark border border-green-300 dark:border-green-700">
          <p className="text-gray-600 dark:text-gray-400 text-sm">Regular Customers</p>
          <p className="text-3xl font-bold text-green-600">{customers.length - installmentCustomerCount}</p>
        </div>
      </motion.div>

      {/* Filters and Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/30 dark:bg-black/30 backdrop-blur-md p-4 rounded-lg shadow-neumorphic-light dark:shadow-neumorphic-dark mb-6"
      >
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/50 dark:bg-black/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-green-500/70 hover:bg-green-600/70 text-white px-4 py-2 rounded-lg font-semibold"
          >
            <Download size={18} />
            CSV
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-blue-500/70 hover:bg-blue-600/70 text-white px-4 py-2 rounded-lg font-semibold"
          >
            <Download size={18} />
            Excel
          </motion.button>

          <label className="flex items-center gap-2 bg-purple-500/70 hover:bg-purple-600/70 text-white px-4 py-2 rounded-lg font-semibold cursor-pointer">
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

      {/* Customers Grid */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <p className="text-gray-600 dark:text-gray-400 text-lg">No customers found</p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredCustomers.map((customer) => (
              <motion.div
                key={customer.id}
                variants={itemVariants}
                className="bg-white/30 dark:bg-black/30 backdrop-blur-md p-4 rounded-lg shadow-neumorphic-light dark:shadow-neumorphic-dark hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">{customer.name}</h3>
                    {customer.is_installment_customer && (
                      <span className="inline-block mt-1 px-2 py-1 bg-blue-500/30 text-blue-700 dark:text-blue-300 rounded text-xs font-semibold">
                        Installment Customer
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleEditCustomer(customer)}
                      className="p-2 bg-blue-500/70 hover:bg-blue-600/70 text-white rounded-lg"
                    >
                      <Edit2 size={16} />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDeleteCustomer(customer.id)}
                      className="p-2 bg-red-500/70 hover:bg-red-600/70 text-white rounded-lg"
                    >
                      <Trash2 size={16} />
                    </motion.button>
                  </div>
                </div>

                {customer.phone && (
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                    <Phone size={16} />
                    <span className="text-sm">{customer.phone}</span>
                  </div>
                )}

                {customer.address && (
                  <div className="flex items-start gap-2 text-gray-600 dark:text-gray-400">
                    <MapPin size={16} className="mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{customer.address}</span>
                  </div>
                )}
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
                  {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                </h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  onClick={() => setShowModal(false)}
                  className="text-gray-600 dark:text-gray-400"
                >
                  <X size={24} />
                </motion.button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Address</label>
                  <textarea
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    rows={3}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_installment_customer}
                    onChange={e => setFormData({ ...formData, is_installment_customer: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Installment Customer</span>
                </label>

                <div className="flex gap-2 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSaveCustomer}
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
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Customers;
