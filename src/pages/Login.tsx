import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Globe } from 'react-feather';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      const success = await login(username, password);
      if (success) {
        navigate('/');
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('An unexpected error occurred.');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-200">
      <motion.div
        className="w-full max-w-sm p-8 space-y-6 bg-white/30 backdrop-blur-lg rounded-3xl shadow-2xl"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">ACCOUNTING APP</h1>
        </div>
        
        {error && <p className="text-red-500 text-center text-sm">{error}</p>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
          }}
          className="space-y-5"
        >
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 text-gray-700 bg-white/50 rounded-full focus:outline-none focus:ring-2 focus:ring-white/50 placeholder-gray-500"
            placeholder="USERNAME"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 text-gray-700 bg-white/50 rounded-full focus:outline-none focus:ring-2 focus:ring-white/50 placeholder-gray-500"
            placeholder="PASSWORD"
          />
          
          <div className="flex items-center justify-center text-gray-600">
            <Globe size={16} className="mr-2" />
            <select className="bg-transparent text-sm focus:outline-none">
              <option value="en">LANGUAGE: ENGLISH</option>
              {/* Add other languages here if needed */}
            </select>
          </div>

          <motion.button
            type="submit"
            className="w-full py-3 font-bold text-gray-800 bg-white/80 rounded-full hover:bg-white focus:outline-none focus:ring-2 focus:ring-white"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            LOGIN
          </motion.button>

          <motion.button
            type="button"
            className="w-full py-2 text-sm font-semibold text-gray-600 bg-transparent rounded-full hover:bg-white/20 focus:outline-none"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            CHANGE DEFAULT CREDENITIALS
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default Login;
