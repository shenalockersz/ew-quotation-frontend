import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faEye, faFileExcel } from '@fortawesome/free-solid-svg-icons';
import { Link, useNavigate } from 'react-router-dom';
import { RotatingLines } from 'react-loader-spinner';
import Fuse from 'fuse.js';
import * as XLSX from 'xlsx';
import api from '../utils/axiosInstance';

const Quotations = ({ user }) => {
  const navigate = useNavigate();

  const [allQuotations, setAllQuotations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebounced(searchQuery.trim()), 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Load quotations
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setErr('');

        // prefer prop user; fallback to storage
        let u = user;
        if (!u) {
          const raw =
            localStorage.getItem('user') || sessionStorage.getItem('user');
          if (!raw) {
            navigate('/');
            return;
          }
          try {
            u = JSON.parse(raw);
          } catch {
            navigate('/');
            return;
          }
        }

        const params =
          u?.user_sales_p_type === 'A'
            ? {}
            : u?.user_salesp_code
            ? { cp_code: u.user_salesp_code }
            : {};

        const res = await api.get('/v1/quotations', { params });
        if (!mounted) return;
        setAllQuotations(res.data || []);
      } catch (e) {
        if (!mounted) return;
        setErr(e?.response?.data?.message || 'Failed to load quotations');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate, user]);

  // Fuse for fuzzy search (name/code/customer/creator/approver)
  const fuse = useMemo(
    () =>
      new Fuse(allQuotations, {
        includeScore: false,
        threshold: 0.3,
        keys: [
          'quotation_name',
          'quotation_code',
          'cus_name',
          'created_by',
          'approved_by',
          // status as string search
          {
            name: 'quotation_status',
            getFn: (q) => String(q.quotation_status ?? ''),
          },
        ],
      }),
    [allQuotations]
  );

  // Filtered data (memoized)
  const filtered = useMemo(() => {
    if (!debounced) return allQuotations;
    return fuse.search(debounced).map((r) => r.item);
  }, [allQuotations, fuse, debounced]);

  // Helpers
  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '';

  const statusText = (s) =>
    s === 3
      ? 'Approved'
      : s === 6
      ? 'ReApproved'
      : s === 5
      ? 'Resubmitted'
      : s === 2
      ? 'Pending Approval'
      : s === 4
      ? 'Rejected'
      : 'Saved';

  const statusClass = (s) =>
    s === 3 || s === 6
      ? 'text-green-600'
      : s === 2 || s === 5
      ? 'text-yellow-500'
      : s === 4
      ? 'text-red-500'
      : 'text-blue-500';

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      filtered.map((q) => ({
        'Quotation No': q.quotation_code,
        'Quotation Name': q.quotation_name,
        'Customer': q.cus_name,
        'Created Date': fmtDate(q.quotation_date),
        'Created By': q.created_by,
        'Approved Date': fmtDate(q.quotation_approved_date),
        'Approved By': q.approved_by,
        'Status': statusText(q.quotation_status),
      }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Quotations');
    const filename = `Quotations_${new Date()
      .toISOString()
      .replace(/[:.]/g, '-')}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  return (
    <div className='flex w-full h-screen'>
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

      <main className='w-11/12'>
        <div className='mr-3 mb-4 p-3 ml-3 items-center'>
          <header className='text-xl font-bold mb-2'>Quotations</header>

          <div className='flex items-center space-x-3'>
            <input
              type='text'
              placeholder='Search by name, code, customer...'
              className='border px-4 py-2 rounded w-1/3 mr-3'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={loading}
            />

            <button
              onClick={exportToExcel}
              className='bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-500 disabled:opacity-60'
              disabled={loading || !filtered.length}
              title={
                filtered.length ? 'Export filtered rows' : 'Nothing to export'
              }
            >
              <FontAwesomeIcon icon={faFileExcel} /> Export
            </button>

            <Link
              to='/quotations/create'
              className='bg-green-500 text-white px-6 py-2 rounded hover:bg-green-400'
            >
              <FontAwesomeIcon icon={faPlus} /> Create Quotation
            </Link>
          </div>

          {err && <div className='text-red-600 mt-2'>Error: {err}</div>}
        </div>

        <div className='pb-20'>
          <table className='w-full border ml-3'>
            <thead>
              <tr>
                <th className='border px-4 py-2'>Quotation No</th>
                <th className='border px-4 py-2'>Quotation Name</th>
                <th className='border px-4 py-2'>Customer</th>
                <th className='border px-4 py-2'>Created Date</th>
                <th className='border px-4 py-2'>Created By</th>
                <th className='border px-4 py-2'>Approved Date</th>
                <th className='border px-4 py-2'>Approved By</th>
                <th className='border px-4 py-2'>Status</th>
                <th className='border px-4 py-2'>View</th>
              </tr>
            </thead>
            <tbody>
              {!loading && !filtered.length && (
                <tr>
                  <td
                    className='border px-4 py-6 text-center text-gray-500'
                    colSpan={9}
                  >
                    No quotations found.
                  </td>
                </tr>
              )}

              {filtered.map((q) => (
                <tr key={q.quotation_code ?? q.quotation_id}>
                  <td className='border px-4 py-2'>{q.quotation_code}</td>
                  <td className='border px-4 py-2'>{q.quotation_name}</td>
                  <td className='border px-4 py-2'>{q.cus_name}</td>
                  <td className='border px-4 py-2'>
                    {fmtDate(q.quotation_date)}
                  </td>
                  <td className='border px-4 py-2'>{q.created_by}</td>
                  <td className='border px-4 py-2'>
                    {fmtDate(q.quotation_approved_date)}
                  </td>
                  <td className='border px-4 py-2'>{q.approved_by}</td>
                  <td
                    className={`border px-4 py-2 text-center font-bold ${statusClass(
                      q.quotation_status
                    )}`}
                  >
                    {statusText(q.quotation_status)}
                  </td>
                  <td className='border px-4 py-2 text-center'>
                    <Link
                      to={`/quotations/view/${q.quotation_id}`}
                      className='text-gray-900 hover:text-gray-700 cursor-pointer'
                      title='View'
                    >
                      <FontAwesomeIcon icon={faEye} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
};

export default Quotations;
