import React, { useState, useEffect } from 'react';
import db from '../db/database';
import { useAuth } from '../contexts/AuthContext';
import jsPDF from 'jspdf';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, ShoppingCart, Trash2, Plus, Minus, X, CreditCard, DollarSign, CheckCircle, Printer } from 'react-feather';

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
}

interface CartItem extends Product {
  quantity: number;
  discount: number;
  tax: number;
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
  const [showSuccess, setShowSuccess] = useState(false);

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
        if (field === 'quantity' && value > item.stock) return item;
        if (value <= 0 && field === 'quantity') return item;
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
    `).run(selectedCustomer || null, user?.id, total, paymentMethod, 0, 0);

    const invoiceId = Number((result as any).lastID || result);

    cart.forEach(item => {
      db.prepare(`
        INSERT INTO invoice_items (invoice_id, product_id, quantity, price, discount, tax)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(invoiceId, item.id, item.quantity, item.price, item.discount, item.tax);
      
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.id);
    });

    generateInvoice(invoiceId);
    
    setCart([]);
    setSelectedCustomer(null);
    setPaymentMethod('cash');
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
  };

  const generateInvoice = (invoiceId: number) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('INVOICE', 105, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Invoice #${invoiceId}`, 20, 40);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 50);
    doc.text(`Cashier: ${user?.username}`, 20, 60);
    
    let y = 80;
    cart.forEach(item => {
      const total = item.price * item.quantity * (1 - item.discount / 100) * (1 + item.tax / 100);
      doc.text(`${item.name} x${item.quantity} - ${total.toFixed(2)} EGP`, 20, y);
      y += 10;
    });
    
    doc.text(`Total: ${calculateTotal().toFixed(2)} EGP`, 20, y + 10);
    
    const pdfData = doc.output('datauristring');
    const printWindow = window.open(pdfData);
    if (printWindow) {
      setTimeout(() => printWindow.print(), 250);
    }
  };

  return (
    <div className="p-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Search & Filter */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-100">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
                className="px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Products Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filteredProducts.length === 0 ? (
              <div className="col-span-full bg-white rounded-lg p-12 text-center">
                <p className="text-gray-500">No products found</p>
              </div>
            ) : (
              filteredProducts.map((product) => (
                <motion.button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={product.stock <= 0}
                  className={`p-4 rounded-lg text-left transition-all ${
                    product.stock <= 0
                      ? 'bg-red-50 border border-red-200 opacity-60 cursor-not-allowed'
                      : 'bg-white border border-gray-200 hover:shadow-md hover:border-blue-300'
                  }`}
                  whileHover={product.stock > 0 ? { scale: 1.02 } : {}}
                  whileTap={product.stock > 0 ? { scale: 0.98 } : {}}
                >
                  <h3 className="font-semibold text-gray-900 text-sm mb-1 truncate">{product.name}</h3>
                  <p className="text-blue-600 font-bold text-lg mb-2">${product.price.toFixed(2)}</p>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-semibold ${
                      product.stock <= 0 ? 'text-red-600' : product.stock < 5 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {product.stock} in stock
                    </span>
                    {product.stock > 0 && <Plus size={16} className="text-blue-500" />}
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </div>

        {/* Cart Section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 sticky top-6">
            {/* Cart Header */}
            <div className="bg-blue-600 text-white p-6 rounded-t-lg">
              <div className="flex items-center gap-2 mb-2">
                <ShoppingCart size={24} />
                <h2 className="text-xl font-bold">Cart</h2>
              </div>
              <p className="text-blue-100 text-sm">{cart.length} items</p>
            </div>

            {/* Cart Items */}
            <div className="p-6 max-h-64 overflow-y-auto">
              {cart.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart size={32} className="mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500 text-sm">Cart is empty</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="pb-4 border-b border-gray-200 last:border-0">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                          <p className="text-gray-600 text-xs">${item.price.toFixed(2)}</p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <X size={16} />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={() => updateCartItem(item.id, 'quantity', item.quantity - 1)}
                          className="p-1 bg-gray-200 hover:bg-gray-300 rounded"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="flex-1 text-center text-sm font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateCartItem(item.id, 'quantity', item.quantity + 1)}
                          className="p-1 bg-gray-200 hover:bg-gray-300 rounded"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-semibold text-blue-600">
                          ${(item.price * item.quantity * (1 - item.discount / 100) * (1 + item.tax / 100)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Customer & Payment */}
            <div className="p-6 border-t border-gray-200 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Customer</label>
                <select
                  value={selectedCustomer || ''}
                  onChange={(e) => setSelectedCustomer(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full p-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Walk-in Customer</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>{customer.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">Payment Method</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    className={`p-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === 'cash'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <DollarSign size={18} />
                    Cash
                  </button>
                  <button
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
                      paymentMethod === 'card'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <CreditCard size={18} />
                    Card
                  </button>
                </div>
              </div>
            </div>

            {/* Total & Checkout */}
            <div className="p-6 bg-gray-50 rounded-b-lg">
              <div className="mb-4">
                <p className="text-gray-600 text-sm mb-1">Total</p>
                <p className="text-2xl font-bold text-gray-900">${calculateTotal().toFixed(2)}</p>
              </div>

              <button
                onClick={handleCheckout}
                disabled={cart.length === 0}
                className={`w-full py-3 rounded-lg font-bold text-white flex items-center justify-center gap-2 transition-all ${
                  cart.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                <Printer size={20} />
                Checkout & Print
              </button>

              <button
                onClick={() => setCart([])}
                disabled={cart.length === 0}
                className="w-full py-3 mt-3 rounded-lg font-bold bg-red-500 hover:bg-red-600 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Clear Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default POS;