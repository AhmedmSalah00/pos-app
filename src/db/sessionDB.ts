/**
 * SessionDB - In-memory database with localStorage persistence for browser environments
 * When running in browser without native SQLite, this provides a working alternative
 */

interface DbRow {
  [key: string]: any;
}

interface PreparedStatement {
  get: (...params: any[]) => DbRow | undefined;
  all: (...params: any[]) => DbRow[];
  run: (...params: any[]) => { changes: number };
}

class SessionDatabase {
  private tables: Map<string, DbRow[]> = new Map();
  private autoIncrement: Map<string, number> = new Map();
  private storageKey = 'pos_app_db';

  constructor() {
    this.loadFromStorage();
    this.initializeSchema();
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.tables = new Map(Object.entries(data.tables || {}));
        this.autoIncrement = new Map(Object.entries(data.autoIncrement || {}));
      }
    } catch (error) {
      console.warn('Failed to load from localStorage, starting fresh:', error);
    }
  }

  private saveToStorage() {
    try {
      const data = {
        tables: Object.fromEntries(this.tables),
        autoIncrement: Object.fromEntries(this.autoIncrement),
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  private initializeSchema() {
    if (!this.tables.has('users')) {
      const salt = 10; // bcrypt rounds (we'll store plaintext in browser mock)
      this.tables.set('users', [
        {
          id: 1,
          username: 'admin',
          password: 'password',
          role: 'admin',
        },
      ]);
      this.autoIncrement.set('users', 2);
    }

    if (!this.tables.has('products')) {
      this.tables.set('products', [
        {
          id: 1,
          name: 'Sample Product',
          price: 99.99,
          stock: 50,
          category_id: 1,
          barcode: 'SP001',
          image: null,
        },
      ]);
      this.autoIncrement.set('products', 2);
    }

    if (!this.tables.has('categories')) {
      this.tables.set('categories', [
        { id: 1, name: 'Electronics' },
        { id: 2, name: 'Clothing' },
      ]);
      this.autoIncrement.set('categories', 3);
    }

    if (!this.tables.has('customers')) {
      this.tables.set('customers', [
        {
          id: 1,
          name: 'John Doe',
          phone: '123-456-7890',
          address: '123 Main St',
          is_installment_customer: false,
        },
      ]);
      this.autoIncrement.set('customers', 2);
    }

    if (!this.tables.has('suppliers')) {
      this.tables.set('suppliers', [
        { id: 1, name: 'ABC Suppliers', phone: '111-222-3333', address: 'Supplier Ave' },
      ]);
      this.autoIncrement.set('suppliers', 2);
    }

    if (!this.tables.has('invoices')) {
      this.tables.set('invoices', []);
      this.autoIncrement.set('invoices', 1);
    }

    if (!this.tables.has('invoice_items')) {
      this.tables.set('invoice_items', []);
      this.autoIncrement.set('invoice_items', 1);
    }

    if (!this.tables.has('installment_payments')) {
      this.tables.set('installment_payments', []);
      this.autoIncrement.set('installment_payments', 1);
    }

    if (!this.tables.has('expenses')) {
      this.tables.set('expenses', []);
      this.autoIncrement.set('expenses', 1);
    }

    if (!this.tables.has('settings')) {
      this.tables.set('settings', [
        { key: 'app_type', value: 'supermarket' },
        { key: 'currency', value: 'EGP' },
        { key: 'language', value: 'en' },
        { key: 'printer_type', value: 'A4' },
      ]);
    }

    this.saveToStorage();
  }

  prepare(sql: string): PreparedStatement {
    return {
      get: (...params: any[]) => this.executeGet(sql, params),
      all: (...params: any[]) => this.executeAll(sql, params),
      run: (...params: any[]) => this.executeRun(sql, params),
    };
  }

  private executeGet(sql: string, params: any[]): DbRow | undefined {
    const results = this.executeAll(sql, params);
    return results[0];
  }

  private executeAll(sql: string, params: any[]): DbRow[] {
    const upper = sql.toUpperCase();

    if (upper.includes('SELECT')) {
      return this.select(sql, params);
    }

    return [];
  }

  private executeRun(sql: string, params: any[]): { changes: number } {
    const upper = sql.toUpperCase();

    if (upper.includes('INSERT')) {
      return this.insert(sql, params);
    } else if (upper.includes('UPDATE')) {
      return this.update(sql, params);
    } else if (upper.includes('DELETE')) {
      return this.delete(sql, params);
    }

    return { changes: 0 };
  }

  private select(sql: string, params: any[]): DbRow[] {
    const match = sql.match(/FROM\s+(\w+)/i);
    if (!match) return [];

    const tableName = match[1].toLowerCase();
    const table = this.tables.get(tableName) || [];

    // Parse WHERE clause
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:ORDER|LIMIT|$)/i);
    if (!whereMatch) return table;

    const whereClause = whereMatch[1].trim();

    return table.filter((row) => {
      return this.evaluateWhere(row, whereClause, params);
    });
  }

  private insert(sql: string, params: any[]): { changes: number } {
    const match = sql.match(/INSERT INTO\s+(\w+)\s*\((.*?)\)\s*VALUES/i);
    if (!match) return { changes: 0 };

    const tableName = match[1].toLowerCase();
    const columns = match[2].split(',').map((c) => c.trim());

    const table = this.tables.get(tableName) || [];
    const newRow: DbRow = {};

    // Add id if table uses autoincrement
    if (columns.includes('id') || (table.length > 0 && table[0].id)) {
      const id = (this.autoIncrement.get(tableName) || table.length + 1);
      newRow.id = id;
      this.autoIncrement.set(tableName, id + 1);
    }

    columns.forEach((col, idx) => {
      if (col !== 'id') {
        newRow[col] = params[idx];
      }
    });

    table.push(newRow);
    this.tables.set(tableName, table);
    this.saveToStorage();

    return { changes: 1 };
  }

  private update(sql: string, params: any[]): { changes: number } {
    const match = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE/i);
    if (!match) return { changes: 0 };

    const tableName = match[1].toLowerCase();
    const setClause = match[2];
    const whereMatch = sql.match(/WHERE\s+(.+?)$/i);
    const whereClause = whereMatch ? whereMatch[1].trim() : '';

    const table = this.tables.get(tableName) || [];
    const setCols = setClause.split(',').map((s) => s.split('=')[0].trim());

    let changes = 0;
    const updated = table.map((row) => {
      if (this.evaluateWhere(row, whereClause, params.slice(setCols.length))) {
        setCols.forEach((col, idx) => {
          row[col] = params[idx];
        });
        changes++;
      }
      return row;
    });

    this.tables.set(tableName, updated);
    this.saveToStorage();

    return { changes };
  }

  private delete(sql: string, params: any[]): { changes: number } {
    const match = sql.match(/FROM\s+(\w+)/i);
    if (!match) return { changes: 0 };

    const tableName = match[1].toLowerCase();
    const whereMatch = sql.match(/WHERE\s+(.+?)$/i);
    const whereClause = whereMatch ? whereMatch[1].trim() : '';

    const table = this.tables.get(tableName) || [];
    const beforeLength = table.length;

    const filtered = table.filter(
      (row) => !this.evaluateWhere(row, whereClause, params)
    );

    this.tables.set(tableName, filtered);
    this.saveToStorage();

    return { changes: beforeLength - filtered.length };
  }

  private evaluateWhere(row: DbRow, whereClause: string, params: any[]): boolean {
    // Simple WHERE evaluation for basic queries
    const eqMatch = whereClause.match(/(\w+)\s*=\s*\?/);
    if (eqMatch) {
      const column = eqMatch[1];
      return row[column] === params[0];
    }

    return true;
  }

  exec(sql: string): void {
    // No-op for CREATE TABLE or other schema statements
  }

  clearAll(): void {
    this.tables.clear();
    this.autoIncrement.clear();
    localStorage.removeItem(this.storageKey);
    this.initializeSchema();
  }
}

export const sessionDB = new SessionDatabase();
