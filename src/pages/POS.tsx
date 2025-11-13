import React, { useState, useEffect } from 'react';
import db from '../db/database';
import { useAuth } from '../contexts/AuthContext';
import jsPDF from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingCart, Trash2, Download, Printer, Plus, Minus, X, ChevronDown, CreditCard, DollarSign, CheckCircle } from 'react-feather';

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
  const [categories, setCategories] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [downPayment, setDownPayment] = useState(0);
  const [installmentMonths, setInstallmentMonths] = useState(3);
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastInvoiceId, setLastInvoiceId] = useState<number | null>(null);

  const appTypeResult = db.prepare('SELECT value FROM settings WHERE key = ?').get('app_type') as Setting;
  const appType = appTypeResult?.value || 'supermarket';

  useEffect(() => {
    const allProducts = db.prepare('SELECT * FROM products').all() as Product[];
    const allCustomers = db.prepare('SELECT * FROM customers').all() as Customer[];
    const allCategories = db.prepare('SELECT * FROM categories').all() as any[];
    setProducts(allProducts);
    setCustomers(allCustomers);
    setCategories(allCategories);
  }, []);

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.barcode && p.barcode.includes(searchTerm));
    const matchesCategory = selectedCategory === null || p.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

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
        if (value <= 0 && field === 'quantity') {
          return item;
        }
        return { ...item, [field]: Math.max(0, value) };
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
    const result = db.prepare(`
      INSERT INTO invoices (customer_id, user_id, total, payment_method, down_payment, installment_percentage)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(selectedCustomer || null, user?.id, total, paymentMethod, downPayment, installmentMonths);

    const invoiceId = Number((result as any).lastID || result);
    setLastInvoiceId(invoiceId);

    cart.forEach(item => {
      db.prepare(`
        INSERT INTO invoice_items (invoice_id, product_id, quantity, price, discount, tax)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(invoiceId, item.id, item.quantity, item.price, item.discount, item.tax);
      
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.id);
    });

    // Create installment schedule if applicable
    if (paymentMethod === 'installment' && installmentMonths > 0) {
      const remainingAmount = total - downPayment;
      const monthlyPayment = remainingAmount / installmentMonths;
      
      for (let i = 1; i <= installmentMonths; i++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + i);
        
        db.prepare(`
          INSERT INTO installment_payments (invoice_id, due_date, amount, status)
          VALUES (?, ?, ?, ?)
        `).run(invoiceId, dueDate.toISOString().split('T')[0], monthlyPayment, 'due');
      }
    }

    generateAndPrintInvoice(invoiceId);
    
    setCart([]);
    setSelectedCustomer(null);
    setDownPayment(0);
    setPaymentMethod('cash');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const generateAndPrintInvoice = (invoiceId: number) => {
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as Invoice;
    const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoiceId) as InvoiceItem[];
    const customer = selectedCustomer ? (db.prepare('SELECT * FROM customers WHERE id = ?').get(selectedCustomer) as Customer) : null;

    const doc = new jsPDF();
    let yPosition = 20;

    // Header
    doc.setFontSize(18);
    doc.setTextColor(59, 130, 246);
    doc.text('INVOICE', doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });
    doc.setTextColor(0);
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
    doc.line(20, yPosition, 190, yPosition);
    yPosition += 5;

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
    doc.setFontSize(12);
    doc.text(`Total: ${invoice.total.toFixed(2)} EGP`, 190, yPosition, { align: 'right' });
    yPosition += 10;

    if (downPayment > 0) {
      doc.setFontSize(10);
      doc.text(`Down Payment: ${downPayment.toFixed(2)} EGP`, 190, yPosition, { align: 'right' });
      yPosition += 7;
      doc.text(`Remaining: ${(invoice.total - downPayment).toFixed(2)} EGP`, 190, yPosition, { align: 'right' });
    }

    // Footer
    yPosition = doc.internal.pageSize.getHeight() - 20;
    doc.setFontSize(8);
    doc.text('Thank you for your purchase!', doc.internal.pageSize.getWidth() / 2, yPosition, { align: 'center' });

    // Print/Download
    const pdfData = doc.output('datauristring');
    const printWindow = window.open(pdfData);
    if (printWindow) {
      setTimeout(() => printWindow.print(), 250);
    }
  };

  return (
    <div className="p-8 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 min-h-screen">
      {/* Success Notification */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50"
          >
            <CheckCircle size={20} />
            Transaction completed successfully!
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Product Selection */}
        <div className="lg:col-span-2">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent dark:from-blue-400 dark:to-blue-300 mb-2">
              Point of Sale
            </h1>
            <p className="text-gray-600 dark:text-gray-400">Select products to add to cart</p>
          </motion.div>

          {/* Search & Filter */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-100 dark:border-slate-700 mb-6"
          >
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search product by name or barcode..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
                />
              </div>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
                className="px-4 py-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </motion.div>

          {/* Products Grid */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-2 md:grid-cols-3 gap-4"
          >
            <AnimatePresence>
              {filteredProducts.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-white dark:bg-slate-800 rounded-xl">
                  <p className="text-gray-600 dark:text-gray-400">No products found</p>
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <motion.button
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    onClick={() => addToCart(product)}
                    disabled={product.stock <= 0}
                    className={`p-4 rounded-lg text-left transition-all ${
                      product.stock <= 0
                        ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 opacity-60 cursor-not-allowed'
                        : 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-600'
                    }`}
                  >
                    <h3 className="font-semibold text-gray-800 dark:text-white text-sm mb-1 truncate">{product.name}</h3>
                    <p className="text-blue-600 dark:text-blue-400 font-bold text-lg mb-2">{product.price.toFixed(2)} EGP</p>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold ${
                        product.stock <= 0
                          ? 'text-red-600'
                          : product.stock < 5
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      }`}>
                        {product.stock} in stock
                      </span>
                      <Plus size={16} className="text-blue-500" />
                    </div>
                  </motion.button>
                ))
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Right: Cart & Checkout */}
        <div className="lg:col-span-1">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden sticky top-8"
          >
            {/* Cart Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart size={24} />
                <h2 className="text-xl font-bold">Shopping Cart</h2>
              </div>
              <p className="text-blue-100 text-sm">{cart.length} items</p>
            </div>

            {/* Cart Items */}
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 max-h-64 overflow-y-auto">
              <AnimatePresence>
                {cart.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart size={32} className="mx-auto text-gray-400 mb-2" />
                    <p className="text-gray-600 dark:text-gray-400 text-sm">Cart is empty</p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="mb-4 pb-4 border-b border-gray-200 dark:border-slate-700 last:border-0"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-white text-sm">{item.name}</p>
                          <p className="text-gray-600 dark:text-gray-400 text-xs">{item.price.toFixed(2)} EGP</p>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <X size={16} />
                        </motion.button>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          onClick={() => updateCartItem(item.id, 'quantity', item.quantity - 1)}
                          className="p-1 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded"
                        >
                          <Minus size={14} />
                        </motion.button>
                        <span className="flex-1 text-center text-sm font-semibold text-gray-800 dark:text-white">
                          {item.quantity}
                        </span>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          onClick={() => updateCartItem(item.id, 'quantity', item.quantity + 1)}
                          className="p-1 bg-gray-200 dark:bg-slate-700 hover:bg-gray-300 dark:hover:bg-slate-600 rounded"
                        >
                          <Plus size={14} />
                        </motion.button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="text-gray-600 dark:text-gray-400">Discount %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount}
                            onChange={(e) => updateCartItem(item.id, 'discount', parseInt(e.target.value) || 0)}
                            className="w-full p-1 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded text-gray-800 dark:text-white"
                          />
                        </div>
                        <div>
                          <label className="text-gray-600 dark:text-gray-400">Tax %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={item.tax}
                            onChange={(e) => updateCartItem(item.id, 'tax', parseInt(e.target.value) || 0)}
                            className="w-full p-1 bg-gray-100 dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded text-gray-800 dark:text-white"
                          />
                        </div>
                      </div>

                      <div className="text-right mt-2">
                        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          {(
                            item.price * item.quantity * (1 - item.discount / 100) * (1 + item.tax / 100)
                          ).toFixed(2)} EGP
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {/* Customer Selection */}
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <label className="block text-sm font-semibold text-gray-800 dark:text-white mb-2">Customer</label>
              <select
                value={selectedCustomer || ''}
                onChange={(e) => setSelectedCustomer(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full p-2.5 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
              >
                <option value="">Walk-in Customer</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>{customer.name}</option>
                ))}
              </select>
            </div>

            {/* Payment Method */}
            <div className="p-6 border-b border-gray-200 dark:border-slate-700">
              <label className="block text-sm font-semibold text-gray-800 dark:text-white mb-2">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <DollarSign size={18} />
                  Cash
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                    paymentMethod === 'card'
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-slate-600'
                  }`}
                >
                  <CreditCard size={18} />
                  Card
                </motion.button>
              </div>

              {paymentMethod === 'installment' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg"
                >
                  <label className="block text-sm font-semibold text-gray-800 dark:text-white mb-2">Down Payment</label>
                  <input
                    type="number"
                    min="0"
                    value={downPayment}
                    onChange={(e) => setDownPayment(parseFloat(e.target.value) || 0)}
                    className="w-full p-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-800 dark:text-white"
                  />
                  <label className="block text-sm font-semibold text-gray-800 dark:text-white mt-3 mb-2">Installment Months</label>
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={installmentMonths}
                    onChange={(e) => setInstallmentMonths(parseInt(e.target.value) || 1)}
                    className="w-full p-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg text-gray-800 dark:text-white"
                  />
                </motion.div>
              )}
            </div>

            {/* Total */}
            <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-slate-700 dark:to-slate-800">
              <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Subtotal</p>
                <p className="text-2xl font-bold text-gray-800 dark:text-white">
                  {calculateTotal().toFixed(2)} EGP
                </p>
              </div>

              {/* Checkout Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className={`w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all ${
                  cart.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl'
                }`}
              >
                <Printer size={20} />
                Checkout & Print
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setCart([])}
                disabled={cart.length === 0}
                className="w-full py-3 mt-3 rounded-lg font-bold bg-red-500 hover:bg-red-600 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear Cart
              </motion.button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default POS;
