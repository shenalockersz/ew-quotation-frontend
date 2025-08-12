import React, { useEffect, useMemo, useState } from 'react';
import {
  faThumbsUp,
  faThumbsDown,
  faSave,
  faClock,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import api from '../utils/axiosInstance';

ChartJS.register(ArcElement, Tooltip, Legend);

export default function Mainpage({ user }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [countData, setCountData] = useState({
    status_1_count: 0,
    status_2_count: 0,
    status_3_count: 0,
    status_4_count: 0,
    status_5_count: 0,
    status_6_count: 0,
    total_count: 0,
    // *_data arrays may come from API; default them to []
    status_1_data: [],
    status_2_data: [],
    status_3_data: [],
    status_4_data: [],
    status_5_data: [],
    status_6_data: [],
  });
  const [quotationData, setQuotationData] = useState([]);
  const [showTable, setShowTable] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState({
    label: '',
    data: [],
  });

  // Pull cp_code / user type from prop or storage
  const sessionUser = useMemo(() => {
    if (user) return user;
    const raw = localStorage.getItem('user') || sessionStorage.getItem('user');
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [user]);

  // Load counts + quotations on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr('');

        const cpcode = sessionUser?.user_salesp_code;
        const userType = sessionUser?.user_sales_p_type;

        // counts
        const countsReq = api.get('/v1/quotations/counts', {
          params: cpcode ? { cp_code: cpcode } : {},
        });

        // quotations (admin sees all; otherwise filtered by cp)
        const quotesReq = api.get('/v1/quotations/by-month', {
          params: userType === 'A' ? {} : { cp_code: cpcode },
        });

        const [countsRes, quotesRes] = await Promise.all([
          countsReq,
          quotesReq,
        ]);

        if (!mounted) return;

        const safeCounts = countsRes.data || {};
        setCountData({
          status_1_count: Number(safeCounts.status_1_count) || 0,
          status_2_count: Number(safeCounts.status_2_count) || 0,
          status_3_count: Number(safeCounts.status_3_count) || 0,
          status_4_count: Number(safeCounts.status_4_count) || 0,
          status_5_count: Number(safeCounts.status_5_count) || 0,
          status_6_count: Number(safeCounts.status_6_count) || 0,
          total_count: Number(safeCounts.total_count) || 0,
          status_1_data: safeCounts.status_1_data || [],
          status_2_data: safeCounts.status_2_data || [],
          status_3_data: safeCounts.status_3_data || [],
          status_4_data: safeCounts.status_4_data || [],
          status_5_data: safeCounts.status_5_data || [],
          status_6_data: safeCounts.status_6_data || [],
        });

        setQuotationData(quotesRes.data || []);
      } catch (e) {
        setErr(e?.response?.data?.message || 'Failed to load dashboard data');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [sessionUser]);

  // Grouped lists (from quotationData)
  const savedQuotations = useMemo(
    () => quotationData.filter((q) => q.quotation_status === 1),
    [quotationData]
  );
  const pendingQuotations = useMemo(
    () =>
      quotationData.filter(
        (q) => q.quotation_status === 2 || q.quotation_status === 5
      ),
    [quotationData]
  );
  const approvedQuotations = useMemo(
    () =>
      quotationData.filter(
        (q) => q.quotation_status === 3 || q.quotation_status === 6
      ),
    [quotationData]
  );
  const rejectedQuotations = useMemo(
    () => quotationData.filter((q) => q.quotation_status === 4),
    [quotationData]
  );

  // Helpers
  const total = countData.total_count || 0;
  const sum = (a, b) => (Number(a) || 0) + (Number(b) || 0);
  const pct = (n, d) => (d > 0 ? ((n / d) * 100).toFixed(2) : '0.00');

  const approvedCount = sum(countData.status_3_count, countData.status_6_count);
  const pendingCount = sum(countData.status_2_count, countData.status_5_count);
  const savedCount = Number(countData.status_1_count) || 0;
  const rejectedCount = Number(countData.status_4_count) || 0;

  const handleCardClick = (category) => {
    switch (category) {
      case 'Saved':
        setSelectedCategory({
          label: 'Saved',
          data: countData.status_1_data || [],
        });
        break;
      case 'Pending':
        setSelectedCategory({
          label: 'Pending',
          data: [
            ...(countData.status_2_data || []),
            ...(countData.status_5_data || []),
          ],
        });
        break;
      case 'Approved':
        setSelectedCategory({
          label: 'Approved',
          data: [
            ...(countData.status_3_data || []),
            ...(countData.status_6_data || []),
          ],
        });
        break;
      case 'Rejected':
        setSelectedCategory({
          label: 'Rejected',
          data: countData.status_4_data || [],
        });
        break;
      default:
        setSelectedCategory({ label: '', data: [] });
    }
    setShowTable(true);
  };

  // Pie chart data
  const pieData = useMemo(
    () => ({
      labels: ['Saved', 'Pending Approval', 'Approved', 'Rejected'],
      datasets: [
        {
          label: 'count',
          data: [savedCount, pendingCount, approvedCount, rejectedCount],
          backgroundColor: [
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(255, 99, 132, 1)',
          ],
          borderColor: ['#fff', '#fff', '#fff', '#fff'],
          borderWidth: 2,
        },
      ],
    }),
    [savedCount, pendingCount, approvedCount, rejectedCount]
  );

  if (loading) {
    return (
      <div className='bg-blue-50 min-h-screen p-4'>
        <div className='text-gray-600 px-2'>Loading…</div>
      </div>
    );
  }
  if (err) {
    return (
      <div className='bg-blue-50 min-h-screen p-4'>
        <div className='text-red-600 px-2'>Error: {err}</div>
      </div>
    );
  }

  return (
    <div className='bg-blue-50 flex sm:flex-col flex-col space-y-2 sm:space-x-2 w-full items-start justify-start min-h-screen p-4 pr-8'>
      <div className='flex-row ml-2 my-5'>
        <h1 className='text-2xl'>
          Welcome{' '}
          <span className='font-semibold'>{sessionUser?.sales_p_name}</span>!
        </h1>
        <span className='text-slate-500'>
          Here's the monthly update for{' '}
          {new Date().toLocaleString('en-US', { month: 'long' })}{' '}
          {new Date().getFullYear()}.
        </span>
      </div>

      <div className='flex w-full border-2'>
        {/* Left column */}
        <div className='w-2/5 mb-3'>
          {/* Approved */}
          <button
            onClick={() => handleCardClick('Approved')}
            className='flex flex-wrap flex-row sm:flex-col justify-center items-center w-full sm:w-3/4 p-5 bg-green-900 text-slate-200 hover:bg-bg hover:bg-cover hover:text-white rounded-md shadow-xl border-l-4 border-green-400 mt-10 mb-10 ml-3'
          >
            <div className='flex justify-between w-full'>
              <div>
                <div className='text-3xl'>
                  <FontAwesomeIcon icon={faThumbsUp} />
                </div>
                <div className='font-bold text-sm'>Approved</div>
              </div>
              <div>
                <div
                  className='flex items-center text-xs px-3 bg-green-100 text-green-800 rounded-full'
                  style={{ paddingTop: '.1em', paddingBottom: '.1rem' }}
                >
                  {approvedCount ? `${pct(approvedCount, total)}%` : '0%'}
                </div>
              </div>
            </div>
            <div>
              <div className='font-bold text-5xl'>{approvedCount || 0}</div>
              <div className='font-bold text-sm'>Total</div>
            </div>
          </button>

          {/* Rejected */}
          <button
            onClick={() => handleCardClick('Rejected')}
            className='flex flex-wrap flex-row sm:flex-col justify-center items-center w-full sm:w-3/4 p-5 bg-slate-400 text-white rounded-md shadow-xl border-l-4 border-green-800 hover:bg-slt hover:bg-cover hover:text-white mt-3 ml-3'
          >
            <div className='flex justify-between w-full'>
              <div>
                <div className='text-3xl'>
                  <FontAwesomeIcon icon={faThumbsDown} />
                </div>
                <div className='font-bold text-sm'>Rejected</div>
              </div>
              <div>
                <div
                  className='flex items-center text-xs px-3 bg-green-800 text-green-100 rounded-full'
                  style={{ paddingTop: '.1em', paddingBottom: '.1rem' }}
                >
                  {rejectedCount ? `${pct(rejectedCount, total)}%` : '0%'}
                </div>
              </div>
            </div>
            <div>
              <div className='font-bold text-5xl'>{rejectedCount || 0}</div>
              <div className='font-bold text-sm'>Total</div>
            </div>
          </button>
        </div>

        {/* Middle column */}
        <div className='w-2/5 mb-3 flex-row'>
          {/* Saved */}
          <button
            onClick={() => handleCardClick('Saved')}
            className='flex flex-wrap flex-row sm:flex-col justify-center items-center w-full sm:w-3/4 p-5 bg-green-900 text-slate-200 hover:bg-bg hover:bg-cover hover:text-white rounded-md shadow-xl border-l-4 border-green-400 mt-10 mb-10'
          >
            <div className='flex justify-between w-full'>
              <div>
                <div className='text-3xl'>
                  <FontAwesomeIcon icon={faSave} />
                </div>
                <div className='font-bold text-sm'>Saved</div>
              </div>
              <div>
                <div
                  className='flex items-center text-xs px-3 bg-green-100 text-green-800 rounded-full'
                  style={{ paddingTop: '.1em', paddingBottom: '.1rem' }}
                >
                  {savedCount ? `${pct(savedCount, total)}%` : '0%'}
                </div>
              </div>
            </div>
            <div>
              <div className='font-bold text-5xl'>{savedCount || 0}</div>
              <div className='font-bold text-sm'>Total</div>
            </div>
          </button>

          {/* Pending */}
          <button
            onClick={() => handleCardClick('Pending')}
            className='flex flex-wrap flex-row sm:flex-col justify-center items-center w-full sm:w-3/4 p-5 bg-slate-400 text-white rounded-md shadow-xl border-l-4 border-green-800 hover:bg-slt hover:bg-cover hover:text-white mt-3'
          >
            <div className='flex justify-between w-full'>
              <div>
                <div className='text-3xl'>
                  <FontAwesomeIcon icon={faClock} />
                </div>
                <div className='font-bold text-sm'>Pending</div>
              </div>
              <div>
                <div
                  className='flex items-center text-xs px-3 bg-green-800 text-green-100 rounded-full'
                  style={{ paddingTop: '.1em', paddingBottom: '.1rem' }}
                >
                  {pendingCount ? `${pct(pendingCount, total)}%` : '0%'}
                </div>
              </div>
            </div>
            <div>
              <div className='font-bold text-5xl'>{pendingCount || 0}</div>
              <div className='font-bold text-sm'>Total</div>
            </div>
          </button>
        </div>

        {/* Right column: Pie */}
        <div className='pb-5 pr-5 pt-5'>
          <div className='bg-white p-8 rounded shadow-md'>
            <Pie style={{ height: '375px', width: '375px' }} data={pieData} />
          </div>
        </div>
      </div>

      {/* Tables */}
      <div>
        <h2 className='text-2xl mt-5 ml-3 mb-3'>
          Category: {selectedCategory.label}
        </h2>

        {/* Saved */}
        {showTable && selectedCategory.label === 'Saved' && (
          <div>
            <table className='w-full border ml-3'>
              <thead>
                <tr>
                  <th className='border px-4 py-2'>Quotation No</th>
                  <th className='border px-4 py-2'>Quotation Name</th>
                  <th className='border px-4 py-2'>Customer</th>
                  <th className='border px-4 py-2'>Created Date</th>
                  <th className='border px-4 py-2'>Created By</th>
                </tr>
              </thead>
              <tbody>
                {savedQuotations.length ? (
                  savedQuotations.map((item, i) => (
                    <tr key={`${item.quotation_code}-${i}`}>
                      <td className='border px-4 py-2'>
                        {item.quotation_code}
                      </td>
                      <td className='border px-4 py-2'>
                        {item.quotation_name}
                      </td>
                      <td className='border px-4 py-2'>{item.cus_name}</td>
                      <td className='border px-4 py-2'>
                        {new Date(item.quotation_date).toLocaleDateString(
                          'en-US',
                          {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          }
                        )}
                      </td>
                      <td className='border px-4 py-2'>{item.created_by}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className='px-4 py-2' colSpan='5'>
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pending */}
        {showTable && selectedCategory.label === 'Pending' && (
          <div>
            <table className='w-full border ml-3'>
              <thead>
                <tr>
                  <th className='border px-4 py-2'>Quotation No</th>
                  <th className='border px-4 py-2'>Quotation Name</th>
                  <th className='border px-4 py-2'>Customer</th>
                  <th className='border px-4 py-2'>Created Date</th>
                  <th className='border px-4 py-2'>Created By</th>
                </tr>
              </thead>
              <tbody>
                {pendingQuotations.length ? (
                  pendingQuotations.map((item, i) => (
                    <tr key={`${item.quotation_code}-${i}`}>
                      <td className='border px-4 py-2'>
                        {item.quotation_code}
                      </td>
                      <td className='border px-4 py-2'>
                        {item.quotation_name}
                      </td>
                      <td className='border px-4 py-2'>{item.cus_name}</td>
                      <td className='border px-4 py-2'>
                        {new Date(item.quotation_date).toLocaleDateString(
                          'en-US',
                          {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          }
                        )}
                      </td>
                      <td className='border px-4 py-2'>{item.created_by}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className='px-4 py-2' colSpan='5'>
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Approved */}
        {showTable && selectedCategory.label === 'Approved' && (
          <div>
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
                  <th className='border px-4 py-2'>Reapproved Reason</th>
                </tr>
              </thead>
              <tbody>
                {approvedQuotations.length ? (
                  approvedQuotations.map((item, i) => (
                    <tr key={`${item.quotation_code}-${i}`}>
                      <td className='border px-4 py-2'>
                        {item.quotation_code}
                      </td>
                      <td className='border px-4 py-2'>
                        {item.quotation_name}
                      </td>
                      <td className='border px-4 py-2'>{item.cus_name}</td>
                      <td className='border px-4 py-2'>
                        {new Date(item.quotation_date).toLocaleDateString(
                          'en-US',
                          {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          }
                        )}
                      </td>
                      <td className='border px-4 py-2'>{item.created_by}</td>
                      <td className='border px-4 py-2'>
                        {item.quotation_approved_date}
                      </td>
                      <td className='border px-4 py-2'>{item.approved_by}</td>
                      <td className='border px-4 py-2'>
                        {item.quotation_approved_reason}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className='px-4 py-2' colSpan='8'>
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Rejected */}
        {showTable && selectedCategory.label === 'Rejected' && (
          <div>
            <table className='w-full border ml-3'>
              <thead>
                <tr>
                  <th className='border px-4 py-2'>Quotation No</th>
                  <th className='border px-4 py-2'>Quotation Name</th>
                  <th className='border px-4 py-2'>Customer</th>
                  <th className='border px-4 py-2'>Created Date</th>
                  <th className='border px-4 py-2'>Created By</th>
                  <th className='border px-4 py-2'>Rejected Date</th>
                  <th className='border px-4 py-2'>Rejected By</th>
                  <th className='border px-4 py-2'>Rejected Reason</th>
                </tr>
              </thead>
              <tbody>
                {rejectedQuotations.length ? (
                  rejectedQuotations.map((item, i) => (
                    <tr key={`${item.quotation_code}-${i}`}>
                      <td className='border px-4 py-2'>
                        {item.quotation_code}
                      </td>
                      <td className='border px-4 py-2'>
                        {item.quotation_name}
                      </td>
                      <td className='border px-4 py-2'>{item.cus_name}</td>
                      <td className='border px-4 py-2'>
                        {new Date(item.quotation_date).toLocaleDateString(
                          'en-US',
                          {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          }
                        )}
                      </td>
                      <td className='border px-4 py-2'>{item.created_by}</td>
                      <td className='border px-4 py-2'>
                        {item.quotation_approved_date}
                      </td>
                      <td className='border px-4 py-2'>{item.approved_by}</td>
                      <td className='border px-4 py-2'>
                        {item.quotation_rejected_reason}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className='px-4 py-2' colSpan='8'>
                      No data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
