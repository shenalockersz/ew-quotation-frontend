import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTrash,
  faPlus,
  faChevronDown,
} from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import api from '../utils/axiosInstance';
import logo from '../assets/logo.png';

// NOTE: Print CSS kept, but simplified
const PrintStyles = () => (
  <style>{`
    @media print {
      body * { visibility: hidden; }
      .print-content, .print-content * { visibility: visible; }
      .print-content { position: absolute; left: 0; top: 0; }
      @page { size: A4; margin: 6mm; }
    }
  `}</style>
);

function View({ user }) {
  const { quotationId } = useParams();
  const navigate = useNavigate();
  const selectRef = useRef(null);

  // Loading / errors
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  // Quotation data
  const [rows, setRows] = useState([]); // line items
  const [header, setHeader] = useState(null); // header (rows[0])

  // Catalog
  const [catalog, setCatalog] = useState([]);
  const [selectedCatalogItem, setSelectedCatalogItem] = useState('');

  // Edit state
  const [editMode, setEditMode] = useState(false);

  // Header editable fields
  const [qName, setQName] = useState('');
  const [qTitle, setQTitle] = useState('');
  const [qTerms, setQTerms] = useState('');
  const [qPriceValidity, setQPriceValidity] = useState('');
  const [qDelivery, setQDelivery] = useState('');
  const [qRemarks, setQRemarks] = useState('');
  const [qWarrantyVoid, setQWarrantyVoid] = useState('');
  const [qTaxDuties, setQTaxDuties] = useState('');
  const [qStockAvail, setQStockAvail] = useState('');

  // Line editable arrays (parallel to rows)
  const [lineQty, setLineQty] = useState([]);
  const [linePrice, setLinePrice] = useState([]);
  const [lineVat, setLineVat] = useState([]);
  const [lineDesc, setLineDesc] = useState([]);
  const [lineWarranty, setLineWarranty] = useState([]);

  const storedUser =
    JSON.parse(
      localStorage.getItem('user') || sessionStorage.getItem('user') || 'null'
    ) ||
    user ||
    null;

  const isApprover =
    (storedUser?.sales_p_type || storedUser?.user_sales_p_type) === 'A';
  const isMember =
    (storedUser?.sales_p_type || storedUser?.user_sales_p_type) === 'M';

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : '';

  const hydrateEditors = (h, r) => {
    if (!h) return;
    setQName(h.quotation_name || '');
    setQTitle(h.title || '');
    setQTerms(h.quotation_item_pay_terms || '');
    setQPriceValidity(h.quotation_item_price_validity || '');
    setQDelivery(h.quotation_item_delivery || '');
    setQRemarks(h.quotation_item_remarks || '');
    setQWarrantyVoid(h.quotation_item_warranty_void || '');
    setQTaxDuties(h.quotation_items_duties_taxes || '');
    setQStockAvail(h.quotation_item_stock_avail || '');

    setLineQty(r.map((x) => x.item_quantity ?? 1));
    setLinePrice(r.map((x) => Number(x.quotation_unit_price ?? 0)));
    setLineVat(r.map((x) => Number(x.quotation_item_vat ?? 0)));
    setLineDesc(r.map((x) => x.quotation_item_desc || ''));
    setLineWarranty(r.map((x) => x.quotation_item_warranty || ''));
  };

  const loadQuotation = async () => {
    try {
      setLoading(true);
      setErr('');
      const res = await api.get(`/v1/quotations/${quotationId}`);
      const list = Array.isArray(res.data) ? res.data : [];
      const head = list[0] || null;
      setRows(list);
      setHeader(head);
      hydrateEditors(head, list);
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  const loadCatalog = async () => {
    try {
      const res = await api.get(`/v1/items`);
      setCatalog(res.data || []);
    } catch {
      /* non-fatal */
    }
  };

  useEffect(() => {
    loadQuotation();
    loadCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotationId]);

  // Status helpers
  const statusLabel = (s) =>
    s === 3
      ? 'Approved'
      : s === 6
      ? 'ReApproved'
      : s === 2
      ? 'Pending Approval'
      : s === 4
      ? 'Rejected'
      : s === 5
      ? 'Resubmitted'
      : 'Saved';

  const statusBadge = (s) =>
    s === 3 || s === 6
      ? 'bg-green-600'
      : s === 2 || s === 5
      ? 'bg-yellow-500'
      : s === 4
      ? 'bg-red-500'
      : 'bg-blue-500';

  // Actions (approve/reject/submit/delete/update)
  const handleAction = async (status, approval_reason, rejected_reason) => {
    try {
      const approver = storedUser?.user_salesp_code || storedUser?.sales_p_code;
      const payload = {
        quotation_status: status,
        approved_by: approver,
        approval_reason,
        rejected_reason,
      };
      await api.put(`/v1/quotations/update/${quotationId}`, payload);
      await loadQuotation();
      Swal.fire('Success', 'Quotation updated', 'success');
    } catch {
      Swal.fire('Error', 'Failed to update', 'error');
    }
  };

  const approve = async () => {
    if (!header) return;
    if (header.quotation_status === 2) {
      const r = await Swal.fire({
        title: 'Approve quotation?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Approve',
      });
      if (r.isConfirmed) handleAction(3, header.approval_reason, null);
    } else if (header.quotation_status === 5) {
      const { value } = await Swal.fire({
        input: 'textarea',
        inputLabel: 'Approval Reason',
        inputPlaceholder: 'Type your approval reason…',
        showCancelButton: true,
      });
      if (value) {
        const c = await Swal.fire({
          title: 'Approve with reason?',
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Approve',
        });
        if (c.isConfirmed) handleAction(6, value, null);
      }
    }
  };

  const reject = async () => {
    const { value } = await Swal.fire({
      input: 'textarea',
      inputLabel: 'Provide Reason to Reject',
      inputPlaceholder: 'Type your rejection reason…',
      showCancelButton: true,
    });
    if (value) {
      const c = await Swal.fire({
        title: 'Reject with reason?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Reject',
      });
      if (c.isConfirmed) handleAction(4, null, value);
    }
  };

  const submit = async () => {
    if (!header) return;
    const r = await Swal.fire({
      title:
        header.quotation_status === 4
          ? 'Resubmit quotation?'
          : 'Submit quotation?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: header.quotation_status === 4 ? 'Resubmit' : 'Submit',
    });
    if (!r.isConfirmed) return;

    const updates =
      header.quotation_status === 1
        ? { quotation_status: 2 }
        : header.quotation_status === 4
        ? { quotation_status: 5 }
        : null;
    if (!updates) return;

    try {
      await api.put(`/v1/quotations/submit/${quotationId}`, updates);
      setEditMode(false);
      await loadQuotation();
      Swal.fire('Submitted', '', 'success');
    } catch {
      Swal.fire('Error', 'Failed to submit', 'error');
    }
  };

  const deleteQuotation = async () => {
    if (!header) return;
    const r = await Swal.fire({
      title: 'Delete quotation?',
      text: 'This will permanently delete the quotation and its items.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
    });
    if (!r.isConfirmed) return;

    try {
      const res = await api.delete(`/v1/quotations/`, {
        params: { qcode: header.quotation_code },
      });
      Swal.fire(
        'Deleted',
        res?.data?.message || 'Quotation deleted',
        'success'
      );
      navigate('/quotations');
    } catch {
      Swal.fire('Error', 'An error occurred while deleting', 'error');
    }
  };

  // Save/cancel edits
  const saveEdits = async () => {
    if (!header) return;

    const itemsPayload = rows.map((row, idx) => ({
      item_code: row.item_id,
      quantity: Number(lineQty[idx] ?? 1),
      description: lineDesc[idx],
      unit_price: Number(linePrice[idx] ?? 0),
      vat: Number(lineVat[idx] ?? 0),
      price_validity: qPriceValidity,
      delivery: qDelivery,
      pay_terms: qTerms,
      remarks: qRemarks,
      warranty: lineWarranty[idx],
      warranty_void: qWarrantyVoid,
      item_duties_taxes: qTaxDuties,
      title: qTitle || 'Sir/Madam',
      item_stock_avail: qStockAvail,
    }));

    const payload = {
      quotationCode: header.quotation_code,
      quotationName: qName,
      items: itemsPayload,
    };

    const r = await Swal.fire({
      title: 'Save changes?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Save',
    });
    if (!r.isConfirmed) return;

    try {
      await api.put(`/v1/quotations/`, payload);
      await loadQuotation();
      setEditMode(false);
      Swal.fire('Updated Successfully!', '', 'success');
    } catch {
      Swal.fire('Error', 'Failed to update', 'error');
    }
  };

  const cancelEdits = () => {
    hydrateEditors(header, rows);
    setEditMode(false);
  };

  // Catalog add/remove
  const addItem = () => {
    if (!selectedCatalogItem) return;
    const sel = catalog.find((i) => i.item_code === selectedCatalogItem);
    if (!sel) return;

    const newRow = {
      item_id: sel.item_code,
      item_name: sel.item_name,
      quotation_item_desc: sel.item_desc || '',
      quotation_item_warranty: sel.item_warranty || '',
      quotation_item_vat: Number(sel.item_vat || 0),
      item_quantity: 1,
      quotation_unit_price: Number(sel.unit_price || 0),
      quotation_total_price: Number(sel.unit_price || 0),
      quotation_delivery: sel.item_delivery || '',
      quotation_item_pay_terms: sel.item_pay_terms || '',
      price_with_vat: Number(sel.unit_price || 0) + Number(sel.item_vat || 0), // fallback if needed
    };

    const next = [...rows, newRow];
    setRows(next);
    hydrateEditors(header, next);
    setSelectedCatalogItem('');
    if (selectRef.current) selectRef.current.value = '';
  };

  const deleteRow = (index) => {
    const next = rows.filter((_, i) => i !== index);
    setRows(next);
    hydrateEditors(header, next);
  };

  // Validated input changes
  const changeQty = (idx, val) => {
    const max = 1000;
    const n = Number(val);
    if (!Number.isFinite(n) || n <= 0)
      return Swal.fire(
        'Invalid Quantity',
        'Must be a positive number',
        'warning'
      );
    if (n > max)
      return Swal.fire('Invalid Quantity', `Cannot exceed ${max}`, 'warning');
    const arr = [...lineQty];
    arr[idx] = n;
    setLineQty(arr);
  };

  const changePrice = (idx, val) => {
    const max = 9_999_999;
    const n = Number(val);
    if (!Number.isFinite(n) || n < 0)
      return Swal.fire('Invalid Unit Price', 'Must be non-negative', 'warning');
    if (n > max)
      return Swal.fire('Invalid Unit Price', `Cannot exceed ${max}`, 'warning');
    const arr = [...linePrice];
    arr[idx] = n;
    setLinePrice(arr);
  };

  const changeVat = (idx, val) => {
    const n = Number(val);
    if (!Number.isFinite(n) || n < 0)
      return Swal.fire('Invalid VAT', 'Must be non-negative', 'warning');
    if (n > 100)
      return Swal.fire('Invalid VAT', 'Cannot exceed 100', 'warning');
    const arr = [...lineVat];
    arr[idx] = n;
    setLineVat(arr);
  };

  const changeDesc = (idx, val) => {
    const arr = [...lineDesc];
    arr[idx] = val;
    setLineDesc(arr);
  };

  const changeWarranty = (idx, val) => {
    const arr = [...lineWarranty];
    arr[idx] = val;
    setLineWarranty(arr);
  };

  // Derived totals
  const lineTotal = useMemo(
    () =>
      rows.map((_, i) => Number(linePrice[i] ?? 0) * Number(lineQty[i] ?? 0)),
    [rows, linePrice, lineQty]
  );

  const lineTotalInclVat = useMemo(
    () =>
      rows.map((_, i) => {
        const unit = Number(linePrice[i] ?? 0);
        const vatPct = Number(lineVat[i] ?? 0);
        const qty = Number(lineQty[i] ?? 0);
        const unitWithVat = unit * (1 + vatPct / 100);
        return unitWithVat * qty;
      }),
    [rows, linePrice, lineVat, lineQty]
  );

  const grandTotalInclVat = useMemo(
    () => lineTotalInclVat.reduce((a, b) => a + b, 0),
    [lineTotalInclVat]
  );

  if (!header) {
    return (
      <div className='m-3 pl-3 w-full font-sans'>
        <PrintStyles />
        <div className='flex items-center justify-between mb-3'>
          <div className='text-2xl font-bold'>Quotation</div>
          <img className='w-32' src={logo} alt='Company Logo' />
        </div>
        {err ? <div className='text-red-600'>{err}</div> : <div>Loading…</div>}
      </div>
    );
  }

  return (
    <div className='m-3 pl-3 w-full font-sans'>
      <PrintStyles />

      {/* Header row */}
      <div className='flex flex-col md:flex-row items-start md:items-center gap-3'>
        <label className='font-bold text-2xl'>
          Quotation #{header.quotation_code}
        </label>
        <h5 className='ml-0 md:ml-4'>
          <span
            className={`flex rounded p-1 px-3 font-bold justify-center items-center text-white ${statusBadge(
              header.quotation_status
            )}`}
          >
            {statusLabel(header.quotation_status)}
          </span>
        </h5>
      </div>

      {header.quotation_status === 4 && !editMode && (
        <label className='font-bold text-xl'>
          Rejected reason: {header.quotation_rejected_reason}
        </label>
      )}
      {header.quotation_status === 6 && !editMode && (
        <label className='font-bold text-xl'>
          ReApproved reason: {header.quotation_approved_reason}
        </label>
      )}

      {/* Top buttons */}
      <div className='pt-3 pb-3 pr-3'>
        <div className='flex justify-end gap-3'>
          {(header.quotation_status === 1 || header.quotation_status === 4) &&
            !editMode && (
              <button
                onClick={submit}
                className='bg-blue-500 text-white px-6 py-1 rounded hover:bg-blue-700'
              >
                {header.quotation_status === 4 ? 'Resubmit' : 'Submit'}
              </button>
            )}
          {(header.quotation_status === 1 || header.quotation_status === 4) &&
            !editMode && (
              <button
                onClick={() => setEditMode(true)}
                className='bg-green-500 text-white px-6 py-1 rounded hover:bg-green-700'
              >
                Edit
              </button>
            )}
          {header.quotation_status === 1 && !editMode && (
            <button
              onClick={deleteQuotation}
              className='bg-red-500 text-white px-6 py-1 rounded hover:bg-red-700'
            >
              Delete
            </button>
          )}
          {editMode && (
            <button
              onClick={saveEdits}
              className='bg-green-500 text-white px-6 py-1 rounded hover:bg-green-700'
            >
              Save
            </button>
          )}
          {(header.quotation_status === 2 || header.quotation_status === 5) &&
            isApprover && (
              <button
                onClick={approve}
                className='bg-green-600 text-white px-6 py-1 rounded hover:bg-green-700'
              >
                Approve
              </button>
            )}
          {(header.quotation_status === 2 || header.quotation_status === 5) &&
            isApprover && (
              <button
                onClick={reject}
                className='bg-red-500 text-white px-6 py-1 rounded hover:bg-red-700'
              >
                Reject
              </button>
            )}
          {(header.quotation_status === 3 || header.quotation_status === 6) &&
            !editMode && (
              <button
                onClick={() => window.print()}
                className='bg-gray-500 text-white px-6 py-1 rounded hover:bg-gray-700'
              >
                Download
              </button>
            )}
          {editMode && (
            <button
              onClick={cancelEdits}
              className='bg-red-500 text-white px-6 py-1 rounded hover:bg-red-700'
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Printable content */}
      <div className='print-content border rounded p-5'>
        <div className='flex justify-between'>
          {/* Left block (date / customer) */}
          <div className='w-1/2 mt-32'>
            <div className='pl-5 mt-2 text-sm'>
              <h3 className='font-semibold mb-10'>
                {(() => {
                  const date = new Date(header.quotation_date);
                  const day = date.getDate();
                  const month = date.toLocaleDateString('en-US', {
                    month: 'long',
                  });
                  const year = date.getFullYear();
                  const suffix =
                    day >= 11 && day <= 13
                      ? 'th'
                      : day % 10 === 1
                      ? 'st'
                      : day % 10 === 2
                      ? 'nd'
                      : day % 10 === 3
                      ? 'rd'
                      : 'th';
                  return (
                    <span>
                      {day}
                      <sup>{suffix}</sup> {month} {year}
                    </span>
                  );
                })()}
              </h3>

              <div>
                {header.contact_person !== 'N/A' && (
                  <div className='font-semibold'>{header.contact_person}</div>
                )}
                {header.c_details !== 'N/A' && (
                  <div className='font-semibold'>{header.c_details}</div>
                )}
                <div className='font-semibold'>{header.cus_name}</div>
                <div className='font-semibold'>
                  {header.cus_addr === 'N/A' && !editMode ? (
                    <></>
                  ) : header.cus_addr ? (
                    <label className='font-semibold'>
                      {header.cus_addr.split(',').map((line, i, arr) => (
                        <span key={i}>
                          {line}
                          {i !== arr.length - 1 && (
                            <>
                              ,<br />
                            </>
                          )}
                        </span>
                      ))}
                    </label>
                  ) : (
                    'Address not available'
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right block (logo + company) */}
          <div className='w-full'>
            <div className='flex justify-end'>
              <img
                className='w-32 sm:w-48 md:w-60 lg:w-72 xl:w-80'
                src={logo}
                alt='Company Logo'
              />
            </div>

            <div className='ml-4 text-right'>
              <h2>
                <b className='text-xl text-green-700'>{header.company_name}</b>
              </h2>
              <h6 className='text-xs text-green-800'>
                <b>Registered Office</b>: {header.company_addr_1}
                <br />
                <span>{header.company_addr_2}</span>
              </h6>
              <h6 className='text-xs text-green-800'>
                <b>Tel</b>: +94 11 7520520 <br />
                <b>Fax</b>: +94 11 2447703 <br />
                <b className='text-xs'>E-mail</b>: info@ewisl.net
              </h6>
            </div>
          </div>
        </div>

        {/* Salutation + header fields */}
        <div className='mt-8 flex justify-between px-3 text-sm'>
          <div>
            <b>
              {editMode ? (
                <input
                  className='border rounded px-2 py-1'
                  value={qTitle}
                  onChange={(e) => setQTitle(e.target.value)}
                />
              ) : (
                `Dear ${header.title},`
              )}
            </b>
          </div>
          <div>Quotation No {header.quotation_code}</div>
        </div>

        <div className='px-3'>
          <h1 className='pt-3 mb-3 text-center text-lg mt-8 font-sans'>
            <u>
              <b>
                {editMode ? (
                  <input
                    className='border rounded px-2 py-1'
                    value={qName}
                    onChange={(e) => setQName(e.target.value)}
                  />
                ) : (
                  header.quotation_name
                )}
              </b>
            </u>
          </h1>
          <label className='mt-12 flex justify-between text-sm'>
            We thank you for giving us the opportunity to quote for high quality
            EWIS range of products to fulfill your IT requirement
          </label>
        </div>

        {/* Items table */}
        <div className='pr-6'>
          <table className='min-w-full border ml-3 mt-8 mb-6'>
            <thead>
              <tr>
                {!editMode && (
                  <th className='border px-4 py-2 border-black text-sm w-1/12'>
                    No
                  </th>
                )}
                <th className='border px-4 py-2 border-black text-sm w-4/12'>
                  Product Description
                </th>
                <th className='border px-4 py-2 border-black text-sm w-1/12'>
                  Qty
                </th>
                <th className='border px-4 py-2 border-black text-sm w-1/12'>
                  Unit Price <span className='flex justify-center'>(Rs.)</span>
                </th>
                {!editMode && (
                  <th
                    className={`border px-4 py-2 border-black text-sm ${
                      editMode ? 'w-2/12' : 'w-1/12'
                    }`}
                  >
                    Total Price{' '}
                    <span className={!editMode ? 'flex justify-center' : ''}>
                      (Rs.)
                    </span>
                  </th>
                )}
                {editMode && (
                  <th
                    className={`border px-4 py-2 border-black text-sm ${
                      editMode ? 'w-2/12' : 'w-1/12'
                    }`}
                  >
                    Vat{' '}
                  </th>
                )}
                <th className='border px-4 py-2 border-black text-sm w-1/12'>
                  Total Price Including Vat (Rs.)
                </th>
                {editMode && (
                  <th className='border px-4 py-2 border-black text-sm w-2/12'>
                    Delete
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {rows.map((item, index) => (
                <tr key={`${item.item_id}-${index}`}>
                  {!editMode && (
                    <td className='border text-center border-black text-sm font-bold w-1/12'>
                      {index + 1}
                    </td>
                  )}
                  <td className='border px-4 py-2 border-black text-sm w-4/12'>
                    <p className='font-semibold'>{item.item_name}</p>
                    <ul style={{ listStyleType: 'disc', paddingLeft: 20 }}>
                      {editMode ? (
                        <input
                          className='w-full'
                          value={lineDesc[index] ?? ''}
                          onChange={(e) => changeDesc(index, e.target.value)}
                        />
                      ) : item.quotation_item_desc ? (
                        item.quotation_item_desc
                          .split(',')
                          .map((point, i) => <li key={i}>{point}</li>)
                      ) : null}
                    </ul>

                    {editMode ? (
                      <input
                        className='w-full'
                        value={lineWarranty[index] ?? ''}
                        onChange={(e) => changeWarranty(index, e.target.value)}
                      />
                    ) : item.quotation_item_warranty === 'N/A' ? (
                      <div />
                    ) : (
                      <div className='font-semibold'>
                        {item.quotation_item_warranty.split(':').map((s, i) => (
                          <ul key={i}>{s}</ul>
                        ))}
                      </div>
                    )}
                  </td>

                  <td className='border px-4 py-2 border-black text-sm text-center'>
                    {editMode ? (
                      <input
                        type='number'
                        min='1'
                        max='1000'
                        value={lineQty[index] ?? 1}
                        onChange={(e) => changeQty(index, e.target.value)}
                        required
                      />
                    ) : (
                      item.item_quantity
                    )}
                  </td>

                  <td className='border px-4 py-2 border-black text-sm text-center'>
                    {editMode ? (
                      <input
                        type='number'
                        min='0'
                        value={linePrice[index] ?? 0}
                        onChange={(e) => changePrice(index, e.target.value)}
                      />
                    ) : item.quotation_unit_price == 0 ? (
                      'FOC'
                    ) : (
                      new Intl.NumberFormat('en-US', {
                        style: 'decimal',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(item.quotation_unit_price)
                    )}
                  </td>

                  <td className='border px-4 py-2 border-black text-sm text-center'>
                    {editMode ? (
                      <input
                        type='number'
                        min='0'
                        max='100'
                        value={lineVat[index] ?? 0}
                        onChange={(e) => changeVat(index, e.target.value)}
                      />
                    ) : item.quotation_unit_price == 0 ? (
                      'FOC'
                    ) : (
                      new Intl.NumberFormat('en-US', {
                        style: 'decimal',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(lineTotal[index] ?? 0)
                    )}
                  </td>

                  <td className='border px-4 py-2 border-black text-sm text-center'>
                    {item.quotation_unit_price == 0
                      ? 'FOC'
                      : new Intl.NumberFormat('en-US', {
                          style: 'decimal',
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }).format(lineTotalInclVat[index] ?? 0)}
                  </td>

                  {editMode && (
                    <td className='border px-4 py-2 border-black text-sm text-center'>
                      <FontAwesomeIcon
                        icon={faTrash}
                        className='text-red-500 hover:text-red-700 cursor-pointer'
                        onClick={() => deleteRow(index)}
                      />
                    </td>
                  )}
                </tr>
              ))}

              {/* Grand total (incl VAT) */}
              <tr>
                <td className='border border-white' />
                <td className='border border-white' />
                <td className='border border-white' />
                <td className='border border-white' />
                <td className='border border-r-black border-b-white' />
                <td className='border px-4 py-2 border-black text-sm text-center font-bold'>
                  {new Intl.NumberFormat('en-US', {
                    style: 'decimal',
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }).format(grandTotalInclVat)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Add new item (edit mode) */}
          {editMode && (
            <div className='mb-4 w-full'>
              <label className='block text-gray-700 text-sm font-bold mb-2'>
                Item
              </label>
              <div className='relative'>
                <div className='flex justify-center items-center'>
                  <select
                    ref={selectRef}
                    className='shadow rounded py-1 px-1 text-gray-700'
                    name='item'
                    onChange={(e) => setSelectedCatalogItem(e.target.value)}
                    defaultValue=''
                  >
                    <option value='' disabled>
                      Select Items
                    </option>
                    {catalog.map((it) => (
                      <option key={it.item_code} value={it.item_code}>
                        {it.item_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='mt-5'>
                  <label className='block text-gray-700 text-sm font-bold mb-2'>
                    Add Items
                  </label>
                  <button
                    type='button'
                    className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded'
                    onClick={addItem}
                  >
                    <FontAwesomeIcon icon={faPlus} /> Add
                  </button>
                </div>
                <div className='absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none'>
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className='text-gray-500'
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Terms / details */}
        <div className='px-5 pt-2 font-sans text-sm space-y-2'>
          <div>
            <b>Price Validity:</b>{' '}
            {editMode ? (
              <textarea
                className='w-1/2'
                value={qPriceValidity}
                onChange={(e) => setQPriceValidity(e.target.value)}
              />
            ) : (
              header.quotation_item_price_validity
            )}
          </div>

          {(header.quotation_item_stock_avail !== 'N/A' || editMode) && (
            <div>
              <b>Stock Availability:</b>{' '}
              {editMode ? (
                <textarea
                  className='w-1/2'
                  value={qStockAvail}
                  onChange={(e) => setQStockAvail(e.target.value)}
                />
              ) : (
                header.quotation_item_stock_avail
              )}
            </div>
          )}

          {(header.quotation_item_delivery !== 'N/A' || editMode) && (
            <div>
              <b>Delivery:</b>{' '}
              {editMode ? (
                <textarea
                  className='w-1/2'
                  value={qDelivery}
                  onChange={(e) => setQDelivery(e.target.value)}
                />
              ) : (
                header.quotation_item_delivery
              )}
            </div>
          )}

          <div>
            <b>Payment Terms:</b>{' '}
            {editMode ? (
              <textarea
                className='w-1/2'
                value={qTerms}
                onChange={(e) => setQTerms(e.target.value)}
              />
            ) : (
              header.quotation_item_pay_terms
            )}
          </div>

          <div>
            <b>Remarks:</b>{' '}
            {editMode ? (
              <textarea
                className='w-1/2'
                value={qRemarks}
                onChange={(e) => setQRemarks(e.target.value)}
              />
            ) : (
              header.quotation_item_remarks
            )}
          </div>

          {(header.quotation_item_warranty !== 'N/A' || editMode) && (
            <div>
              <b>Warranty Void:</b>{' '}
              {editMode ? (
                <textarea
                  className='w-1/2'
                  value={qWarrantyVoid}
                  onChange={(e) => setQWarrantyVoid(e.target.value)}
                />
              ) : (
                header.quotation_item_warranty_void
              )}
            </div>
          )}

          <div>
            <b>Taxes and Duties:</b>{' '}
            {editMode ? (
              <textarea
                className='w-1/2'
                value={qTaxDuties}
                onChange={(e) => setQTaxDuties(e.target.value)}
              />
            ) : (
              header.quotation_items_duties_taxes
            )}
          </div>

          {header.quotation_note && header.quotation_note !== 'N/A' && (
            <div className='mt-7'>
              <strong>{header.quotation_note}</strong>
            </div>
          )}

          <div className='mt-7'>
            <h5>
              We trust our proposal will meet with your approval. If you require
              any clarifications please contact us on{' '}
              <strong>
                {header.sales_p_contact_no} ({header.sales_p_name})
              </strong>{' '}
              and <strong>{header.sales_p_email}</strong>
            </h5>
          </div>
        </div>

        {/* Footer */}
        <div className='pl-6 pt-2 text-sm'>
          <p>
            Assuring our best services & support at all times.
            <br />
            <br />
            Yours faithfully,
            <br />
            <b>{header.company_name}</b>
          </p>
        </div>

        {/* Approver signature */}
        <div className='flex flex-col px-10 mb-10 pt-10'>
          {header.approved_by_salesp_name &&
          (header.quotation_status === 3 || header.quotation_status === 6) ? (
            <div>
              <img
                src={header.approver_signature}
                alt='Approver Signature'
                className='w-32 md:w-32 lg:w-48 mt-2'
              />
              <div className='border-t-2 border-dotted border-black w-1/3 mt-2 text-sm'>
                <label>{header.approved_by_salesp_name}</label>
                <br />
                <label>{header.approved_by_salesp_designation}</label>
              </div>
            </div>
          ) : null}
        </div>

        <hr style={{ border: '2px solid' }} />
      </div>
    </div>
  );
}

export default View;
