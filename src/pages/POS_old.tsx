import React, { useState, useEffect } from 'react';
import db from '../db/database';
import { useAuth } from '../contexts/AuthContext';
import jsPDF from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingCart, Trash2, Download, Printer, Plus, Minus, X } from 'react-feather';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category_id?: number;
  barcode?: string;
}

interface Customer {
  id: number;
  name: string;
  phone?: string;
  address?: string;
  is_installment_customer?: boolean;
}

interface CartItem extends Product {
  quantity: number;
  discount: number;
  tax: number;
}

interface Invoice {
  id: number;
  created_at: string;
  total: number;
}

interface InvoiceItem {
  id: number;
  product_id: number;
  quantity: number;
  price: number;
  discount: number;
  tax: number;
}

interface Setting {
  value: string;
}

const POS: React.FC = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [downPayment, setDownPayment] = useState(0);
  const [installmentPercentage, setInstallmentPercentage] = useState(0);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const appTypeResult = db.prepare('SELECT value FROM settings WHERE key = ?').get('app_type') as Setting;
  const appType = appTypeResult?.value || 'supermarket';

  useEffect(() => {
    const allProducts = db.prepare('SELECT * FROM products').all() as Product[];
    const allCustomers = db.prepare('SELECT * FROM customers').all() as Customer[];
    setProducts(allProducts);
    setCustomers(allCustomers);
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const addToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert('Product is out of stock');
      return;
    }
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        setCart(cart.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        ));
      } else {
        alert('Cannot add more, insufficient stock');
      }
    } else {
      setCart([...cart, { ...product, quantity: 1, discount: 0, tax: 0 }]);
    }
  };

  const updateCartItem = (id: number, field: keyof CartItem, value: number) => {
    setCart(cart.map(item => {
      if (item.id === id) {
        if (field === 'quantity' && value > item.stock) {
          return item;
        }
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => {
      const itemTotal = item.price * item.quantity;
      const discountedTotal = itemTotal - (itemTotal * (item.discount / 100));
      const taxedTotal = discountedTotal + (discountedTotal * (item.tax / 100));
      return total + taxedTotal;
    }, 0);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }

    const total = calculateTotal();
    const invoiceId = db.prepare(`
      INSERT INTO invoices (customer_id, user_id, total, payment_method, down_payment, installment_percentage)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(selectedCustomer || null, user?.id, total, paymentMethod, appType === 'installment' ? downPayment : 0, appType === 'installment' ? installmentPercentage : 0).lastInsertRowid;

    cart.forEach(item => {
      db.prepare(`
        INSERT INTO invoice_items (invoice_id, product_id, quantity, price, discount, tax)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(invoiceId, item.id, item.quantity, item.price, item.discount, item.tax);
      
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.id);
    });

    // Create installment schedule if applicable
    if (appType === 'installment' && installmentPercentage > 0) {
      const remainingAmount = total - downPayment;
      const monthlyPayment = remainingAmount / (installmentPercentage);
      
      for (let i = 1; i <= installmentPercentage; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i);
        
        db.prepare(`
          INSERT INTO installment_payments (invoice_id, due_date, amount, status)
          VALUES (?, ?, ?, ?)
        `).run(invoiceId, dueDate.toISOString().split('T')[0], monthlyPayment, 'due');
      }
    }

    generateAndPrintInvoice(Number(invoiceId));
    setCart([]);
    setSelectedCustomer(null);
    setDownPayment(0);
    setInstallmentPercentage(0);
  };

  const generateAndPrintInvoice = (invoiceId: number) => {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as Invoice;
    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoiceId) as InvoiceItem[];
    const customer = selectedCustomer ? (db.prepare('SELECT * FROM customers WHERE id = ?').get(selectedCustomer) as Customer) : null;

    const doc = new jsPDF();
    let yPosition = 20;

    // Header
    doc.setFontSize(18);
    doc.text('INVOICE', doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
    yPosition += 15;

    // Invoice details
    doc.setFontSize(10);
    doc.text(`Invoice #${invoice.id}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Time: ${new Date(invoice.created_at).toLocaleTimeString()}`, 20, yPosition);
    yPosition += 7;
    doc.text(`Cashier: ${user?.username}`, 20, yPosition);
    yPosition += 15;

    // Customer info
    if (customer) {
      doc.text(`Customer: ${customer.name}`, 20, yPosition);
      yPosition += 7;
      if (customer.phone) {
        doc.text(`Phone: ${customer.phone}`, 20, yPosition);
        yPosition += 7;
      }
      yPosition += 5;
    }

    // Items header
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Item', 20, yPosition);
    doc.text('Qty', 80, yPosition);
    doc.text('Price', 110, yPosition);
    doc.text('Discount', 140, yPosition);
    doc.text('Tax', 170, yPosition);
    doc.text('Total', 190, yPosition, { align: 'right' });
    yPosition += 7;

    // Items
    doc.setFont('helvetica', 'normal');
    items.forEach(item => {
      const product = products.find(p => p.id === item.product_id);
      const itemTotal = item.price * item.quantity;
      const discounted = itemTotal - (itemTotal * (item.discount / 100));
      const final = discounted + (discounted * (item.tax / 100));

      doc.text(product?.name || 'Unknown', 20, yPosition);
      doc.text(item.quantity.toString(), 80, yPosition);
      doc.text(item.price.toFixed(2), 110, yPosition);
      doc.text(`${item.discount}%`, 140, yPosition);
      doc.text(`${item.tax}%`, 170, yPosition);
      doc.text(final.toFixed(2), 190, yPosition, { align: 'right' });
      yPosition += 7;
    });

    yPosition += 5;
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 7;

    // Totals
    doc.setFont('helvetica', 'bold');
    doc.text(`Total: ${invoice.total.toFixed(2)}`, 190, yPosition, { align: 'right' });
    yPosition += 7;

    if (appType === 'installment' && downPayment > 0) {
      doc.text(`Down Payment: ${downPayment.toFixed(2)}`, 190, yPosition, { align: 'right' });
      yPosition += 7;
      doc.text(`Remaining: ${(invoice.total - downPayment).toFixed(2)}`, 190, yPosition, { align: 'right' });
    }

    // Footer
    yPosition = doc.internal.pageSize.getHeight() - 20;
    doc.setFontSize(8);
    doc.text('Thank you for your purchase!', doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });

    // Print/Download
    const pdfData = doc.output('datauristring');
    const printWindow = window.open(pdfData);
    if (printWindow) {
      printWindow.print();
    }
  };

  const downloadInvoicePDF = () => {
    if (cart.length === 0) {
      alert('Cart is empty');
      return;
    }
    // This would be called after checkout
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.barcode && p.barcode.includes(searchTerm))
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="flex h-full gap-4 bg-gradient-to-br from-gray-100 to-blue-100 dark:from-gray-800 dark:to-blue-900 p-4 rounded-xl">
      {/* Products Section */}
      <motion.div className="flex-1 flex flex-col bg-white/30 dark:bg-black/30 backdrop-blur-md rounded-xl p-4 shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Products</h2>
        
        <motion.div className="relative mb-4">
          <Search className="absolute left-3 top-3 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search by name or barcode..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full pl-10 pr-4 py-2 bg-white/50 dark:bg-black/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </motion.div>

        <motion.div 
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 overflow-y-auto flex-1"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {filteredProducts.map(product => (
            <motion.button
              key={product.id}
              variants={itemVariants}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => addToCart(product)}
              disabled={product.stock <= 0}
              className={`p-3 rounded-lg transition-all ${
                product.stock <= 0
                  ? 'bg-gray-400 opacity-50 cursor-not-allowed'
                  : 'bg-white/40 dark:bg-black/40 hover:bg-blue-500/40 cursor-pointer shadow-neumorphic-light dark:shadow-neumorphic-dark'
              }`}
            >
              <p className="font-bold text-sm text-gray-800 dark:text-white truncate">{product.name}</p>
              <p className="text-xs text-gray-600 dark:text-gray-300">{product.price.toFixed(2)} EGP</p>
              <p className={`text-xs ${product.stock <= 0 ? 'text-red-500' : 'text-green-500'}`}>
                Stock: {product.stock}
              </p>
            </motion.button>
          ))}
        </motion.div>
      </motion.div>

      {/* Cart Section */}
      <motion.div className="w-80 flex flex-col bg-white/30 dark:bg-black/30 backdrop-blur-md rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <ShoppingCart size={24} />
            Cart
          </h2>
          <span className="bg-blue-500/70 text-white px-3 py-1 rounded-full text-sm font-bold">
            {cart.length}
          </span>
        </div>

        {/* Customer Selection */}
        {appType === 'installment' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCustomerModal(true)}
            className="w-full mb-4 p-2 bg-blue-500/70 text-white rounded-lg font-semibold text-sm hover:bg-blue-600/70"
          >
            {selectedCustomer ? `Customer: ${customers.find(c => c.id === selectedCustomer)?.name}` : 'Select Customer'}
          </motion.button>
        )}

        {/* Cart Items */}
        <motion.div className="flex-1 overflow-y-auto mb-4 space-y-2">
          <AnimatePresence>
            {cart.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="flex items-center justify-center h-full text-gray-500"
              >
                <div className="text-center">
                  <ShoppingCart size={48} className="mx-auto mb-2 opacity-50" />
                  <p>Cart is empty</p>
                </div>
              </motion.div>
            ) : (
              cart.map((item) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="bg-white/40 dark:bg-black/40 p-2 rounded-lg"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-bold text-sm text-gray-800 dark:text-white">{item.name}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-300">{item.price.toFixed(2)} EGP</p>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.8 }}
                      onClick={() => removeFromCart(item.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X size={16} />
                    </motion.button>
                  </div>

                  <div className="grid grid-cols-3 gap-1 mb-2">
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400">Qty</label>
                      <input
                        type="number"
                        min="1"
                        max={item.stock}
                        value={item.quantity}
                        onChange={e => updateCartItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                        className="w-full p-1 bg-white/70 dark:bg-black/70 border border-gray-300 dark:border-gray-600 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400">Discount %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.discount}
                        onChange={e => updateCartItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                        className="w-full p-1 bg-white/70 dark:bg-black/70 border border-gray-300 dark:border-gray-600 rounded text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 dark:text-gray-400">Tax %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={item.tax}
                        onChange={e => updateCartItem(item.id, 'tax', parseFloat(e.target.value) || 0)}
                        className="w-full p-1 bg-white/70 dark:bg-black/70 border border-gray-300 dark:border-gray-600 rounded text-xs"
                      />
                    </div>
                  </div>

                  <div className="text-right text-xs font-semibold text-blue-600 dark:text-blue-400">
                    {(item.price * item.quantity * (1 - item.discount / 100) * (1 + item.tax / 100)).toFixed(2)} EGP
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </motion.div>

        {/* Payment Section */}
        <motion.div className="border-t border-gray-300 dark:border-gray-600 pt-4 space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Payment Method</label>
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-full p-2 bg-white/70 dark:bg-black/70 border border-gray-300 dark:border-gray-600 rounded text-sm"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="multi">Multi Payment</option>
            </select>
          </div>

          {appType === 'installment' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Down Payment</label>
                  <input
                    type="number"
                    min="0"
                    value={downPayment}
                    onChange={e => setDownPayment(parseFloat(e.target.value) || 0)}
                    className="w-full p-2 bg-white/70 dark:bg-black/70 border border-gray-300 dark:border-gray-600 rounded text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400">Installments</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    value={installmentPercentage}
                    onChange={e => setInstallmentPercentage(parseInt(e.target.value) || 0)}
                    className="w-full p-2 bg-white/70 dark:bg-black/70 border border-gray-300 dark:border-gray-600 rounded text-sm"
                  />
                </div>
              </div>
            </>
          )}

          {cart.length > 0 && (
            <div className="bg-white/50 dark:bg-black/50 p-3 rounded-lg">
              <div className="flex justify-between mb-2 text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                <span className="font-semibold">{calculateTotal().toFixed(2)} EGP</span>
              </div>
              {appType === 'installment' && downPayment > 0 && (
                <>
                  <div className="flex justify-between mb-2 text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Down:</span>
                    <span className="font-semibold text-green-600">{downPayment.toFixed(2)} EGP</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Remaining:</span>
                    <span className="font-semibold text-orange-600">{(calculateTotal() - downPayment).toFixed(2)} EGP</span>
                  </div>
                </>
              )}
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className={`w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all ${
              cart.length === 0
                ? 'bg-gray-400 cursor-not-allowed opacity-50'
                : 'bg-green-500/70 hover:bg-green-600/70 shadow-neumorphic-light dark:shadow-neumorphic-dark'
            }`}
          >
            <Printer size={20} />
            Checkout & Print
          </motion.button>
        </motion.div>
      </motion.div>

      {/* Customer Modal */}
      <AnimatePresence>
        {showCustomerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowCustomerModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={e => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 w-96 max-h-96 overflow-y-auto"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Select Customer</h3>
                <button
                  onClick={() => setShowCustomerModal(false)}
                  className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"
                >
                  <X size={24} />
                </button>
              </div>

              <button
                onClick={() => {
                  setSelectedCustomer(null);
                  setShowCustomerModal(false);
                }}
                className="w-full p-2 mb-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-800 dark:text-white font-semibold"
              >
                Walk-in Customer
              </button>

              {customers.map(customer => (
                <motion.button
                  key={customer.id}
                  whileHover={{ x: 5 }}
                  onClick={() => {
                    setSelectedCustomer(customer.id);
                    setShowCustomerModal(false);
                  }}
                  className="w-full p-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-800 dark:text-white"
                >
                  <p className="font-semibold">{customer.name}</p>
                  {customer.phone && <p className="text-xs text-gray-600 dark:text-gray-400">{customer.phone}</p>}
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default POS;
