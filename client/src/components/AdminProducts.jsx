import { useCallback, useEffect, useState } from 'react';
import { apiGet, apiPost, apiPut } from '../services/api';
import { categoryName } from '../utils/categories';

const BLANK = {
  name: '', category: '', brand: '', price: '', mrp: '', stock: '',
  icon: '💊', description: '', requiresPrescription: false,
};

function Field({ label, children }) {
  return (
    <div className="mb-2">
      <label className="form-label small mb-1">{label}</label>
      {children}
    </div>
  );
}

export default function AdminProducts() {
  const [cats, setCats] = useState([]);
  const [list, setList] = useState([]);
  const [q, setQ] = useState('');
  const [form, setForm] = useState(BLANK);
  const [editId, setEditId] = useState('');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await apiGet(`/admin/products${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`);
      setList(d.products);
    } catch (err) {
      setError(err.message);
    }
  }, [q]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    apiGet('/products/categories').then((d) => setCats(d.categories)).catch(() => {});
  }, []);

  const on = (e) => {
    const { name, type, checked, value } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const startEdit = (p) => {
    setEditId(p._id);
    setMsg('');
    setError('');
    setForm({
      name: p.name, category: p.category, brand: p.brand || '', price: p.price, mrp: p.mrp, stock: p.stock,
      icon: p.icon || '💊', description: p.description || '', requiresPrescription: p.requiresPrescription,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const reset = () => { setEditId(''); setForm(BLANK); };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    setBusy(true);
    try {
      if (editId) await apiPut(`/admin/products/${editId}`, form);
      else await apiPost('/admin/products', form);
      setMsg(editId ? 'Product updated.' : 'Product added. It now appears in its category.');
      reset();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (p) => {
    setError('');
    try {
      await apiPut(`/admin/products/${p._id}`, { status: p.status === 'approved' ? 'hidden' : 'approved' });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <form className="mc-card mb-3" onSubmit={save} noValidate>
        <h5>{editId ? 'Edit product' : 'Add product'}</h5>
        {error && <div className="alert alert-danger py-2">{error}</div>}
        {msg && <div className="alert alert-success py-2">{msg}</div>}

        <div className="row">
          <div className="col-md-6"><Field label="Name">
            <input className="form-control" name="name" value={form.name} onChange={on} />
          </Field></div>
          <div className="col-md-3"><Field label="Category">
            <select className="form-select" name="category" value={form.category} onChange={on}>
              <option value="">Select...</option>
              {cats.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </Field></div>
          <div className="col-md-3"><Field label="Brand">
            <input className="form-control" name="brand" value={form.brand} onChange={on} />
          </Field></div>
          <div className="col-6 col-md-3"><Field label="Price (₹)">
            <input className="form-control" type="number" min="0" name="price" value={form.price} onChange={on} />
          </Field></div>
          <div className="col-6 col-md-3"><Field label="MRP (₹)">
            <input className="form-control" type="number" min="0" name="mrp" value={form.mrp} onChange={on} />
          </Field></div>
          <div className="col-6 col-md-3"><Field label="Stock">
            <input className="form-control" type="number" min="0" name="stock" value={form.stock} onChange={on} />
          </Field></div>
          <div className="col-6 col-md-3"><Field label="Icon (emoji)">
            <input className="form-control" name="icon" maxLength={8} value={form.icon} onChange={on} />
          </Field></div>
          <div className="col-12"><Field label="Description">
            <textarea className="form-control" rows={2} name="description" maxLength={1000} value={form.description} onChange={on} />
          </Field></div>
        </div>

        <div className="form-check mb-3">
          <input className="form-check-input" type="checkbox" id="rx" name="requiresPrescription"
            checked={form.requiresPrescription} onChange={on} />
          <label className="form-check-label" htmlFor="rx">Requires prescription</label>
        </div>

        <div className="d-flex gap-2">
          <button className="btn btn-mc-primary" type="submit" disabled={busy}>
            {busy ? 'Saving...' : editId ? 'Save changes' : 'Add product'}
          </button>
          {editId && <button type="button" className="btn btn-mc-outline" onClick={reset}>Cancel edit</button>}
        </div>
      </form>

      <div className="mc-card">
        <div className="d-flex flex-wrap justify-content-between gap-2 mb-2">
          <h5 className="mb-0">All products ({list.length})</h5>
          <input className="form-control" style={{ maxWidth: 260 }} placeholder="Search by name"
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="table-responsive">
          <table className="table align-middle mb-0">
            <thead>
              <tr><th>Product</th><th>Category</th><th>Price / MRP</th><th>Stock</th><th>Status</th><th /></tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p._id}>
                  <td>
                    {p.icon} {p.name}{' '}
                    {p.requiresPrescription && <span className="mc-chip mc-chip--bad">Rx</span>}{' '}
                    {p.isDemo && <span className="mc-chip mc-chip--demo">DEMO</span>}
                  </td>
                  <td>{categoryName(p.category)}</td>
                  <td>₹{p.price} / ₹{p.mrp}</td>
                  <td>{p.stock}</td>
                  <td>
                    <span className={`mc-chip ${p.status === 'approved' ? 'mc-chip--ok' : 'mc-chip--bad'}`}>
                      {p.status === 'approved' ? 'Visible' : 'Hidden'}
                    </span>
                  </td>
                  <td className="text-nowrap">
                    <button className="btn btn-mc-outline btn-mc-sm me-1" onClick={() => startEdit(p)}>Edit</button>
                    <button className="btn btn-mc-outline btn-mc-sm" onClick={() => toggle(p)}>
                      {p.status === 'approved' ? 'Hide' : 'Show'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}