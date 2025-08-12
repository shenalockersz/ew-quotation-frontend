import React, { useEffect, useMemo, useRef, useState } from 'react';
import { faPen, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import backgroundImage from '../assets/gray.jpg';
import Swal from 'sweetalert2';
import Fuse from 'fuse.js';
import { RotatingLines } from 'react-loader-spinner';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import api from '../utils/axiosInstance';

const blankCustomer = {
  customerName: '',
  customerAddress: '',
  vatNo: '',
  contactPerson: '',
  contactPersonNumber: '',
  customerDetails: '',
};

const blankErrors = {
  customerName: '',
  customerAddress: '',
  vatNo: '',
  contactPerson: '',
  contactPersonNumber: '',
  customerDetails: '',
};

const CustomerForm = ({ user }) => {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [customerData, setCustomerData] = useState([]);
  const [customerInfo, setCustomerInfo] = useState(blankCustomer);
  const [validationErrors, setValidationErrors] = useState(blankErrors);

  const [searchQuery, setSearchQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [editingId, setEditingId] = useState(null); // edit by id, not index
  const [isEditMode, setIsEditMode] = useState(false);

  const formRef = useRef(null);
  const isApprover = user?.sales_p_type === 'A';

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchQuery.trim()), 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Load customers
  const fetchData = async () => {
    try {
      setLoading(true);

      // prefer prop user; fallback to storage
      let u = user;
      if (!u) {
        const storedUser =
          localStorage.getItem('user') || sessionStorage.getItem('user');
        if (!storedUser) {
          navigate('/');
          return;
        }
        try {
          u = JSON.parse(storedUser);
        } catch {
          navigate('/');
          return;
        }
      }

      let url = '/v1/customers';
      if (u?.sales_p_type !== 'A' && u?.user_salesp_code) {
        const p = new URLSearchParams({ cp_code: u.user_salesp_code });
        url += `?${p.toString()}`;
      }

      const res = await api.get(url);
      setCustomerData(res.data || []);
    } catch (err) {
      Swal.fire(
        'Error',
        err?.response?.data?.message || 'Failed to load customers',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fuse for name search (memoized)
  const fuse = useMemo(
    () =>
      new Fuse(customerData, {
        includeScore: false,
        threshold: 0.3,
        keys: ['cus_name'],
      }),
    [customerData]
  );

  // Filtered list
  const filteredCustomers = useMemo(() => {
    if (!debounced) return customerData;
    return fuse.search(debounced).map((r) => r.item);
  }, [debounced, fuse, customerData]);

  const handleSearch = (q) => setSearchQuery(q);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setCustomerInfo((p) => ({ ...p, [name]: value }));
    setValidationErrors((p) => ({ ...p, [name]: '' }));
  };

  const validateForm = () => {
    const e = {};
    let ok = true;

    const req = (k, msg) => {
      if (!String(customerInfo[k] || '').trim()) {
        e[k] = msg;
        ok = false;
      }
    };

    req('customerName', 'Customer Name is required');
    req('customerAddress', 'Customer Address is required');
    req('vatNo', 'Customer VAT Number is required');
    req('contactPerson', 'Contact Person is required');
    req('contactPersonNumber', 'Contact Person Number is required');
    req('customerDetails', 'Customer Details is required');

    if (customerInfo.vatNo && !/^\d{1,20}$/.test(customerInfo.vatNo)) {
      e.vatNo = 'Customer Vat No must be 1 to 20 digits';
      ok = false;
    }

    if (
      customerInfo.contactPersonNumber &&
      !/^\d{10}$/.test(customerInfo.contactPersonNumber)
    ) {
      e.contactPersonNumber = 'Contact Person Number must be exactly 10 digits';
      ok = false;
    }

    setValidationErrors(e);
    return ok;
  };

  const resetForm = () => {
    setCustomerInfo(blankCustomer);
    setValidationErrors(blankErrors);
    setEditingId(null);
    setIsEditMode(false);
  };

  const handleEdit = (cust) => {
    if (isEditMode) return; // prevent switching mid-edit
    setEditingId(cust.cus_id);
    setIsEditMode(true);
    setCustomerInfo({
      customerName: cust.cus_name || '',
      customerAddress: cust.cus_addr || '',
      vatNo: cust.cus_vat_no || '',
      contactPerson: cust.contact_person || '',
      contactPersonNumber: cust.contact_p_no || '',
      customerDetails: cust.c_details || '',
    });
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSave = async () => {
    if (!editingId) return;
    if (!validateForm()) return;

    const confirm = await Swal.fire({
      title: 'Do you want to update the Data?',
      showDenyButton: true,
      showCancelButton: false,
      confirmButtonText: 'Yes',
      denyButtonText: 'No',
    });
    if (!confirm.isConfirmed) return;

    const cust = customerData.find((c) => c.cus_id === editingId);
    if (!cust) {
      Swal.fire('Error', 'Customer not found', 'error');
      return;
    }

    const payload = {
      cus_id: cust.cus_id,
      cus_code: cust.cus_code,
      cus_name: customerInfo.customerName,
      cus_addr: customerInfo.customerAddress,
      cus_vat_no: customerInfo.vatNo,
      contact_person: customerInfo.contactPerson,
      contact_p_no: customerInfo.contactPersonNumber,
      c_details: customerInfo.customerDetails,
      updated_by: user?.sales_p_code,
      updated_date: format(new Date(), 'yyyy-MM-dd'),
    };

    try {
      setSaving(true);
      await api.put(`/v1/customers/${payload.cus_id}`, payload);

      // optimistic local update
      setCustomerData((prev) =>
        prev.map((c) => (c.cus_id === editingId ? { ...c, ...payload } : c))
      );
      resetForm();
      Swal.fire('Success!', 'Data updated successfully', 'success');
    } catch (err) {
      Swal.fire(
        'Error!',
        err?.response?.data?.message ||
          'Error updating data. Please try again.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const saveNew = async () => {
    const datatosend = {
      customerInfo,
      createdby: user?.sales_p_code,
    };
    try {
      setSaving(true);
      await api.post('/v1/customers', datatosend);
      await fetchData();
      resetForm();
      Swal.fire('Submitted!', 'Customer created successfully', 'success');
    } catch (err) {
      Swal.fire(
        'Error!',
        err?.response?.data?.message ||
          'Error inserting data. Please try again.',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (isEditMode) {
      await handleSave();
    } else {
      const res = await Swal.fire({
        title: 'Do you want to submit the Data?',
        showDenyButton: true,
        showCancelButton: false,
        confirmButtonText: 'Yes',
        denyButtonText: 'No',
      });
      if (res.isConfirmed) await saveNew();
    }
  };

  const handleDelete = async (customer) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to recover this customer data!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    try {
      await api.delete(`/v1/customers/${customer.cus_code}`);
      setCustomerData((prev) =>
        prev.filter((c) => c.cus_code !== customer.cus_code)
      );
      Swal.fire('Deleted!', 'Customer data has been deleted.', 'success');
    } catch (err) {
      if (err?.response?.status === 409) {
        Swal.fire(
          'Error!',
          'This customer is associated with other data.',
          'error'
        );
      } else {
        Swal.fire(
          'Error!',
          err?.response?.data?.message ||
            'Error deleting customer. Please try again.',
          'error'
        );
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
            <header className='text-xl font-bold mb-2'>Customer</header>
          </div>

          <form
            ref={formRef}
            className='shadow-md rounded px-8 pt-6 pb-8 mb-4'
            onSubmit={handleSubmit}
          >
            <div className='flex justify-between'>
              <div className='w-full max-w-lg mx-auto '>
                {/* Customer Name */}
                <div className='mb-4'>
                  <label className='block text-gray-700 text-sm font-bold mb-2'>
                    Customer Name
                  </label>
                  <input
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      validationErrors.customerName ? 'border-red-500' : ''
                    }`}
                    type='text'
                    placeholder='Customer Name'
                    name='customerName'
                    value={customerInfo.customerName}
                    onChange={handleChange}
                  />
                  {validationErrors.customerName && (
                    <p className='text-red-500 text-xs italic'>
                      {validationErrors.customerName}
                    </p>
                  )}
                </div>

                {/* Customer Address */}
                <div className='mb-4'>
                  <label className='block text-gray-700 text-sm font-bold mb-2'>
                    Customer Address
                  </label>
                  <input
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      validationErrors.customerAddress ? 'border-red-500' : ''
                    }`}
                    type='text'
                    placeholder='Customer address'
                    name='customerAddress'
                    value={customerInfo.customerAddress}
                    onChange={handleChange}
                  />
                  {validationErrors.customerAddress && (
                    <p className='text-red-500 text-xs italic'>
                      {validationErrors.customerAddress}
                    </p>
                  )}
                </div>

                {/* Customer Vat No */}
                <div className='mb-4'>
                  <label className='block text-gray-700 text-sm font-bold mb-2'>
                    Customer Vat No
                  </label>
                  <input
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      validationErrors.vatNo ? 'border-red-500' : ''
                    }`}
                    type='text'
                    placeholder='Customer Vat No'
                    name='vatNo'
                    value={customerInfo.vatNo}
                    onChange={handleChange}
                  />
                  {validationErrors.vatNo && (
                    <p className='text-red-500 text-xs italic'>
                      {validationErrors.vatNo}
                    </p>
                  )}
                </div>
              </div>

              <div className='w-full max-w-lg mx-auto '>
                {/* Contact Person */}
                <div className='mb-4'>
                  <label className='block text-gray-700 text-sm font-bold mb-2'>
                    Contact Person
                  </label>
                  <input
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      validationErrors.contactPerson ? 'border-red-500' : ''
                    }`}
                    type='text'
                    placeholder='Contact Person'
                    name='contactPerson'
                    value={customerInfo.contactPerson}
                    onChange={handleChange}
                  />
                  {validationErrors.contactPerson && (
                    <p className='text-red-500 text-xs italic'>
                      {validationErrors.contactPerson}
                    </p>
                  )}
                </div>

                {/* Contact Person No */}
                <div className='mb-4'>
                  <label className='block text-gray-700 text-sm font-bold mb-2'>
                    Contact Person No
                  </label>
                  <input
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      validationErrors.contactPersonNumber
                        ? 'border-red-500'
                        : ''
                    }`}
                    type='text'
                    placeholder='Contact Person No'
                    name='contactPersonNumber'
                    value={customerInfo.contactPersonNumber}
                    onChange={handleChange}
                  />
                  {validationErrors.contactPersonNumber && (
                    <p className='text-red-500 text-xs italic'>
                      {validationErrors.contactPersonNumber}
                    </p>
                  )}
                </div>

                {/* Customer Designation */}
                <div className='mb-4'>
                  <label className='block text-gray-700 text-sm font-bold mb-2'>
                    Customer Designation
                  </label>
                  <input
                    className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                      validationErrors.customerDetails ? 'border-red-500' : ''
                    }`}
                    type='text'
                    placeholder='Customer Details'
                    name='customerDetails'
                    value={customerInfo.customerDetails}
                    onChange={handleChange}
                  />
                  {validationErrors.customerDetails && (
                    <p className='text-red-500 text-xs italic'>
                      {validationErrors.customerDetails}
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
                        onClick={handleSave}
                        disabled={saving}
                      >
                        {saving ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        className='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'
                        type='button'
                        onClick={resetForm}
                        disabled={saving}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'
                      type='submit'
                      disabled={saving}
                    >
                      {saving ? 'Submitting...' : 'Submit'}
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
              placeholder='Search by Customer Name'
              className='border px-4 py-2 rounded w-1/3 mr-3'
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <table className='w-full border ml-3'>
            <thead>
              <tr>
                <th className='border px-4 py-2'>Customer Code</th>
                <th className='border px-4 py-2'>Customer Name</th>
                <th className='border px-4 py-2'>Customer Address</th>
                <th className='border px-4 py-2'>Customer Vat No</th>
                <th className='border px-4 py-2'>Contact Person</th>
                <th className='border px-4 py-2'>Contact person Number</th>
                <th className='border px-4 py-2'>Customer Designation</th>
                <th className='border px-4 py-2'>Edit</th>
                <th className='border px-4 py-2'>Delete</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.cus_id}>
                  <td className='border px-4 py-2'>{customer.cus_code}</td>
                  <td className='border px-4 py-2'>{customer.cus_name}</td>
                  <td className='border px-4 py-2'>{customer.cus_addr}</td>
                  <td className='border px-4 py-2'>{customer.cus_vat_no}</td>
                  <td className='border px-4 py-2'>
                    {customer.contact_person}
                  </td>
                  <td className='border px-4 py-2'>{customer.contact_p_no}</td>
                  <td className='border px-4 py-2'>{customer.c_details}</td>

                  <td className='border px-6 py-2 text-center'>
                    {isApprover ? (
                      <FontAwesomeIcon
                        icon={faPen}
                        className={`text-blue-500 hover:text-blue-700 cursor-pointer mr-2 ${
                          isEditMode ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        onClick={() => !isEditMode && handleEdit(customer)}
                        title='Edit'
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
                        onClick={() => handleDelete(customer)}
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
              {!filteredCustomers.length && !loading && (
                <tr>
                  <td
                    className='border px-4 py-6 text-center text-gray-500'
                    colSpan={9}
                  >
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </main>
      </div>
    </div>
  );
};

export default CustomerForm;
