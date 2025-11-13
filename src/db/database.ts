import { initializeDatabase } from './schema';
import { sessionDB } from './sessionDB';

// Avoid statically importing `better-sqlite3` so the web build doesn't try to resolve it.
// We only load the native DB driver at runtime when running inside Electron/Node.
let db: any;

try {
  // Try to access a runtime `require` safely. This avoids bundlers resolving the
  // dependency during web builds. If running in the browser, this will throw and
  // the catch block will provide a mock DB implementation.
  // eslint-disable-next-line no-new-func
  const req = (typeof require !== 'undefined') ? require : new Function('return require')();
  const Database = req('better-sqlite3');

  // Initialize a single database connection (Electron/Node environment)
  db = new Database('database.db', { verbose: console.log });
  initializeDatabase(db);
} catch (error) {
  // In browser, use session-based in-memory database with localStorage persistence
  console.warn('Native database not available, using session storage:', error);
  db = sessionDB;
}

// Export the single database connection (real or session-based mock)
export default db;
