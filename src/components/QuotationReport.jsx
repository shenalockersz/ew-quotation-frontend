import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CSVLink } from 'react-csv';
import Select from 'react-select';
import api from '../utils/axiosInstance';

const QuotationReport = () => {
  const [quotationData, setQuotationData] = useState([]);
  const [salesPersonData, setSalesPersonData] = useState([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [debounced, setDebounced] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [salesPerson, setSalesPerson] = useState(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const salespersonSelectRef = useRef(null);

  // Debounce search term
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
        setErr('');
        const [qRes, spRes] = await Promise.all([
          api.get('/v1/quotations'),
          api.get('/v1/salespersons'),
        ]);
        if (!mounted) return;
        setQuotationData(qRes.data || []);
        setSalesPersonData(spRes.data || []);
      } catch (e) {
        if (!mounted) return;
        setErr(e?.response?.data?.message || 'Failed to load report data');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Helpers
  const parseDate = (val) => (val ? new Date(val) : null);
  const withinRange = (d, start, end) => {
    if (!d) return false;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  };

  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T23:59:59`) : null;

  // Filtered data (memoized)
  const filteredData = useMemo(() => {
    const term = debounced.toLowerCase();

    return quotationData.filter((q) => {
      // text search across several fields (safe-guard undefined)
      const searchHit =
        !term ||
        (q.quotation_code || '').toLowerCase().includes(term) ||
        (q.quotation_name || '').toLowerCase().includes(term) ||
        (q.cus_name || '').toLowerCase().includes(term) ||
        (q.created_by || '').toLowerCase().includes(term) ||
        (q.approved_by || '').toLowerCase().includes(term) ||
        String(q.quotation_status ?? '')
          .toLowerCase()
          .includes(term) ||
        (q.quotation_date &&
          new Date(q.quotation_date)
            .toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
            .toLowerCase()
            .includes(term)) ||
        (q.quotation_approved_date &&
          new Date(q.quotation_approved_date)
            .toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
            .toLowerCase()
            .includes(term));

      // date range uses Created Date (quotation_date)
      const qDate = parseDate(q.quotation_date);
      const dateOk = withinRange(qDate, start, end);

      // salesperson filter uses sp_code
      const spOk = !salesPerson || (q.sp_code && q.sp_code === salesPerson);

      return searchHit && dateOk && spOk;
    });
  }, [quotationData, debounced, start, end, salesPerson]);

  // Summary
  const totalQuotations = filteredData.length;
  const approvedQuotations = filteredData.filter(
    (q) => q.quotation_status === 3 || q.quotation_status === 6
  ).length;
  const pendingQuotations = filteredData.filter(
    (q) => q.quotation_status === 2
  ).length;

  const csvFileName = `quotation_report_${new Date()
    .toISOString()
    .replace(/[:.]/g, '-')}.csv`;

  const csvData = useMemo(() => {
    const header = [
      'Customer',
      'Quotation Name',
      'Quotation Amount',
      'Sales Person',
      'Created Date',
    ];
    const rows = filteredData.map((q) => [
      q.cus_name,
      q.quotation_name,
      q.total_quotation_amount,
      q.sales_p_name,
      q.quotation_date
        ? new Date(q.quotation_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })
        : '',
    ]);

    return [
      ['Quotation Summary Report'],
      ['Total Quotations:', totalQuotations],
      ['Approved Quotations:', approvedQuotations],
      ['Pending Quotations:', pendingQuotations],
      [],
      header,
      ...rows,
    ];
  }, [filteredData, totalQuotations, approvedQuotations, pendingQuotations]);

  return (
    <div className='p-0'>
      <div className='min-w-7xl mx-auto space-y-6 p-4 bg-bg bg-cover'>
        <h1 className='text-2xl font-bold mb-4 text-white'>Quotation Report</h1>

        {/* Search */}
        <div className='mb-4'>
          <input
            type='text'
            placeholder='Search Quotations'
            className='p-2 border rounded w-1/2'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            disabled={loading}
          />
        </div>

        {/* Filters + Summary */}
        <div className='mb-4 flex justify-between items-start'>
          {/* Left: Filters */}
          <div className='flex flex-col'>
            <h2 className='text-xl font-semibold mb-4 text-white'>Filters:</h2>

            <div className='flex flex-row justify-start mb-2 space-x-4'>
              <div className='flex flex-col'>
                <label className='text-white mb-1'>From:</label>
                <input
                  type='date'
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className='p-1 border border-white text-white bg-transparent rounded outline-none placeholder-white'
                  style={{ WebkitAppearance: 'none', colorScheme: 'dark' }}
                  disabled={loading}
                />
              </div>
              <div className='flex flex-col'>
                <label className='text-white mb-1'>To:</label>
                <input
                  type='date'
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className='p-1 border border-white text-white bg-transparent rounded outline-none placeholder-white'
                  style={{ WebkitAppearance: 'none', colorScheme: 'dark' }}
                  disabled={loading}
                />
              </div>
            </div>

            <div className='flex justify-start mt-4 w-[28rem] max-w-full'>
              <Select
                ref={salespersonSelectRef}
                className='w-full'
                name='salesperson'
                isClearable
                isSearchable
                placeholder='Select Sales Person'
                options={salesPersonData.map((sp) => ({
                  value: sp.sales_p_code,
                  label: sp.sales_p_name,
                }))}
                onChange={(opt) => setSalesPerson(opt ? opt.value : null)}
                isDisabled={loading}
              />
            </div>
          </div>

          {/* Right: Summary */}
          <div className='text-white text-right'>
            <p>
              <strong>Total Quotations:</strong> {totalQuotations}
            </p>
            <p>
              <strong>Approved Quotations:</strong> {approvedQuotations}
            </p>
            <p>
              <strong>Pending Quotations:</strong> {pendingQuotations}
            </p>
          </div>
        </div>

        {/* Export */}
        <div className='mb-4 flex gap-4'>
          <CSVLink
            data={csvData}
            filename={csvFileName}
            className='text-white bg-blue-500 border border-blue-500 px-4 py-2 rounded hover:bg-blue-600 hover:text-black disabled:opacity-50'
          >
            Export CSV
          </CSVLink>
        </div>

        {loading && <div className='text-gray-100/90'>Loading…</div>}
        {err && !loading && <div className='text-red-200'>Error: {err}</div>}
      </div>

      {/* Table */}
      {!loading && !err && (
        <div className='overflow-x-auto'>
          <table className='table-auto w-full border-collapse border border-gray-200'>
            <thead>
              <tr className='bg-gray-100'>
                <th className='border px-4 py-2'>Quotation No</th>
                <th className='border px-4 py-2'>Quotation Name</th>
                <th className='border px-4 py-2'>Customer</th>
                <th className='border px-4 py-2'>Created Date</th>
                <th className='border px-4 py-2'>Created By</th>
                <th className='border px-4 py-2'>Approved Date</th>
                <th className='border px-4 py-2'>Approved By</th>
                <th className='border px-4 py-2'>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length ? (
                filteredData.map((q) => (
                  <tr key={q.quotation_code}>
                    <td className='border px-4 py-2'>{q.quotation_code}</td>
                    <td className='border px-4 py-2'>{q.quotation_name}</td>
                    <td className='border px-4 py-2'>{q.cus_name}</td>
                    <td className='border px-4 py-2'>
                      {q.quotation_date
                        ? new Date(q.quotation_date).toLocaleDateString(
                            'en-US',
                            {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            }
                          )
                        : ''}
                    </td>
                    <td className='border px-4 py-2'>{q.created_by}</td>
                    <td className='border px-4 py-2'>
                      {q.quotation_approved_date
                        ? new Date(
                            q.quotation_approved_date
                          ).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : ''}
                    </td>
                    <td className='border px-4 py-2'>{q.approved_by}</td>
                    <td
                      className={`border rounded font-bold text-center ${
                        q.quotation_status === 3 || q.quotation_status === 6
                          ? 'text-green-600'
                          : q.quotation_status === 2 || q.quotation_status === 5
                          ? 'text-yellow-500'
                          : q.quotation_status === 4
                          ? 'text-red-500'
                          : 'text-blue-500'
                      }`}
                    >
                      {q.quotation_status === 3
                        ? 'Approved'
                        : q.quotation_status === 6
                        ? 'ReApproved'
                        : q.quotation_status === 5
                        ? 'Resubmitted'
                        : q.quotation_status === 2
                        ? 'Pending Approval'
                        : q.quotation_status === 4
                        ? 'Rejected'
                        : 'Saved'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className='border px-4 py-6 text-center text-gray-500'
                    colSpan={8}
                  >
                    No quotations found.
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

export default QuotationReport;
