import type BetterSqlite3 from 'better-sqlite3';

// Helper to safely load bcrypt at runtime
function getBcrypt() {
  try {
    // eslint-disable-next-line no-new-func
    const req = (typeof require !== 'undefined') ? require : new Function('return require')();
    return req('bcrypt');
  } catch (error) {
    console.warn('bcrypt not available (likely running in browser)');
    return null;
  }
}

function setupDatabase(db: BetterSqlite3.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'cashier'))
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL,
      category_id INTEGER,
      barcode TEXT UNIQUE,
      image TEXT,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );

    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      is_installment_customer BOOLEAN DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      address TEXT
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      total REAL NOT NULL,
      payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'card', 'multi')),
      down_payment REAL,
      installment_percentage REAL,
      FOREIGN KEY (customer_id) REFERENCES customers(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS invoice_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER,
      product_id INTEGER,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      discount REAL DEFAULT 0,
      tax REAL DEFAULT 0,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS installment_payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER,
      due_date DATE NOT NULL,
      amount REAL NOT NULL,
      paid_at DATE,
      status TEXT NOT NULL CHECK(status IN ('due', 'paid', 'overdue')),
      FOREIGN KEY (invoice_id) REFERENCES invoices(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      amount REAL NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS returns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      invoice_id INTEGER,
      product_id INTEGER,
      quantity INTEGER NOT NULL,
      reason TEXT,
      is_damaged BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id),
      FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

function insertInitialData(db: BetterSqlite3.Database) {
  // Insert default user if not exists
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
  if (!user) {
    const bcrypt = getBcrypt();
    if (bcrypt) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync('password', salt);
      db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)')
        .run('admin', hash, 'admin');
    } else {
      console.warn('Cannot create default admin user: bcrypt not available');
    }
  }

  // Insert default settings
  db.exec(`
    INSERT OR IGNORE INTO settings (key, value) VALUES ('app_type', 'supermarket');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('currency', 'EGP');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('language', 'en');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('printer_type', 'A4');
  `);

  // Insert demo data
  db.exec(`
    INSERT OR IGNORE INTO categories (name) VALUES ('Electronics'), ('Clothing');
    INSERT OR IGNORE INTO products (name, price, stock, category_id, barcode) VALUES 
      ('Laptop', 1000.0, 10, 1, '123456789'),
      ('T-Shirt', 20.0, 50, 2, '987654321');
    INSERT OR IGNORE INTO customers (name, phone) VALUES ('John Doe', '123-456-7890');
  `);
}

export function initializeDatabase(db: BetterSqlite3.Database) {
  setupDatabase(db);
  insertInitialData(db);
}
