import React, { useEffect, useMemo, useState } from 'react';
import { CSVLink } from 'react-csv';
import api from '../utils/axiosInstance';

const CustomerReport = () => {
  const [customerData, setCustomerData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchTerm.trim()), 250);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Fetch data
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const res = await api.get('/v1/customers');
        if (!mounted) return;
        setCustomerData(res.data || []);
      } catch (e) {
        setErr(e?.response?.data?.message || 'Failed to load customers');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Filter (memoized)
  const filteredData = useMemo(() => {
    if (!debounced) return customerData;
    const q = debounced.toLowerCase();
    return customerData.filter((c) =>
      (c.cus_name || '').toLowerCase().includes(q)
    );
  }, [customerData, debounced]);

  const csvHeaders = [
    { label: 'Customer Code', key: 'cus_code' },
    { label: 'Customer Name', key: 'cus_name' },
    { label: 'Customer Address', key: 'cus_addr' },
    { label: 'Customer VAT No', key: 'cus_vat_no' },
    { label: 'Contact Person', key: 'contact_person' },
    { label: 'Contact Person Number', key: 'contact_p_no' },
    { label: 'Customer Details', key: 'c_details' },
  ];

  const csvFileName = `customer_report_${new Date()
    .toISOString()
    .replace(/[:.]/g, '-')}.csv`;

  return (
    <div className='p-4'>
      <h1 className='text-2xl font-bold mb-4'>Customer Report</h1>

      <div className='mb-4'>
        <input
          type='text'
          placeholder='Search by customer name'
          className='p-2 border rounded w-1/2'
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={loading}
        />
      </div>

      <div className='mb-4 flex gap-4'>
        <CSVLink
          data={filteredData}
          headers={csvHeaders}
          filename={csvFileName}
          className='bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-50'
        >
          Export CSV
        </CSVLink>
      </div>

      {loading && <div className='text-gray-600'>Loading…</div>}
      {err && !loading && <div className='text-red-600 mb-3'>Error: {err}</div>}

      {!loading && !err && (
        <div className='overflow-x-auto'>
          <table className='table-auto w-full border-collapse border border-gray-200'>
            <thead>
              <tr className='bg-gray-100'>
                <th className='border px-4 py-2'>Customer Code</th>
                <th className='border px-4 py-2'>Customer Name</th>
                <th className='border px-4 py-2'>Customer Address</th>
                <th className='border px-4 py-2'>Customer VAT No</th>
                <th className='border px-4 py-2'>Contact Person</th>
                <th className='border px-4 py-2'>Contact Person Number</th>
                <th className='border px-4 py-2'>Customer Details</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length ? (
                filteredData.map((customer) => (
                  <tr key={customer.cus_code}>
                    <td className='border px-4 py-2'>{customer.cus_code}</td>
                    <td className='border px-4 py-2'>{customer.cus_name}</td>
                    <td className='border px-4 py-2'>{customer.cus_addr}</td>
                    <td className='border px-4 py-2'>{customer.cus_vat_no}</td>
                    <td className='border px-4 py-2'>
                      {customer.contact_person}
                    </td>
                    <td className='border px-4 py-2'>
                      {customer.contact_p_no}
                    </td>
                    <td className='border px-4 py-2'>{customer.c_details}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className='border px-4 py-6 text-center text-gray-500'
                    colSpan={7}
                  >
                    No customers found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CustomerReport;
