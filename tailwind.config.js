module.exports = {
  darkMode: 'class',
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        neumorphism: {
          light: '#f0f0f3',
          dark: '#d1d5db',
          shadow: '#a3a3a3',
        },
      },
      boxShadow: {
        'neumorphism-light': '20px 20px 40px #d1d5db, -20px -20px 40px #f0f0f3',
        'neumorphism-dark': 'inset 20px 20px 40px #d1d5db, inset -20px -20px 40px #f0f0f3',
      },
    },
  },
  plugins: [],
};
