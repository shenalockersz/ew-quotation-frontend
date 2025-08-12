import React, { useState } from 'react';
import backgroundImage from '../assets/bg.jpg';
import companyLogo from '../assets/logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import api from '../utils/axiosInstance';

const LoginForm = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!username.trim() || !password.trim()) {
      setFormError('Username and password are required.');
      return false;
    }
    setFormError('');
    return true;
  };

  const handleLogin = async () => {
    if (!validate()) return;

    try {
      setLoading(true);
      const { data } = await api.post('/v1/api/login', { username, password });

      if (data?.success) {
        onLogin(data.user, rememberMe);
      } else {
        setFormError(data?.message || 'Invalid username or password.');
      }
    } catch (err) {
      setFormError(
        err?.response?.data?.message || 'Unable to log in. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div
      className='flex items-center justify-center h-screen'
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
      }}
    >
      <form
        className='bg-white p-8 rounded shadow-md w-[360px]'
        onSubmit={handleSubmit}
      >
        <img
          src={companyLogo}
          alt='Company Logo'
          className='mx-auto mb-3'
          style={{ maxWidth: '150px' }}
        />
        <h2 className='text-black text-2xl font-semibold mb-6 text-center'>
          E W Information System Ltd
        </h2>

        <div className={`mb-4`}>
          <label
            htmlFor='username'
            className='block text-black text-sm font-medium mb-2'
          >
            Username
          </label>
          <input
            type='text'
            id='username'
            autoComplete='username'
            className={`w-full p-2 border rounded-md ${
              formError ? 'border-red-500' : ''
            }`}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className={`mb-4 relative`}>
          <label
            htmlFor='password'
            className='block text-black text-sm font-medium mb-2'
          >
            Password
          </label>
          <input
            type={showPassword ? 'text' : 'password'}
            id='password'
            autoComplete='current-password'
            className={`w-full p-2 border rounded-md pr-10 ${
              formError ? 'border-red-500' : ''
            }`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <button
            type='button'
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className='absolute top-1/2 transform -translate-y-1/2 right-4 mt-3 cursor-pointer'
            onClick={() => setShowPassword((s) => !s)}
            disabled={loading}
          >
            <FontAwesomeIcon icon={showPassword ? faEye : faEyeSlash} />
          </button>
        </div>

        {formError && <p className='text-red-500 text-sm mb-4'>{formError}</p>}

        <div className='flex items-center justify-between mb-4'>
          <label htmlFor='rememberMe' className='flex items-center'>
            <input
              type='checkbox'
              id='rememberMe'
              className='text-blue-500 mr-2'
              checked={rememberMe}
              onChange={() => setRememberMe((v) => !v)}
              disabled={loading}
            />
            <span className='text-black text-sm'>Remember Me</span>
          </label>

          <a
            href='/forgot-password'
            className='text-blue-500 text-sm hover:underline'
          >
            Forgot Password?
          </a>
        </div>

        <button
          type='submit'
          className='w-full bg-green-900 text-white p-2 rounded-md hover:bg-gray-700 disabled:opacity-60'
          disabled={loading}
        >
          {loading ? 'Logging in…' : 'Login'}
        </button>
      </form>
    </div>
  );
};

export default LoginForm;
