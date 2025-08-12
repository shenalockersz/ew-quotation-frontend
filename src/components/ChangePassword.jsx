import React, { useRef, useState } from 'react';
import { RotatingLines } from 'react-loader-spinner';
import backgroundImage from '../assets/gray.jpg';
import Swal from 'sweetalert2';
import api from '../utils/axiosInstance';

const ChangePassword = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [passwordInfo, setPasswordInfo] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [validationErrors, setValidationErrors] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const formRef = useRef();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPasswordInfo((p) => ({ ...p, [name]: value }));
    setValidationErrors((p) => ({ ...p, [name]: '' }));
  };

  const validate = () => {
    const e = { oldPassword: '', newPassword: '', confirmPassword: '' };
    let ok = true;

    if (!passwordInfo.oldPassword.trim()) {
      e.oldPassword = 'Old password is required';
      ok = false;
    }
    if (!passwordInfo.newPassword.trim()) {
      e.newPassword = 'New password is required';
      ok = false;
    } else {
      // Basic strength: at least 8 chars, one letter, one number
      const strong = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
      if (!strong.test(passwordInfo.newPassword)) {
        e.newPassword = 'At least 8 chars, include a letter and a number';
        ok = false;
      }
      if (passwordInfo.newPassword === passwordInfo.oldPassword) {
        e.newPassword = 'New password must be different from old password';
        ok = false;
      }
    }
    if (!passwordInfo.confirmPassword.trim()) {
      e.confirmPassword = 'Please confirm your new password';
      ok = false;
    } else if (passwordInfo.newPassword !== passwordInfo.confirmPassword) {
      e.confirmPassword = 'Passwords do not match';
      ok = false;
    }

    setValidationErrors(e);
    return ok;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    try {
      setLoading(true);
      const payload = {
        userId: user?.user_id,
        currentPassword: passwordInfo.oldPassword,
        newPassword: passwordInfo.newPassword,
      };

      const { data } = await api.post('/v1/api/change-password', payload);

      if (data?.success) {
        await Swal.fire(
          'Success!',
          'Password changed successfully.',
          'success'
        );
        setPasswordInfo({
          oldPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else if (data?.message === 'Current password is incorrect.') {
        await Swal.fire('Error!', 'Current password is incorrect.', 'error');
      } else {
        await Swal.fire(
          'Error',
          data?.message || 'Unable to change password.',
          'error'
        );
      }
    } catch (err) {
      await Swal.fire(
        'Error',
        err?.response?.data?.message ||
          'Something went wrong. Please try again.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='w-full h-screen'>
      {loading && (
        <div className='absolute inset-0 bg-gray-900 opacity-50 flex items-center justify-center z-50'>
          <RotatingLines
            strokeColor='grey'
            strokeWidth='5'
            animationDuration='0.75'
            width='96'
            visible
          />
        </div>
      )}

      <main className='w-12/12'>
        <div
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
          }}
        >
          <div className='mr-3 mb-4 p-3 ml-3 items-center'>
            <header className='text-xl font-bold mb-2'>Change Password</header>
          </div>

          <form
            ref={formRef}
            className='shadow-md rounded px-8 pt-6 pb-8 mb-4'
            onSubmit={handleSubmit}
          >
            <div className='flex justify-between'>
              <div className='w-full max-w-lg mx-auto'>
                {/* Old Password */}
                <div className='mb-4'>
                  <label className='block text-gray-700 text-sm font-bold mb-2'>
                    Old Password
                  </label>
                  <input
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      validationErrors.oldPassword ? 'border-red-500' : ''
                    }`}
                    type='password'
                    placeholder='Enter Old Password'
                    name='oldPassword'
                    value={passwordInfo.oldPassword}
                    onChange={handleChange}
                    autoComplete='current-password'
                  />
                  {validationErrors.oldPassword && (
                    <p className='text-red-500 text-xs italic'>
                      {validationErrors.oldPassword}
                    </p>
                  )}
                </div>

                {/* New Password */}
                <div className='mb-4'>
                  <label className='block text-gray-700 text-sm font-bold mb-2'>
                    New Password
                  </label>
                  <input
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      validationErrors.newPassword ? 'border-red-500' : ''
                    }`}
                    type='password'
                    placeholder='Enter New Password'
                    name='newPassword'
                    value={passwordInfo.newPassword}
                    onChange={handleChange}
                    autoComplete='new-password'
                  />
                  {validationErrors.newPassword && (
                    <p className='text-red-500 text-xs italic'>
                      {validationErrors.newPassword}
                    </p>
                  )}
                </div>

                {/* Confirm Password */}
                <div className='mb-4'>
                  <label className='block text-gray-700 text-sm font-bold mb-2'>
                    Confirm Password
                  </label>
                  <input
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      validationErrors.confirmPassword ? 'border-red-500' : ''
                    }`}
                    type='password'
                    placeholder='Confirm New Password'
                    name='confirmPassword'
                    value={passwordInfo.confirmPassword}
                    onChange={handleChange}
                    autoComplete='new-password'
                  />
                  {validationErrors.confirmPassword && (
                    <p className='text-red-500 text-xs italic'>
                      {validationErrors.confirmPassword}
                    </p>
                  )}
                </div>

                {/* Submit */}
                <div className='flex justify-end'>
                  <button
                    className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline disabled:opacity-60'
                    type='submit'
                    disabled={loading}
                  >
                    {loading ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ChangePassword;
