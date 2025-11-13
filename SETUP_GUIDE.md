# 🏪 POS Application - Complete Setup & Usage Guide

A modern, offline-first Point of Sale (POS) system built with React, TypeScript, and Electron. Perfect for Supermarkets, Installment Sales Outlets, and Warehouses.

## 📸 Features at a Glance

✅ **Multi-Purpose:** Support for Supermarket, Installment Sales, and Warehouse modes
✅ **Modern UI:** Soft Glass Neumorphism design with Dark/Light mode
✅ **Offline First:** Works completely offline, no internet required
✅ **Installment Management:** Track customer payments and schedules
✅ **Comprehensive Reports:** Sales, inventory, and expense tracking
✅ **CSV/Excel Export:** Export data for analysis
✅ **Invoice Printing:** Generate and print professional invoices
✅ **User Management:** Admin and Cashier roles with permissions
✅ **Animations:** Smooth Framer Motion transitions
✅ **Localization:** English and Arabic support ready
✅ **Desktop App:** Build to EXE with Electron
✅ **Secure:** Password hashing with bcrypt

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (with npm)
- Visual Studio Code (recommended)
- Electron (for desktop builds)

### Installation

1. **Clone/Open the Project**
```bash
cd pos-app
```

2. **Install Dependencies**
```bash
npm install
```

3. **Start Development Server**
```bash
npm run dev
```

The application will open at `http://localhost:5173`

---

## 🎯 First Launch Setup

1. **Select Application Type**
   - Supermarket
   - Installment Sales Outlet
   - Warehouse

2. **Login**
   - Username: `admin`
   - Password: `password`
   - (Change these in Settings → Users)

3. **Start Using**
   - Add products from the Products page
   - Create customers from the Customers page
   - Start making sales from the POS page

---

## 📦 Implemented Modules

### ✅ Complete
- **POS** - Invoice creation with customer selection, discounts, taxes, and installment support
- **Products** - Add/edit/delete products, CSV/Excel import/export, stock tracking
- **Customers** - Manage customers, installment customer flag, contact info
- **Categories** - Organize products by categories
- **Expenses** - Track business expenses with monthly charts
- **Dashboard** - Revenue summary, out-of-stock alerts, charts
- **Authentication** - Secure login with bcrypt
- **Database** - Complete SQLite schema with all required tables
- **UI/UX** - Neumorphic design, animations, dark/light mode

### ⏳ Ready to Implement
- **Installment Tracking** - Payment schedules, due/paid/overdue status
- **Returns** - Refund management, stock updates
- **Reports** - Sales reports, Excel/PDF export
- **Settings** - Language, currency, logo upload, printer settings
- **Users** - User management and permissions
- **Suppliers** - Supplier management
- **i18n** - Language switching (AR/EN)

---

## 🎨 Design System

### Colors
- **Primary:** Blue-500 (#3B82F6)
- **Success:** Green-500 (#10B981)
- **Warning:** Yellow-500 (#F59E0B)
- **Error:** Red-500 (#EF4444)
- **Background:** Gradient gray-100 to blue-100 (light), gray-800 to blue-900 (dark)

### Shadows
- **Light Mode:** Soft gray shadows
- **Dark Mode:** Darker, subtle shadows
- **Neumorphic:** Dual shadows for depth effect

### Typography
- **Headers:** Bold, readable
- **Body:** Clear sans-serif
- **Actions:** Clear CTAs with hover effects

---

## 💾 Database Structure

### Tables
- **users** - User accounts and roles
- **products** - Product inventory
- **categories** - Product categories
- **customers** - Customer information
- **suppliers** - Supplier details
- **invoices** - Sales transactions
- **invoice_items** - Line items per invoice
- **installment_payments** - Installment tracking
- **expenses** - Business expenses
- **returns** - Refunded items
- **settings** - App configuration

### Default Login
- Username: `admin`
- Password: `password` (hashed with bcrypt)

---

## 🔧 Configuration

### App Type Settings
Set in the initial launch modal or Settings page. Affects:
- Available menu items
- Additional form fields (down payment, installments)
- Feature availability

### Printer Settings
- **A4:** Standard paper printer
- **Thermal:** Receipt printer (58mm or 80mm)

### Currency
Default: EGP (Egyptian Pound)
Changeable in Settings

### Language
Default: English
Supports: Arabic (translations in `/src/i18n`)

---

## 📊 Key Features Explained

### POS Screen
1. **Product Search** - Search by name or barcode
2. **Quick Add** - Click product to add to cart
3. **Cart Management** - Edit quantity, discount, tax per item
4. **Customer Selection** - For installment tracking
5. **Payment Methods** - Cash, Card, Multi-payment
6. **Installment Option** - Down payment + monthly payments
7. **Invoice Generation** - Auto-generates PDF and prints

### Products Page
- Add/Edit/Delete products
- Manage stock levels
- Assign categories
- Barcode management
- Stock alerts:
  - 🔴 Red: Out of stock
  - 🟡 Yellow: Low stock (<10)
  - 🟢 Green: In stock
- CSV/Excel import/export

### Customers Page
- Add customer contact info
- Mark installment customers
- Search and filter
- Customer cards view
- Export customer list

### Dashboard
- Daily revenue (last 7 days)
- Monthly revenue trends
- Out-of-stock alerts
- Quick statistics

### Expenses
- Record daily expenses
- Monthly expense chart
- Date filtering (today, week, month, all)
- Export expense data

---

## 📈 Reports (Ready to Implement)

Planned reports:
- Sales by day/month/user
- Top products
- Revenue analysis
- Customer performance
- Inventory status
- Expense breakdown

---

## 🔐 Security

### Authentication
- Bcrypt password hashing (10 rounds)
- Session-based login
- Session storage in browser

### Access Control
- **Admin:** Full access to all features
- **Cashier:** POS and customer-facing features only

### Data Protection
- No sensitive data in localStorage
- Parameterized SQL queries (prevents injection)
- HTTPS ready for deployment

---

## 📱 Responsive Design

- **Desktop:** Full-featured interface
- **Tablet:** Optimized grid layout
- **Mobile:** Accessible but designed for larger screens

---

## ⚙️ Build & Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
```

### Electron Desktop Build
```bash
npm run electron
```

### Create Executable
```bash
npm run electron-build
```

---

## 📝 Development Notes

### Tech Stack
- **React 18.2** - UI framework
- **TypeScript 5.4** - Type safety
- **Tailwind CSS 3.4** - Styling
- **Framer Motion 10** - Animations
- **better-sqlite3 9.4** - Database
- **jsPDF 2.5** - PDF generation
- **XLSX 0.18** - Excel export
- **i18next 23** - Localization
- **Electron 29** - Desktop app
- **Vite 5.2** - Build tool

### Folder Structure
```
src/
├── components/        # Reusable UI components
├── pages/            # Page components (routes)
├── contexts/         # React Context (auth, theme)
├── hooks/            # Custom React hooks
├── i18n/             # Translations
├── db/               # Database setup & schema
├── App.tsx           # Main app component
└── main.tsx          # React entry point
```

### Code Style
- TypeScript strict mode enabled
- ESLint/Prettier ready
- Components use React Hooks
- Props properly typed
- Error handling throughout

---

## 🐛 Troubleshooting

### Issue: Database not initializing
**Solution:** Delete `database.db` and restart the app

### Issue: npm install fails with better-sqlite3
**Solution:** 
```bash
npm install --ignore-scripts
```

### Issue: Port 5173 already in use
**Solution:**
```bash
npm run dev -- --port 3000
```

### Issue: Dark mode not working
**Solution:** Clear localStorage and refresh

---

## 📚 Future Enhancements

- [ ] Google Drive backup/restore
- [ ] Advanced analytics dashboard
- [ ] Customer loyalty program
- [ ] Multi-branch support
- [ ] Mobile POS app
- [ ] Real-time inventory sync
- [ ] Advanced permissions system
- [ ] Audit logging
- [ ] API for third-party integration
- [ ] Barcode generation
- [ ] Inventory forecasting
- [ ] Supplier order management

---

## 📞 Support

For issues or feature requests:
1. Check the DEVELOPMENT_PROGRESS.md file
2. Review the code comments
3. Test with the demo data

---

## 📄 License

This project is a comprehensive POS system built for small to medium-sized businesses.

---

## 🎓 Learning Resources

### Key Concepts
- **State Management:** Context API
- **Database:** SQL with better-sqlite3
- **Authentication:** bcrypt hashing
- **UI State:** React hooks
- **Styling:** Tailwind CSS utility-first
- **Animations:** Framer Motion declarative syntax

### Example Code Patterns
See individual page components for:
- Modal management with AnimatePresence
- Data filtering and sorting
- Form handling with controlled inputs
- Database CRUD operations
- Error handling patterns

---

## ✨ Tips & Tricks

1. **Quick Search:** Use barcode scanner directly in POS
2. **Keyboard Shortcuts:** (Ready to implement)
3. **Data Export:** Always backup before major changes
4. **Stock Alerts:** Check dashboard daily for out-of-stock items
5. **Reports:** Export at month-end for accounting

---

## 🚀 Quick Commands Reference

```bash
# Development
npm run dev              # Start dev server

# Building
npm run build            # Build for production
npm run build && npm run preview  # Preview build

# Desktop
npm run electron         # Run Electron dev
npm run electron-build   # Build to EXE

# Utilities
npm run test             # Run tests (when configured)
npm list                 # List all dependencies
```

---

**Happy Selling! 🛍️**
