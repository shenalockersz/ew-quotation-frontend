import * as React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { BarChart } from '@mui/x-charts/BarChart';
import api from '../utils/axiosInstance';

const chartSetting = {
  xAxis: [{ label: 'Quotations This Week', tickMinStep: 1 }],
  height: 400,
  width: 600,
  margin: { top: 20, bottom: 20, left: 180, right: 20 },
};

export default function Dashboard() {
  const [dataset, setDataset] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        const res = await api.get('/v1/quotations/weekly-count');
        if (!mounted) return;

        const formatted = (res.data || []).map((item) => ({
          name: item.sales_p_name,
          count: Number.parseInt(item.quotation_count, 10) || 0,
        }));

        setDataset(formatted);
      } catch (e) {
        if (!mounted) return;
        setErr(e?.response?.data?.message || 'Failed to load chart data');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const sortedData = useMemo(() => {
    return [...dataset].sort((a, b) => b.count - a.count);
  }, [dataset]);

  const valueFormatter = (v) =>
    `${Math.round(v)} quotation${Math.round(v) === 1 ? '' : 's'}`;

  if (loading) return <div className='text-gray-600 px-4 py-2'>Loading…</div>;
  if (err) return <div className='text-red-600 px-4 py-2'>Error: {err}</div>;
  if (!sortedData.length)
    return (
      <div className='text-gray-600 px-4 py-2'>
        No quotations found for this week.
      </div>
    );

  return (
    <BarChart
      dataset={sortedData}
      yAxis={[{ scaleType: 'band', dataKey: 'name' }]}
      series={[{ dataKey: 'count', label: 'Quotations', valueFormatter }]}
      layout='horizontal'
      {...chartSetting}
    />
  );
}
