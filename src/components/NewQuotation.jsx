import React, { useState, useEffect, useMemo } from 'react';
import { faPlus } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import backgroundImage from '../assets/gray.jpg';
import Select from 'react-select';
import api from '../utils/axiosInstance';

function NewQuotation() {
  const navigate = useNavigate();

  // --- Form state
  const [quotationInfo, setQuotationInfo] = useState({ quotationName: '' });
  const [itemInfo, setItemInfo] = useState({
    item_code: '',
    item_delivery: '',
    item_desc: '',
    item_name: '',
    item_pay_terms: '',
    item_price_validity: '',
    item_remarks: '',
    item_vat: '',
    item_warranty: '',
    item_warranty_void: '',
    item_duties_taxes: '',
    unit_price: '',
    item_stock_avail: '',
  });
  const [customerInfo, setCustomerInfo] = useState({ customer: '' });
  const [salesPersonInfo, setSalesPersonInfo] = useState({ salesperson: '' });
  const [companyInfo, setCompanyInfo] = useState({ company: '' });
  const [noteInfo, setNoteInfo] = useState({ quoNote: '' });

  const [selectedItems, setSelectedItems] = useState([]);

  // --- Lookup data
  const [customers, setCustomers] = useState([]);
  const [salespersons, setSalespersons] = useState([]);
  const [items, setItems] = useState([]);
  const [companies, setCompanies] = useState([]);

  // --- UI state
  const [loading, setLoading] = useState(false);

  // --- Errors
  const [errors, setErrors] = useState({
    quotationName: '',
    customer: '',
    salesperson: '',
    company: '',
    items: '',
    quoNote: '',
  });

  const resetForm = () => {
    setQuotationInfo({ quotationName: '' });
    setCustomerInfo({ customer: '' });
    setSalesPersonInfo({ salesperson: '' });
    setCompanyInfo({ company: '' });
    setNoteInfo({ quoNote: '' });
    setItemInfo({
      item_code: '',
      item_delivery: '',
      item_desc: '',
      item_name: '',
      item_pay_terms: '',
      item_price_validity: '',
      item_remarks: '',
      item_vat: '',
      item_warranty: '',
      item_warranty_void: '',
      item_duties_taxes: '',
      unit_price: '',
      item_stock_avail: '',
    });
    setSelectedItems([]);
    setErrors({
      quotationName: '',
      customer: '',
      salesperson: '',
      company: '',
      items: '',
      quoNote: '',
    });
  };

  const clearError = (field) => setErrors((prev) => ({ ...prev, [field]: '' }));

  // Build select options just once when data changes
  const customerOptions = useMemo(
    () => customers.map((c) => ({ value: c.cus_code, label: c.cus_name })),
    [customers]
  );
  const salespersonOptions = useMemo(
    () =>
      salespersons.map((s) => ({
        value: s.sales_p_code,
        label: s.sales_p_name,
      })),
    [salespersons]
  );
  const companyOptions = useMemo(
    () =>
      companies.map((c) => ({
        value: c.idcompany,
        label: c.company_name,
      })),
    [companies]
  );
  const itemOptions = useMemo(
    () => items.map((i) => ({ value: i.item_code, label: i.item_name })),
    [items]
  );

  // Fetch lookups with axios in parallel
  useEffect(() => {
    let mounted = true;
    setLoading(true);

    Promise.all([
      api.get('/v1/customers'),
      api.get('/v1/salespersons'),
      api.get('/v1/api/company'),
      api.get('/v1/items'),
    ])
      .then(([cRes, sRes, coRes, iRes]) => {
        if (!mounted) return;
        setCustomers(cRes.data || []);
        setSalespersons(sRes.data || []);
        setCompanies(coRes.data || []);
        setItems(iRes.data || []);
      })
      .catch((err) => {
        Swal.fire('Failed to load data', err.message || 'Error', 'error');
      })
      .finally(() => mounted && setLoading(false));

    return () => {
      mounted = false;
    };
  }, []);

  const validateForm = () => {
    const newErrors = {
      quotationName: '',
      customer: '',
      salesperson: '',
      company: '',
      items: '',
      quoNote: '',
    };
    let ok = true;

    if (!quotationInfo.quotationName.trim()) {
      newErrors.quotationName = 'Quotation Name is required';
      ok = false;
    }
    if (!customerInfo.customer) {
      newErrors.customer = 'Customer is required';
      ok = false;
    }
    if (!salesPersonInfo.salesperson) {
      newErrors.salesperson = 'Sales Person is required';
      ok = false;
    }
    if (!companyInfo.company) {
      newErrors.company = 'Company is required';
      ok = false;
    }
    if (selectedItems.length === 0) {
      newErrors.items = 'At least one item is required';
      ok = false;
    }

    setErrors(newErrors);
    return ok;
  };

  const handleItemChange = (option) => {
    const selected = items.find((i) => i.item_code === option?.value);
    if (!selected) return;

    setItemInfo({
      item_code: selected.item_code,
      item_delivery: selected.item_delivery,
      item_desc: selected.item_desc,
      item_name: selected.item_name,
      item_pay_terms: selected.item_pay_terms,
      item_price_validity: selected.item_price_validity,
      item_remarks: selected.item_remarks,
      item_vat: selected.item_vat,
      item_warranty: selected.item_warranty,
      item_warranty_void: selected.item_warranty_void,
      item_duties_taxes: selected.item_duties_taxes,
      unit_price: selected.unit_price,
      item_stock_avail: selected.item_stock_avail,
    });
    clearError('items');
  };

  const handleAddItem = () => {
    if (!itemInfo.item_code) {
      Swal.fire('Select an item first', '', 'warning');
      return;
    }
    const exists = selectedItems.some(
      (si) => si.item_code === itemInfo.item_code
    );
    if (exists) {
      Swal.fire('Item Already Added', '', 'warning');
      return;
    }
    setSelectedItems((prev) => [...prev, { ...itemInfo, quantity: 1 }]);
    clearError('items');
    // reset picker-friendly fields
    setItemInfo({
      item_code: '',
      item_delivery: '',
      item_desc: '',
      item_name: '',
      item_pay_terms: '',
      item_price_validity: '',
      item_remarks: '',
      item_vat: '',
      item_warranty: '',
      item_warranty_void: '',
      item_duties_taxes: '',
      unit_price: '',
      item_stock_avail: '',
    });
  };

  const handleRemoveItem = (item) => {
    setSelectedItems((prev) =>
      prev.filter((si) => si.item_code !== item.item_code)
    );
  };

  const handleQuantityChange = (item, newQty) => {
    const qty = Number(newQty);
    if (!qty || qty <= 0) {
      Swal.fire(
        'Invalid Quantity',
        'Quantity is required and must be greater than 0',
        'error'
      );
      return;
    }
    setSelectedItems((prev) =>
      prev.map((si) =>
        si.item_code === item.item_code ? { ...si, quantity: qty } : si
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const confirm = await Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to submit the form?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, submit it!',
    });

    if (!confirm.isConfirmed) return;

    const storedUser =
      localStorage.getItem('user') || sessionStorage.getItem('user');
    let cpcode = '';
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        cpcode = parsed.user_salesp_code || '';
      } catch {
        /* ignore parse errors */
      }
    }

    const payload = {
      quotationName: quotationInfo.quotationName,
      customer: customerInfo.customer,
      salesperson: salesPersonInfo.salesperson,
      company: companyInfo.company,
      quoationNote: noteInfo.quoNote,
      quotationCreated: cpcode,
      items: selectedItems.map((si) => ({
        item_code: si.item_code,
        quantity: si.quantity,
        description: si.item_desc,
        unit_price: si.unit_price,
        vat: si.item_vat,
        price_validity: si.item_price_validity,
        delivery: si.item_delivery,
        pay_terms: si.item_pay_terms,
        remarks: si.item_remarks,
        warranty: si.item_warranty,
        warranty_void: si.item_warranty_void,
        item_duties_taxes: si.item_duties_taxes,
        title: 'Sir/Madam',
        item_stock_avail: si.item_stock_avail,
      })),
    };

    try {
      await api.post('/v1/quotations', payload);
      Swal.fire('Saved!', 'Quotation created successfully.', 'success');
      resetForm();
      navigate('/quotations');
    } catch (err) {
      Swal.fire(
        'Error',
        err?.response?.data?.message || 'Failed to create quotation',
        'error'
      );
    }
  };

  return (
    <div className='w-full h-screen'>
      <main className='w-12/12'>
        <div
          style={{
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: 'cover',
          }}
        >
          <div className='mr-3 mb-4 p-3 ml-3 items-center'>
            <header className='text-xl font-bold mb-2'>Create Quotation</header>
          </div>

          <form className='rounded px-8 pt-6 pb-8 mb-4' onSubmit={handleSubmit}>
            {loading ? (
              <div className='text-gray-600'>Loading…</div>
            ) : (
              <div className='flex justify-between gap-6'>
                {/* Left column */}
                <div className='w-full max-w-lg mx-auto'>
                  {/* Quotation Name */}
                  <div className='mb-4'>
                    <label className='block text-gray-700 text-sm font-bold mb-2'>
                      Quotation Name
                    </label>
                    <input
                      className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                        errors.quotationName ? 'border-red-500' : ''
                      }`}
                      type='text'
                      name='quotationName'
                      value={quotationInfo.quotationName}
                      placeholder='Quotation Name'
                      onChange={(e) => {
                        setQuotationInfo({ quotationName: e.target.value });
                        clearError('quotationName');
                      }}
                    />
                    {errors.quotationName && (
                      <p className='text-red-500 text-xs italic'>
                        {errors.quotationName}
                      </p>
                    )}
                  </div>

                  {/* Item */}
                  <div className='mb-4'>
                    <label className='block text-gray-700 text-sm font-bold mb-2'>
                      Item
                    </label>
                    <div className='relative'>
                      <Select
                        className={`shadow appearance-none border rounded w-full ${
                          errors.items ? 'border-red-500' : ''
                        }`}
                        name='item'
                        options={itemOptions}
                        value={
                          itemInfo.item_code
                            ? {
                                value: itemInfo.item_code,
                                label: itemInfo.item_name,
                              }
                            : null
                        }
                        onChange={handleItemChange}
                        placeholder='Select Items'
                        isSearchable
                      />
                      {errors.items && (
                        <p className='text-red-500 text-xs italic'>
                          {errors.items}
                        </p>
                      )}

                      <label className='block text-gray-700 text-sm font-bold mb-2 mt-5'>
                        Add Items
                      </label>
                      <button
                        type='button'
                        onClick={handleAddItem}
                        className='inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'
                        aria-label='Add Item'
                      >
                        <FontAwesomeIcon icon={faPlus} />
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Selected Items Table */}
                  <div className='mt-4 overflow-x-auto'>
                    <table className='min-w-full'>
                      <thead>
                        <tr>
                          <th className='px-4 py-2 text-left'>Item Name</th>
                          <th className='px-4 py-2 text-left'>Quantity</th>
                          <th className='px-4 py-2 text-left'>Total Price</th>
                          <th className='px-4 py-2 text-left'>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedItems.map((si) => {
                          const qty = Number(si.quantity || 0);
                          const price = Number(si.unit_price || 0);
                          return (
                            <tr key={si.item_code}>
                              <td className='px-4 py-2'>{si.item_name}</td>
                              <td className='px-4 py-2 w-1/12'>
                                <input
                                  type='number'
                                  value={qty}
                                  min='1'
                                  max='1000'
                                  onChange={(e) =>
                                    handleQuantityChange(
                                      si,
                                      Math.min(
                                        parseInt(e.target.value || '0', 10),
                                        1000
                                      )
                                    )
                                  }
                                  required
                                  className='w-20 border rounded px-2 py-1'
                                />
                              </td>
                              <td className='px-4 py-2'>
                                {(qty * price).toFixed(2)}
                              </td>
                              <td className='px-4 py-2'>
                                <button
                                  type='button'
                                  className='text-red-600'
                                  onClick={() => handleRemoveItem(si)}
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                        {selectedItems.length === 0 && (
                          <tr>
                            <td className='px-4 py-3 text-gray-500' colSpan={4}>
                              No items added yet.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Right column */}
                <div className='w-full max-w-lg mx-auto'>
                  {/* Customer */}
                  <div className='mb-4'>
                    <label className='block text-gray-700 text-sm font-bold mb-2'>
                      Customer Name
                    </label>
                    <Select
                      name='customer'
                      options={customerOptions}
                      value={
                        customerInfo.customer
                          ? customerOptions.find(
                              (o) => o.value === customerInfo.customer
                            )
                          : null
                      }
                      onChange={(opt) => {
                        setCustomerInfo({ customer: opt?.value || '' });
                        clearError('customer');
                      }}
                      placeholder='Select Customer'
                      isSearchable
                      className={
                        errors.customer ? 'border-red-500 rounded' : ''
                      }
                    />
                    {errors.customer && (
                      <p className='text-red-500 text-xs italic'>
                        {errors.customer}
                      </p>
                    )}
                  </div>

                  {/* Sales Person */}
                  <div className='mb-4'>
                    <label className='block text-gray-700 text-sm font-bold mb-2'>
                      Sales Person
                    </label>
                    <Select
                      name='salesperson'
                      options={salespersonOptions}
                      value={
                        salesPersonInfo.salesperson
                          ? salespersonOptions.find(
                              (o) => o.value === salesPersonInfo.salesperson
                            )
                          : null
                      }
                      onChange={(opt) => {
                        setSalesPersonInfo({ salesperson: opt?.value || '' });
                        clearError('salesperson');
                      }}
                      placeholder='Select Sales Person'
                      isSearchable
                      className={
                        errors.salesperson ? 'border-red-500 rounded' : ''
                      }
                    />
                    {errors.salesperson && (
                      <p className='text-red-500 text-xs italic'>
                        {errors.salesperson}
                      </p>
                    )}
                  </div>

                  {/* Company */}
                  <div className='mb-4'>
                    <label className='block text-gray-700 text-sm font-bold mb-2'>
                      Company
                    </label>
                    <Select
                      name='company'
                      options={companyOptions}
                      value={
                        companyInfo.company
                          ? companyOptions.find(
                              (o) => o.value === companyInfo.company
                            )
                          : null
                      }
                      onChange={(opt) => {
                        setCompanyInfo({ company: opt?.value || '' });
                        clearError('company');
                      }}
                      placeholder='Select Company'
                      isSearchable
                      className={errors.company ? 'border-red-500 rounded' : ''}
                    />
                    {errors.company && (
                      <p className='text-red-500 text-xs italic'>
                        {errors.company}
                      </p>
                    )}
                  </div>

                  {/* Quotation Note */}
                  <div className='mb-4'>
                    <label className='block text-gray-700 text-sm font-bold mb-2'>
                      Quotation Note
                    </label>
                    <input
                      className={`shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline ${
                        errors.quoNote ? 'border-red-500' : ''
                      }`}
                      type='text'
                      name='quotationNote'
                      value={noteInfo.quoNote}
                      placeholder='Quotation Note'
                      onChange={(e) => {
                        setNoteInfo({ quoNote: e.target.value });
                        if (e.target.value) clearError('quoNote');
                      }}
                    />
                    {errors.quoNote && (
                      <p className='text-red-500 text-xs italic'>
                        {errors.quoNote}
                      </p>
                    )}
                  </div>

                  {/* Submit */}
                  <div className='flex justify-end'>
                    <button
                      className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline'
                      type='submit'
                      disabled={loading}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}

export default NewQuotation;
