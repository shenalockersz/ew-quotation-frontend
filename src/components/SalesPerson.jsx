import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPen,
  faTrash,
  faChevronDown,
} from '@fortawesome/free-solid-svg-icons';
import { RotatingLines } from 'react-loader-spinner';
import Swal from 'sweetalert2';
import api from '../utils/axiosInstance';
import backgroundImage from '../assets/gray.jpg';

const TYPE_VALUE = {
  Approver: 'A',
  Member: 'M',
};

const SalesForm = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [allSalespersons, setAllSalespersons] = useState([]);

  const [isEditMode, setIsEditMode] = useState(false);
  const [editingCode, setEditingCode] = useState(null);

  const isApprover = user && user.sales_p_type === 'A';
  const formRef = useRef(null);

  const [salesPersonInfo, setSalesPersonInfo] = useState({
    sales_p_name: '',
    sales_p_email: '',
    sales_p_contact_no: '',
    sales_p_designation: '',
    sales_p_type: '', // "A" | "M"
  });

  const [validationErrors, setValidationErrors] = useState({
    sales_p_name: '',
    sales_p_email: '',
    sales_p_contact_no: '',
    sales_p_designation: '',
    sales_p_type: '',
  });

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchQuery.trim()), 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Load data
  const loadSalespersons = async () => {
    try {
      setLoading(true);
      setErr('');
      const res = await api.get('/v1/salespersons');

      setAllSalespersons(res.data);
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to load salespersons');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalespersons();
  }, []);

  // Search (Fuse-like simple includes across fields; avoid mutating source)
  const filtered = useMemo(() => {
    if (!debounced) return allSalespersons;
    const q = debounced.toLowerCase();
    return allSalespersons.filter((sp) => {
      return (
        (sp.sales_p_name || '').toLowerCase().includes(q) ||
        (sp.sales_p_email || '').toLowerCase().includes(q) ||
        (sp.sales_p_code || '').toLowerCase().includes(q) ||
        (sp.sales_p_contact_no || '').toLowerCase().includes(q) ||
        (sp.sales_p_designation || '').toLowerCase().includes(q) ||
        (sp.sales_p_type_display || '').toLowerCase().includes(q)
      );
    });
  }, [allSalespersons, debounced]);

  const resetForm = () => {
    setSalesPersonInfo({
      sales_p_name: '',
      sales_p_email: '',
      sales_p_contact_no: '',
      sales_p_designation: '',
      sales_p_type: '',
    });
    setValidationErrors({
      sales_p_name: '',
      sales_p_email: '',
      sales_p_contact_no: '',
      sales_p_designation: '',
      sales_p_type: '',
    });
    setIsEditMode(false);
    setEditingCode(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSalesPersonInfo((s) => ({ ...s, [name]: value }));
    setValidationErrors((v) => ({ ...v, [name]: '' }));
  };

  const validateForm = () => {
    const v = { ...validationErrors };
    let ok = true;

    if (!salesPersonInfo.sales_p_name.trim()) {
      v.sales_p_name = 'Sales Person Name is required';
      ok = false;
    }
    if (!salesPersonInfo.sales_p_email.trim()) {
      v.sales_p_email = 'Sales Person Email is required';
      ok = false;
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(salesPersonInfo.sales_p_email)
    ) {
      v.sales_p_email = 'Invalid email address';
      ok = false;
    }
    if (!salesPersonInfo.sales_p_contact_no.trim()) {
      v.sales_p_contact_no = 'Contact Number is required';
      ok = false;
    } else if (!/^\d{10}$/.test(salesPersonInfo.sales_p_contact_no)) {
      v.sales_p_contact_no = 'Contact Number must be exactly 10 digits';
      ok = false;
    }
    if (!salesPersonInfo.sales_p_designation.trim()) {
      v.sales_p_designation = 'Designation is required';
      ok = false;
    }
    if (!salesPersonInfo.sales_p_type) {
      v.sales_p_type = 'Sales Person Type is required';
      ok = false;
    }

    setValidationErrors(v);
    return ok;
  };

  const handleEdit = (sp) => {
    if (isEditMode) return; // prevent switching mid-edit
    setIsEditMode(true);
    setEditingCode(sp.sales_p_code);
    setSalesPersonInfo({
      sales_p_name: sp.sales_p_name || '',
      sales_p_email: sp.sales_p_email || '',
      sales_p_contact_no: sp.sales_p_contact_no || '',
      sales_p_designation: sp.sales_p_designation || '',
      sales_p_type:
        sp.sales_p_type || TYPE_VALUE[sp.sales_p_type_display] || '',
    });
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const handleDelete = async (sales_p_code) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to recover this salesperson data!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      await api.delete(`/v1/salespersons/${sales_p_code}`);
      await loadSalespersons();
      Swal.fire({
        title: 'Deleted!',
        text: 'Salesperson data has been deleted.',
        icon: 'success',
      });
    } catch (error) {
      if (error.response && error.response.status === 409) {
        Swal.fire({
          title: 'Error!',
          text: 'This salesperson is associated with other data.',
          icon: 'error',
        });
      } else {
        Swal.fire({
          title: 'Error!',
          text: 'Error deleting salesperson. Please try again.',
          icon: 'error',
        });
      }
    }
  };

  const saveNew = async () => {
    try {
      const res = await api.post('/v1/salespersons', salesPersonInfo);
      if (res.status === 200) {
        resetForm();
        await loadSalespersons();
        Swal.fire({
          title: 'Success!',
          text: 'Salesperson created successfully',
          icon: 'success',
        });
      }
    } catch (error) {
      Swal.fire({
        title: 'Error!',
        text: 'Error inserting data. Please try again.',
        icon: 'error',
      });
    }
  };

  const saveEdit = async () => {
    try {
      const toUpdate = {
        sales_p_code: editingCode,
        sales_p_name: salesPersonInfo.sales_p_name,
        sales_p_email: salesPersonInfo.sales_p_email,
        sales_p_contact_no: salesPersonInfo.sales_p_contact_no,
        sales_p_designation: salesPersonInfo.sales_p_designation,
        sales_p_type: salesPersonInfo.sales_p_type,
      };

      const confirmResult = await Swal.fire({
        title: 'Do you want to update the Data?',
        showDenyButton: true,
        showCancelButton: false,
        confirmButtonText: 'Yes',
        denyButtonText: 'No',
      });

      if (!confirmResult.isConfirmed) return;

      const res = await api.put(`/v1/salespersons/${editingCode}`, toUpdate);
      if (res.status === 200) {
        resetForm();
        await loadSalespersons();
        Swal.fire({
          title: 'Success!',
          text: 'Data updated successfully',
          icon: 'success',
        });
      }
    } catch (error) {
      Swal.fire({
        title: 'Error!',
        text: 'Error updating data. Please try again.',
        icon: 'error',
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (isEditMode) {
      await saveEdit();
    } else {
      const confirm = await Swal.fire({
        title: 'Do you want to submit the Data?',
        showDenyButton: true,
        showCancelButton: false,
        confirmButtonText: 'Yes',
        denyButtonText: 'No',
      });
      if (confirm.isConfirmed) {
        await saveNew();
      }
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
          <div className='mr-3 mb-4 p-3 ml-3 items-center '>
            <header className='text-xl font-bold mb-2'>Sales Person</header>
          </div>

          <form
            ref={formRef}
            className='shadow-md rounded px-8 pt-6 pb-8 mb-4'
            onSubmit={handleSubmit}
          >
            <div className='flex justify-between'>
              <div className='w-full max-w-lg mx-auto'>
                {/* Name */}
                <div className='mb-4'>
                  <label className='block text-gray-700 text-sm font-bold mb-2'>
                    Sales Person Name
                  </label>
                  <input
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      validationErrors.sales_p_name && 'border-red-500'
                    }`}
                    type='text'
                    placeholder='Sales Person Name'
                    name='sales_p_name'
                    value={salesPersonInfo.sales_p_name}
                    onChange={handleChange}
                  />
                  {validationErrors.sales_p_name && (
                    <p className='text-red-500 text-xs italic'>
                      {validationErrors.sales_p_name}
                    </p>
                  )}
                </div>

                {/* Email */}
                <div className='mb-4'>
                  <label className='block text-gray-700 text-sm font-bold mb-2'>
                    Sales Person Email
                  </label>
                  <input
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      validationErrors.sales_p_email && 'border-red-500'
                    }`}
                    type='text'
                    placeholder='Sales Person Email'
                    name='sales_p_email'
                    value={salesPersonInfo.sales_p_email}
                    onChange={handleChange}
                  />
                  {validationErrors.sales_p_email && (
                    <p className='text-red-500 text-xs italic'>
                      {validationErrors.sales_p_email}
                    </p>
                  )}
                </div>

                {/* Type */}
                <div className='mb-4'>
                  <label className='block text-gray-700 text-sm font-bold mb-2'>
                    Sales Person Type
                  </label>
                  <div className='relative'>
                    <select
                      className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                        validationErrors.sales_p_type && 'border-red-500'
                      }`}
                      name='sales_p_type'
                      value={salesPersonInfo.sales_p_type}
                      onChange={handleChange}
                    >
                      <option value='' disabled hidden>
                        Select Type
                      </option>
                      <option value='A'>Approver</option>
                      <option value='M'>Member</option>
                    </select>
                    <div className='absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none'>
                      <FontAwesomeIcon
                        icon={faChevronDown}
                        className='text-gray-500'
                      />
                    </div>
                  </div>
                  {validationErrors.sales_p_type && (
                    <p className='text-red-500 text-xs italic'>
                      {validationErrors.sales_p_type}
                    </p>
                  )}
                </div>
              </div>

              <div className='w-full max-w-lg mx-auto'>
                {/* Contact */}
                <div className='mb-4'>
                  <label className='block text-gray-700 text-sm font-bold mb-2'>
                    Sales Person Contact No.
                  </label>
                  <input
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      validationErrors.sales_p_contact_no && 'border-red-500'
                    }`}
                    type='text'
                    placeholder='Sales Person Contact No.'
                    name='sales_p_contact_no'
                    value={salesPersonInfo.sales_p_contact_no}
                    onChange={handleChange}
                  />
                  {validationErrors.sales_p_contact_no && (
                    <p className='text-red-500 text-xs italic'>
                      {validationErrors.sales_p_contact_no}
                    </p>
                  )}
                </div>

                {/* Designation */}
                <div className='mb-4'>
                  <label className='block text-gray-700 text-sm font-bold mb-2'>
                    Sales Person Designation
                  </label>
                  <input
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      validationErrors.sales_p_designation && 'border-red-500'
                    }`}
                    type='text'
                    placeholder='Sales Person Designation'
                    name='sales_p_designation'
                    value={salesPersonInfo.sales_p_designation}
                    onChange={handleChange}
                  />
                  {validationErrors.sales_p_designation && (
                    <p className='text-red-500 text-xs italic'>
                      {validationErrors.sales_p_designation}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className='flex justify-end'>
                  {isEditMode ? (
                    <div className='flex'>
                      <button
                        className='bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2 focus:outline-none focus:shadow-outline'
                        type='button'
                        onClick={saveEdit}
                      >
                        Save
                      </button>
                      <button
                        className='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mr-2 focus:outline-none focus:shadow-outline'
                        type='button'
                        onClick={resetForm}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'
                      type='submit'
                    >
                      Submit
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>

      {/* List */}
      <div className='pb-20'>
        <main className='w-11/12'>
          <div className='flex items-center space-x-3 p-4'>
            <input
              type='text'
              placeholder='Search Sales Person (name, email, code, type)'
              className='border px-4 py-2 rounded w-1/3 mr-3'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <table className='w-full border ml-3'>
            <thead>
              <tr>
                <th className='border px-4 py-2'>Sales Person Code</th>
                <th className='border px-4 py-2'>Sales Person Name</th>
                <th className='border px-4 py-2'>Sales Person Email</th>
                <th className='border px-4 py-2'>Contact Number</th>
                <th className='border px-4 py-2'>Designation</th>
                <th className='border px-4 py-2'>Type</th>
                <th className='border px-4 py-2'>Edit</th>
                <th className='border px-4 py-2'>Delete</th>
              </tr>
            </thead>
            <tbody>
              {!loading && !filtered.length && (
                <tr>
                  <td
                    className='border px-4 py-6 text-center text-gray-500'
                    colSpan={8}
                  >
                    No salespersons found.
                  </td>
                </tr>
              )}

              {filtered.map((sp) => (
                <tr key={sp.sales_p_code}>
                  <td className='border px-4 py-2'>{sp.sales_p_code}</td>
                  <td className='border px-4 py-2'>{sp.sales_p_name}</td>
                  <td className='border px-4 py-2'>{sp.sales_p_email}</td>
                  <td className='border px-4 py-2'>{sp.sales_p_contact_no}</td>
                  <td className='border px-4 py-2'>{sp.sales_p_designation}</td>
                  <td className='border px-4 py-2'>
                    {sp.sales_p_type_display}
                  </td>
                  <td className='border px-4 py-2 text-center'>
                    {isApprover ? (
                      <FontAwesomeIcon
                        icon={faPen}
                        className={`text-blue-500 hover:text-blue-700 cursor-pointer mr-2 ${
                          isEditMode ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={() => !isEditMode && handleEdit(sp)}
                        title={
                          isEditMode ? 'Finish current edit first' : 'Edit'
                        }
                      />
                    ) : (
                      <FontAwesomeIcon
                        icon={faPen}
                        className='text-gray-500 cursor-not-allowed'
                        title="You don't have permission to edit"
                      />
                    )}
                  </td>
                  <td className='border px-8 py-2 text-center'>
                    {isApprover ? (
                      <FontAwesomeIcon
                        icon={faTrash}
                        className='text-red-500 hover:text-red-700 cursor-pointer'
                        onClick={() => handleDelete(sp.sales_p_code)}
                        title='Delete'
                      />
                    ) : (
                      <FontAwesomeIcon
                        icon={faTrash}
                        className='text-gray-500 cursor-not-allowed'
                        title="You don't have permission to delete"
                      />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </main>
      </div>
    </div>
  );
};

export default SalesForm;
