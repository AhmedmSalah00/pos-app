import db from './db/database';

function testDatabase() {
  try {
    console.log('Testing database connection...');
    const users = db.prepare('SELECT * FROM users').all();
    console.log('Users:', users);

    const products = db.prepare('SELECT * FROM products').all();
    console.log('Products:', products);

    const settings = db.prepare('SELECT * FROM settings').all();
    console.log('Settings:', settings);

    console.log('Database test successful!');
  } catch (error) {
    console.error('Database test failed:', error);
  } finally {
    db.close();
  }
}

testDatabase();
