# 🖥️ Command Reference - POS Application

## 🚀 Running the Application

### Start Development Server
```bash
npm run dev
```
- Starts Vite dev server
- Hot reload enabled
- Accessible at `http://localhost:5173`

### Build for Production
```bash
npm run build
```
- Optimized production build
- Creates `/dist` folder
- Ready for deployment

### Preview Production Build
```bash
npm run build && npm run preview
```
- Builds then serves the build
- Test optimized version locally

---

## 🖥️ Electron Desktop Application

### Run in Electron (Development)
```bash
npm run electron
```
- Starts Electron app
- Full desktop experience
- Hot reload while developing

### Build Electron App (Windows)
```bash
npm run electron-build
```
- Creates installer and portable executable
- Output in `/dist-electron` folder
- Creates `.exe` file for distribution

---

## 🔧 Development Tools

### Install Dependencies
```bash
npm install
```
- Installs all packages from package.json
- Only run if dependencies are missing

### Clean Install (if issues)
```bash
rm -r node_modules package-lock.json
npm install
```

### Check Dependencies
```bash
npm list
```
- Shows installed package versions

### Update Dependencies
```bash
npm update
```
- Updates to latest compatible versions

---

## 📝 Database Management

### Reset Database
```bash
# Windows
Remove-Item database.db -Force

# Mac/Linux
rm database.db

# Then restart app
npm run dev
```
- Deletes current database
- Creates fresh database with demo data on next run
- **Warning:** Deletes all data!

### Backup Database
```bash
# Windows
Copy-Item database.db database_backup_$(Get-Date -Format "yyyy-MM-dd").db

# Mac/Linux
cp database.db database_backup_$(date +%Y-%m-%d).db
```
- Creates backup copy with date stamp

### Restore from Backup
```bash
# Windows
Remove-Item database.db
Copy-Item database_backup_YYYY-MM-DD.db database.db

# Mac/Linux
rm database.db
cp database_backup_YYYY-MM-DD.db database.db
```

---

## 🧪 Testing & Debugging

### View Console Logs
```
Press F12 in browser or app
Go to Console tab
```
- Shows any errors or warnings
- Check here for troubleshooting

### Inspect Elements
```
Press F12
Go to Elements/Inspector tab
```
- Inspect HTML and CSS
- Test responsive design

### Check Application State
```
Press F12
Go to Application tab
Look at localStorage, sessionStorage, databases
```

### Device Testing
```
Press F12 → Device Toggle → Select device
```
- Test on different screen sizes

---

## 📦 File Operations

### Clear Browser Cache
```
Press Ctrl+Shift+Delete (Windows)
Press Cmd+Shift+Delete (Mac)
```
- Clears all browser data
- Helpful if stuck in bad state

### Find Database File
```
# Windows
explorer %APPDATA%\pos-app

# Mac
open ~/Library/Application\ Support/pos-app

# Linux
nautilus ~/.config/pos-app
```

### View Project Files
```bash
# List all files
ls -la

# List only source files
ls -la src/

# Find specific file
find . -name "*.tsx" -type f
```

---

## 🐛 Troubleshooting Commands

### Fix npm Issues
```bash
npm cache clean --force
npm install
```
- Clears npm cache
- Reinstalls everything

### Check Node Version
```bash
node --version
npm --version
```
- Verify you have Node 18+

### Kill Port Process (if needed)
```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Mac/Linux
lsof -i :5173
kill -9 <PID>
```
- Frees up port if stuck

### Restart Development Server
```bash
# Ctrl+C to stop current server
npm run dev
```
- Clears any cached state

---

## 📊 Useful Developer Commands

### Generate Component Template
```bash
# Create new page
mkdir src/pages/NewPage.tsx

# Create new component
mkdir src/components/NewComponent.tsx
```

### Search for Text in Files
```bash
# Windows (PowerShell)
Select-String -Path "src/**/*.tsx" -Pattern "searchTerm"

# Mac/Linux
grep -r "searchTerm" src/
```

### Count Lines of Code
```bash
# Total lines
find src -name "*.tsx" -o -name "*.ts" | xargs wc -l

# By file type
find src -name "*.tsx" | xargs wc -l
find src -name "*.ts" | xargs wc -l
```

---

## 🎯 Quick NPM Scripts Summary

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run electron` | Run Electron dev |
| `npm run electron-build` | Build Electron executable |
| `npm install` | Install dependencies |
| `npm list` | Show installed packages |
| `npm update` | Update packages |

---

## 🔑 Keyboard Shortcuts

### In Browser
| Shortcut | Action |
|----------|--------|
| F5 | Refresh page |
| Ctrl+Shift+I | Open DevTools |
| Ctrl+Shift+Delete | Clear cache |
| Tab | Focus next element |
| Shift+Tab | Focus previous element |
| Enter | Submit form |
| Esc | Close modal |

### In VS Code
| Shortcut | Action |
|----------|--------|
| Ctrl+S | Save file |
| Ctrl+Shift+P | Open command palette |
| Ctrl+K Ctrl+F | Format document |
| Ctrl+/ | Toggle comment |
| F2 | Rename symbol |
| Ctrl+F | Find in file |
| Ctrl+H | Find and replace |

---

## 📱 Testing Different Screen Sizes

### Command Line Testing
```bash
# Open with specific viewport
# In DevTools → Device Toggle → Custom

# Preset sizes to test
# Mobile: 375x667 (iPhone)
# Tablet: 768x1024 (iPad)
# Desktop: 1920x1080 (Full HD)
```

---

## 🔐 Security Commands

### Hash a Password (for manual user creation)
```bash
node -e "console.log(require('bcrypt').hashSync('password', 10))"
```
- Create secure password hash
- Use in SQL INSERT statement

---

## 📈 Performance Monitoring

### Check App Size
```bash
# After build
ls -lh dist/

# Check individual file sizes
ls -lh dist/assets/
```

### Measure Build Time
```bash
time npm run build
```
- Shows how long build takes

### Bundle Analysis
```bash
# Add to vite.config.ts:
import { visualizer } from 'rollup-plugin-visualizer'

# Then run build to see bundle breakdown
npm run build
```

---

## 🌐 Network Debugging

### Check API Calls
```
Press F12 → Network tab
Perform actions in app
See all requests
```

### View Headers
```
Click on request in Network tab
See Request/Response headers
```

---

## 📝 Git Commands (if using version control)

### Initialize Repository
```bash
git init
git add .
git commit -m "Initial commit"
```

### Check Status
```bash
git status
```

### Create Backup Branch
```bash
git branch backup-$(date +%Y-%m-%d)
git push origin backup-$(date +%Y-%m-%d)
```

---

## 🚀 Deployment Commands

### Deploy to Vercel
```bash
npm i -g vercel
vercel
# Follow prompts
```

### Deploy to Netlify
```bash
npm i -g netlify-cli
netlify deploy
```

### Export Database Before Deployment
```bash
# Backup database before deploying
Copy-Item database.db database_pre-deploy.db
```

---

## 📚 Help Commands

### View npm Help
```bash
npm help
npm help install
npm help run
```

### View npm Registry Info
```bash
npm info react
npm search package-name
```

---

## ⚡ Performance Optimization

### Build Size Optimization
```bash
npm run build
# Check dist/ folder size
```

### Database Optimization
```bash
# Run in database browser
VACUUM;  -- Defragment database
ANALYZE; -- Update statistics
```

---

## 🎯 Common Task Commands

### Add New Package
```bash
npm install package-name
npm install --save-dev dev-package
```

### Remove Package
```bash
npm uninstall package-name
```

### List Outdated Packages
```bash
npm outdated
```

### Security Audit
```bash
npm audit
npm audit fix
```

---

## 💾 System Information Commands

### Check Operating System
```bash
# Windows
systeminfo | findstr /C:"OS Name"

# Mac
system_profiler SPSoftwareDataType

# Linux
cat /etc/os-release
```

### Check Disk Space
```bash
# Windows
Get-Volume

# Mac/Linux
df -h
```

### Check RAM Usage
```bash
# Windows
Get-Process | Measure-Object WorkingSet -Sum

# Mac
top

# Linux
free -h
```

---

## 🔔 Environment Variables

### Create .env File
```bash
# In project root
echo "VITE_API_URL=http://localhost:3000" > .env
```

### View Environment
```bash
echo $PATH
echo $HOME
```

---

## 📞 Getting Help

### Official Documentation
- React: https://react.dev
- Tailwind: https://tailwindcss.com/docs
- Vite: https://vitejs.dev
- Framer Motion: https://www.framer.com/motion
- SQLite: https://www.sqlite.org/docs.html

### Community Help
- Stack Overflow
- GitHub Discussions
- React Forums

---

## 🎓 Learning Resources

### Recommended Study Order
1. Read SETUP_GUIDE.md
2. Read QUICK_START.md
3. Follow DEVELOPMENT_PROGRESS.md
4. Study component files in src/
5. Review database schema in src/db/
6. Explore hooks in src/hooks/

---

**Bookmark this page for quick command reference!** 🚀

Last Updated: November 11, 2025
