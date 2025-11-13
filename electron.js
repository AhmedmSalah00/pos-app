const { app, BrowserWindow, ipcMain } = require('electron');
const bcrypt = require('bcrypt');
const db = require('./src/db/database'); // Assuming this is the correct path to your database module

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  win.loadURL('http://localhost:3000'); // For dev; change to built file for prod
}

app.whenReady().then(createWindow);

ipcMain.handle('save-user', async (event, { isEditing, editingId, formData }) => {
  const { username, password, role } = formData;
  if (isEditing && editingId) {
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      db.prepare('UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?').run(
        username,
        hashedPassword,
        role,
        editingId
      );
    } else {
      db.prepare('UPDATE users SET username = ?, role = ? WHERE id = ?').run(
        username,
        role,
        editingId
      );
    }
  } else {
    const hashedPassword = await bcrypt.hash(password, 10);
    db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(
      username,
      hashedPassword,
      role
    );
  }
  return { success: true };
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});