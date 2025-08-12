import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  faPen,
  faTrash,
  faChevronDown,
  faChevronUp,
  faEye,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import backgroundImage from '../assets/gray.jpg';
import Swal from 'sweetalert2';
import Fuse from 'fuse.js';
import { RotatingLines } from 'react-loader-spinner';
import { format } from 'date-fns';
import api from '../utils/axiosInstance';

const blankItem = {
  itemName: '',
  itemVatNo: '',
  unitPrice: '',
  itemDescription: '',
  itemPriceValidity: '',
  itemDelivery: '',
  itemPayTerms: '',
  itemRemarks: '',
  itemWarranty: '',
  itemWarrantyVoid: '',
  itemTaxesAndDuties: '',
  itemStockAvailability: '',
};

const blankErrors = {
  itemName: '',
  itemVatNo: '',
  unitPrice: '',
  itemDescription: '',
  itemPriceValidity: '',
  itemDelivery: '',
  itemPayTerms: '',
  itemRemarks: '',
  itemWarranty: '',
  itemWarrantyVoid: '',
  itemTaxesAndDuties: '',
  itemStockAvailability: '',
};

const Items = ({ user }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItemId, setEditingItemId] = useState(null);
  const isApprover = user && user.sales_p_type === 'A';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedRows, setExpandedRows] = useState([]);
  const formRef = useRef(null);
  const [sortConfig, setSortConfig] = useState({
    key: 'item_name',
    direction: 'asc',
  });

  const [itemData, setItemData] = useState([]);
  const [itemInfo, setItemInfo] = useState(blankItem);
  const [validationErrors, setValidationErrors] = useState(blankErrors);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get('/v1/items');
      setItemData(res.data || []);
    } catch (err) {
      Swal.fire(
        'Error',
        err?.response?.data?.message || 'Failed to fetch items',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fuse.js (memoized)
  const fuse = useMemo(
    () =>
      new Fuse(itemData, {
        includeScore: false,
        keys: ['item_name'],
        threshold: 0.3,
      }),
    [itemData]
  );

  // Debounced search -> filtered list
  const [filtered, setFiltered] = useState(itemData);
  useEffect(() => {
    const t = setTimeout(() => {
      if (!searchQuery.trim()) {
        setFiltered(itemData);
      } else {
        const results = fuse.search(searchQuery.trim()).map((r) => r.item);
        setFiltered(results);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery, itemData, fuse]);

  const handleSearch = (q) => setSearchQuery(q);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setItemInfo((p) => ({ ...p, [name]: value }));
    setValidationErrors((p) => ({ ...p, [name]: '' }));
  };

  const validateForm = () => {
    const e = {};
    let ok = true;

    const req = (k, msg) => {
      if (!String(itemInfo[k] || '').trim()) {
        e[k] = msg;
        ok = false;
      }
    };

    req('itemName', 'Item Name is required');
    req('itemVatNo', 'Item VAT Number is required');
    req('unitPrice', 'Unit Price is required');
    req('itemPriceValidity', 'Item Price Validity is required');
    req('itemDelivery', 'Item Delivery is required');
    req('itemPayTerms', 'Item Pay Terms is required');
    req('itemRemarks', 'Item Remarks is required');
    req('itemWarranty', 'Item Warranty is required');
    req('itemWarrantyVoid', 'Item Warranty Void is required');
    req('itemTaxesAndDuties', 'Item Taxes and Duties is required');
    req('itemStockAvailability', 'Item Stock Availability is required');

    if (
      itemInfo.itemVatNo &&
      !/^\d+(\.\d{1,2})?$/.test(itemInfo.itemVatNo.trim())
    ) {
      e.itemVatNo = 'Item VAT must be a number (e.g., 15 or 15.00)';
      ok = false;
    }
    if (
      itemInfo.unitPrice &&
      !/^\d+(\.\d{1,2})?$/.test(itemInfo.unitPrice.trim())
    ) {
      e.unitPrice = 'Enter a valid price (e.g., 12.34)';
      ok = false;
    }

    setValidationErrors(e);
    return ok;
  };

  const resetForm = () => {
    setItemInfo(blankItem);
    setValidationErrors(blankErrors);
    setEditingItemId(null);
  };

  // When selecting an item to edit, populate form
  useEffect(() => {
    if (!editingItemId) return;
    const it = itemData.find((x) => x.item_code === editingItemId);
    if (!it) return;
    setItemInfo({
      itemName: it.item_name || '',
      itemVatNo: it.item_vat || '',
      unitPrice: it.unit_price || '',
      itemDescription: it.item_desc || '',
      itemPriceValidity: it.item_price_validity || '',
      itemDelivery: it.item_delivery || '',
      itemPayTerms: it.item_pay_terms || '',
      itemRemarks: it.item_remarks || '',
      itemWarranty: it.item_warranty || '',
      itemWarrantyVoid: it.item_warranty_void || '',
      itemTaxesAndDuties: it.item_duties_taxes || '',
      itemStockAvailability: it.item_stock_avail || '',
    });
  }, [editingItemId, itemData]);

  const handleEdit = (item) => {
    if (editingItemId) return; // prevent switching mid-edit
    setEditingItemId(item.item_code);
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSave = async (id) => {
    if (!validateForm()) return;

    const confirm = await Swal.fire({
      title: 'Do you want to update the Data?',
      showDenyButton: true,
      showCancelButton: false,
      confirmButtonText: 'Yes',
      denyButtonText: 'No',
    });
    if (!confirm.isConfirmed) return;

    const selected = itemData.find((i) => i.item_code === id);
    if (!selected) {
      Swal.fire('Error', 'Item not found', 'error');
      return;
    }

    const payload = {
      item_code: selected.item_code,
      item_name: itemInfo.itemName,
      item_vat: itemInfo.itemVatNo,
      unit_price: itemInfo.unitPrice,
      item_desc: itemInfo.itemDescription,
      item_price_validity: itemInfo.itemPriceValidity,
      item_delivery: itemInfo.itemDelivery,
      item_pay_terms: itemInfo.itemPayTerms,
      item_remarks: itemInfo.itemRemarks,
      item_warranty: itemInfo.itemWarranty,
      item_warranty_void: itemInfo.itemWarrantyVoid,
      item_duties_taxes: itemInfo.itemTaxesAndDuties,
      item_stock_avail: itemInfo.itemStockAvailability,
      updated_by: user?.sales_p_code,
      updated_date: format(new Date(), 'yyyy-MM-dd'),
    };

    try {
      setSaving(true);
      await api.put(`/v1/items/${payload.item_code}`, payload);

      // Optimistic local update
      setItemData((prev) =>
        prev.map((it) => (it.item_code === id ? { ...it, ...payload } : it))
      );

      resetForm();
      Swal.fire('Success!', 'Data updated successfully', 'success');
    } catch (err) {
      Swal.fire(
        'Error!',
        err?.response?.data?.message || 'Error updating data',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const saveNew = async () => {
    const datatosend = {
      itemInfo,
      createdby: user?.sales_p_code,
    };
    try {
      console.log(datatosend);

      setSaving(true);
      await api.post('/v1/items', datatosend);
      await fetchData();
      resetForm();
      Swal.fire('Submitted!', 'Item inserted successfully', 'success');
    } catch (err) {
      Swal.fire(
        'Error!',
        err?.response?.data?.message || 'Error inserting data',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (editingItemId) {
      await handleSave(editingItemId);
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

  const handleDelete = async (item) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'You will not be able to recover this Item data!',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    try {
      await api.delete(`/v1/items/${item.item_code}`);
      setItemData((prev) => prev.filter((x) => x.item_code !== item.item_code));
      Swal.fire('Deleted!', 'Item data has been deleted.', 'success');
    } catch (err) {
      if (err?.response?.status === 409) {
        Swal.fire(
          'Error!',
          'This item is associated with other data.',
          'error'
        );
      } else {
        Swal.fire(
          'Error!',
          err?.response?.data?.message || 'Error deleting Item',
          'error'
        );
      }
    }
  };

  const toggleRow = (index) => {
    setExpandedRows((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc')
      direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    const arr = [...filtered];
    const { key, direction } = sortConfig;
    if (!key) return arr;

    return arr.sort((a, b) => {
      let aVal = a[key];
      let bVal = b[key];

      if (key === 'unit_price') {
        aVal = Number(aVal) || 0;
        bVal = Number(bVal) || 0;
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filtered, sortConfig]);

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

      <div
        style={{
          backgroundImage: `url(${backgroundImage})`,
          backgroundSize: 'cover',
        }}
      >
        <div className='mr-3 mb-4 p-3 ml-3 items-center '>
          <header className='text-xl font-bold mb-2'>Items</header>
        </div>

        <form
          ref={formRef}
          className='shadow-md rounded px-8 pt-6 pb-8 mb-4'
          onSubmit={handleSubmit}
        >
          <div className='flex justify-between'>
            {/* Col 1 */}
            <div className='w-full max-w-lg mx-auto'>
              {/* Item Name */}
              <div className='mb-4 mr-3'>
                <label className='block text-gray-700 text-sm font-bold mb-2'>
                  Item Name
                </label>
                <input
                  className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                    validationErrors.itemName ? 'border-red-500' : ''
                  }`}
                  type='text'
                  placeholder='Item Name'
                  name='itemName'
                  value={itemInfo.itemName}
                  onChange={handleChange}
                />
                {validationErrors.itemName && (
                  <p className='text-red-500 text-xs italic'>
                    {validationErrors.itemName}
                  </p>
                )}
              </div>

              {/* Unit Price */}
              <div className='mb-4 mr-3 '>
                <label className='block text-gray-700 text-sm font-bold mb-2'>
                  Unit Price
                </label>
                <input
                  className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                    validationErrors.unitPrice ? 'border-red-500' : ''
                  }`}
                  type='text'
                  placeholder='Unit Price'
                  name='unitPrice'
                  value={itemInfo.unitPrice}
                  onChange={handleChange}
                />
                {validationErrors.unitPrice && (
                  <p className='text-red-500 text-xs italic'>
                    {validationErrors.unitPrice}
                  </p>
                )}
              </div>

              {/* VAT */}
              <div className='mb-4 mr-3'>
                <label className='block text-gray-700 text-sm font-bold mb-2'>
                  Item Vat (%)
                </label>
                <input
                  className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                    validationErrors.itemVatNo ? 'border-red-500' : ''
                  }`}
                  type='text'
                  placeholder='Item Vat'
                  name='itemVatNo'
                  value={itemInfo.itemVatNo}
                  onChange={handleChange}
                />
                {validationErrors.itemVatNo && (
                  <p className='text-red-500 text-xs italic'>
                    {validationErrors.itemVatNo}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className='mb-4 mr-3'>
                <label className='block text-gray-700 text-sm font-bold mb-2'>
                  Item Description
                </label>
                <textarea
                  className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                    validationErrors.itemDescription ? 'border-red-500' : ''
                  }`}
                  placeholder='Item Description 1 , Item Description 2 , Item Description 3'
                  name='itemDescription'
                  value={itemInfo.itemDescription}
                  onChange={handleChange}
                />
                {validationErrors.itemDescription && (
                  <p className='text-red-500 text-xs italic'>
                    {validationErrors.itemDescription}
                  </p>
                )}
              </div>
            </div>

            {/* Col 2 */}
            <div className='w-full max-w-lg mx-auto'>
              {/* Price Validity */}
              <div className='mb-4 mr-3'>
                <label className='block text-gray-700 text-sm font-bold mb-2'>
                  Item Price Validity
                </label>
                <input
                  className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                    validationErrors.itemPriceValidity ? 'border-red-500' : ''
                  }`}
                  type='text'
                  placeholder='Item Price Validity'
                  name='itemPriceValidity'
                  value={itemInfo.itemPriceValidity}
                  onChange={handleChange}
                />
                {validationErrors.itemPriceValidity && (
                  <p className='text-red-500 text-xs italic'>
                    {validationErrors.itemPriceValidity}
                  </p>
                )}
              </div>

              {/* Delivery */}
              <div className='mb-4 mr-3'>
                <label className='block text-gray-700 text-sm font-bold mb-2'>
                  Item delivery
                </label>
                <textarea
                  className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                    validationErrors.itemDelivery ? 'border-red-500' : ''
                  }`}
                  placeholder='Item delivery'
                  name='itemDelivery'
                  value={itemInfo.itemDelivery}
                  onChange={handleChange}
                />
                {validationErrors.itemDelivery && (
                  <p className='text-red-500 text-xs italic'>
                    {validationErrors.itemDelivery}
                  </p>
                )}
              </div>

              {/* Pay Terms */}
              <div className='mb-4 mr-3'>
                <label className='block text-gray-700 text-sm font-bold mb-2'>
                  Item Pay Terms
                </label>
                <textarea
                  className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                    validationErrors.itemPayTerms ? 'border-red-500' : ''
                  }`}
                  placeholder='Item Pay Terms'
                  name='itemPayTerms'
                  value={itemInfo.itemPayTerms}
                  onChange={handleChange}
                />
                {validationErrors.itemPayTerms && (
                  <p className='text-red-500 text-xs italic'>
                    {validationErrors.itemPayTerms}
                  </p>
                )}
              </div>

              {/* Taxes & Duties */}
              <div className='mb-4 mr-3'>
                <label className='block text-gray-700 text-sm font-bold mb-2'>
                  Item Taxes and Duties
                </label>
                <textarea
                  className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                    validationErrors.itemTaxesAndDuties ? 'border-red-500' : ''
                  }`}
                  placeholder='Item Taxes and Duties'
                  name='itemTaxesAndDuties'
                  value={itemInfo.itemTaxesAndDuties}
                  onChange={handleChange}
                />
                {validationErrors.itemTaxesAndDuties && (
                  <p className='text-red-500 text-xs italic'>
                    {validationErrors.itemTaxesAndDuties}
                  </p>
                )}
              </div>
            </div>

            {/* Col 3 */}
            <div className='w-full max-w-lg mx-auto'>
              {/* Remarks */}
              <div className='mb-4'>
                <label className='block text-gray-700 text-sm font-bold mb-2'>
                  Item Remarks
                </label>
                <textarea
                  className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                    validationErrors.itemRemarks ? 'border-red-500' : ''
                  }`}
                  placeholder='Item Remarks'
                  name='itemRemarks'
                  value={itemInfo.itemRemarks}
                  onChange={handleChange}
                />
                {validationErrors.itemRemarks && (
                  <p className='text-red-500 text-xs italic'>
                    {validationErrors.itemRemarks}
                  </p>
                )}
              </div>

              {/* Warranty */}
              <div className='mb-4'>
                <label className='block text-gray-700 text-sm font-bold mb-2'>
                  Item Warranty
                </label>
                <textarea
                  className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                    validationErrors.itemWarranty ? 'border-red-500' : ''
                  }`}
                  placeholder='Item Warranty'
                  name='itemWarranty'
                  value={itemInfo.itemWarranty}
                  onChange={handleChange}
                />
                {validationErrors.itemWarranty && (
                  <p className='text-red-500 text-xs italic'>
                    {validationErrors.itemWarranty}
                  </p>
                )}
              </div>

              {/* Warranty Void */}
              <div className='mb-4'>
                <label className='block text-gray-700 text-sm font-bold mb-2'>
                  Item Warranty Void
                </label>
                <textarea
                  className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                    validationErrors.itemWarrantyVoid ? 'border-red-500' : ''
                  }`}
                  placeholder='Item Warranty Void'
                  name='itemWarrantyVoid'
                  value={itemInfo.itemWarrantyVoid}
                  onChange={handleChange}
                />
                {validationErrors.itemWarrantyVoid && (
                  <p className='text-red-500 text-xs italic'>
                    {validationErrors.itemWarrantyVoid}
                  </p>
                )}
              </div>

              {/* Stock Availability */}
              <div className='mb-4'>
                <label className='block text-gray-700 text-sm font-bold mb-2'>
                  Item Stock Availability
                </label>
                <textarea
                  className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                    validationErrors.itemStockAvailability
                      ? 'border-red-500'
                      : ''
                  }`}
                  placeholder=' Item Stock Availability'
                  name='itemStockAvailability'
                  value={itemInfo.itemStockAvailability}
                  onChange={handleChange}
                />
                {validationErrors.itemStockAvailability && (
                  <p className='text-red-500 text-xs italic'>
                    {validationErrors.itemStockAvailability}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className='flex justify-end'>
                {editingItemId ? (
                  <div className='flex'>
                    <button
                      type='button'
                      onClick={() => handleSave(editingItemId)}
                      disabled={saving}
                      className='bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mr-2 focus:outline-none focus:shadow-outline'
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type='button'
                      disabled={saving}
                      onClick={resetForm}
                      className='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type='submit'
                    disabled={saving}
                    className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'
                  >
                    {saving ? 'Submitting...' : 'Submit'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* List */}
      <div className='pb-20'>
        <main className='w-11/12'>
          <div className='flex items-center space-x-3 p-4'>
            <input
              type='text'
              placeholder='Search by Item Name'
              className='border px-4 py-2 rounded w-1/3 mr-3'
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>

          <table className='w-full border ml-3'>
            <thead>
              <tr>
                <th
                  className='border px-4 py-2 cursor-pointer'
                  onClick={() => handleSort('item_name')}
                >
                  Item Name{' '}
                  {sortConfig.key === 'item_name' &&
                    (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className='border px-4 py-2 cursor-pointer'
                  onClick={() => handleSort('unit_price')}
                >
                  Price{' '}
                  {sortConfig.key === 'unit_price' &&
                    (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className='border px-4 py-2'>Warranty</th>
                <th className='border px-4 py-2'>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((item, index) => (
                <React.Fragment key={item.item_code || index}>
                  <tr>
                    <td className='border px-4 py-2'>{item.item_name}</td>
                    <td className='border px-2 py-2 text-right '>
                      Rs.&nbsp;
                      {new Intl.NumberFormat('en-US', {
                        style: 'decimal',
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(Number(item.unit_price) || 0)}
                    </td>
                    <td className='border px-4 py-2'>{item.item_warranty}</td>
                    <td className='border px-4 py-3 h-full flex justify-between items-center'>
                      <FontAwesomeIcon
                        icon={
                          expandedRows.includes(index)
                            ? faChevronUp
                            : faChevronDown
                        }
                        className='cursor-pointer text-gray-600'
                        onClick={() => toggleRow(index)}
                      />
                      <FontAwesomeIcon
                        icon={faPen}
                        className='text-blue-500 hover:text-blue-700 cursor-pointer mx-2'
                        title='Edit'
                        onClick={() => handleEdit(item)}
                      />
                      {isApprover && (
                        <FontAwesomeIcon
                          icon={faTrash}
                          className='text-red-500 hover:text-red-700 cursor-pointer'
                          title='Delete'
                          onClick={() => handleDelete(item)}
                        />
                      )}
                      {isApprover && user?.user_id === 1 && (
                        <FontAwesomeIcon
                          icon={faEye}
                          className='text-gray-500 hover:text-gray-700 cursor-pointer'
                          title='View'
                          onClick={() => console.log(item)}
                        />
                      )}
                    </td>
                  </tr>
                  {expandedRows.includes(index) && (
                    <tr>
                      <td colSpan='4' className='border px-4 py-2 bg-gray-100'>
                        <ul>
                          <li>
                            <strong>Description:</strong> {item.item_desc}
                          </li>
                          <li>
                            <strong>VAT:</strong> {item.item_vat}%
                          </li>
                          <li>
                            <strong>Price Validity:</strong>{' '}
                            {item.item_price_validity}
                          </li>
                          <li>
                            <strong>Stock Availability:</strong>{' '}
                            {item.item_stock_avail}
                          </li>
                          <li>
                            <strong>Delivery:</strong> {item.item_delivery}
                          </li>
                          <li>
                            <strong>Pay Terms:</strong> {item.item_pay_terms}
                          </li>
                          <li>
                            <strong>Remarks:</strong> {item.item_remarks}
                          </li>
                          <li>
                            <strong>Warranty Void:</strong>{' '}
                            {item.item_warranty_void}
                          </li>
                          <li>
                            <strong>Taxes and Duties:</strong>{' '}
                            {item.item_duties_taxes}
                          </li>
                        </ul>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </main>
      </div>
    </div>
  );
};

export default Items;
