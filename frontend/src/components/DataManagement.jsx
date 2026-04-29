import { useState, useEffect, useCallback, useRef } from 'react'

const API = import.meta.env.VITE_API_URL || ''

/* Tariff defaults matching backend */
const TARIFF_BY_YEAR = {
  2019: 1.0, 2020: 1.0, 2021: 1.0, 2022: 1.0, 2023: 1.0, 2024: 1.0,
  2026: 1.8,
}

function defaultTariff(year) {
  if (year == null) return null
  return TARIFF_BY_YEAR[year] ?? null
}

export default function DataManagement() {
  const [tab, setTab] = useState('farmers')
  return (
    <div style={s.root}>
      <div style={s.tabBar}>
        <button
          style={tab === 'farmers' ? s.tabActive : s.tab}
          onClick={() => setTab('farmers')}
        >👨‍🌾 Крестьяне</button>
        <button
          style={tab === 'contracts' ? s.tabActive : s.tab}
          onClick={() => setTab('contracts')}
        >📄 Договоры</button>
        <button
          style={tab === 'stats' ? s.tabActive : s.tab}
          onClick={() => setTab('stats')}
        >📊 Статистика</button>
      </div>
      <div style={s.content}>
        {tab === 'farmers' && <FarmersPanel />}
        {tab === 'contracts' && <ContractsPanel />}
        {tab === 'stats' && <StatsPanel />}
      </div>
    </div>
  )
}

/* ========== FARMERS PANEL ========== */

function FarmersPanel() {
  const [farmers, setFarmers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [showForm, setShowForm] = useState(false)      // true = creating or editing
  const [editing, setEditing] = useState(null)         // farmer object or null
  const [form, setForm] = useState(emptyFarmer())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Excel import
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileRef = useRef(null)

  const load = useCallback(async (q) => {
    setLoading(true)
    try {
      const url = q
        ? `${API}/api/farmers?search=${encodeURIComponent(q)}`
        : `${API}/api/farmers`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Ошибка загрузки')
      setFarmers(await res.json())
      setError(null)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load(search) }, [search, load])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyFarmer())
    setShowForm(true)
  }

  const openEdit = (f) => {
    setEditing(f)
    setShowForm(true)
    setForm({
      full_name: f.full_name || '',
      iin: f.iin || '',
      contract_number: f.contract_number || '',
      phone: f.phone || '',
      address: f.address || '',
    })
  }

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.iin.trim()) {
      setError('ФИО и ИИН обязательны')
      return
    }
    setSaving(true)
    setError(null)
    try {
      let res
      if (editing) {
        res = await fetch(`${API}/api/farmers/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.detail || 'Ошибка обновления')
        }
      } else {
        res = await fetch(`${API}/api/farmers`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.detail || 'Ошибка создания')
        }
      }
      setEditing(null)
      setForm(emptyFarmer())
      setShowForm(false)
      load(search)
    } catch (e) {
      setError(e.message)
    } finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить крестьянина и все его договоры?')) return
    try {
      const res = await fetch(`${API}/api/farmers/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Ошибка удаления')
      load(search)
    } catch (e) { setError(e.message) }
  }

  const handleExcelImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${API}/api/farmers/import-excel`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Ошибка импорта')
      setImportResult(data)
      load(search)
    } catch (e) {
      setError(e.message)
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  return (
    <div style={s.panel}>
      <div style={s.panelHeader}>
        <h2 style={s.panelTitle}>👨‍🌾 Крестьяне</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ ...s.addBtn, background: '#5856d6', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            📥 Импорт Excel
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelImport}
              style={{ display: 'none' }}
            />
          </label>
          <button style={s.addBtn} onClick={openCreate}>+ Добавить</button>
        </div>
      </div>

      <input
        style={s.searchInput}
        placeholder="🔍 Поиск по ФИО, ИИН, номеру договора..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {error && <div style={s.err}>{error}</div>}

      {importing && <div style={s.loading}>⏳ Импорт Excel...</div>}
      {importResult && (
        <div style={s.importOk}>
          ✅ Импортировано крестьян: {importResult.imported || 0}
          {importResult.errors?.length > 0 && (
            <span style={{ color: '#ff9500', marginLeft: 8 }}>
              ⚠️ Ошибок: {importResult.errors.length}
            </span>
          )}
          <button style={{ ...s.smallDelBtn, marginLeft: 10 }} onClick={() => setImportResult(null)}>✕</button>
        </div>
      )}

      {/* Form */}
      {(editing || showForm) && (
        <div style={s.formCard}>
          <h3 style={s.formTitle}>{editing ? 'Редактировать' : 'Новый крестьянин'}</h3>
          <div style={s.formGrid}>
            <Field label="ФИО *" value={form.full_name} onChange={v => handleChange('full_name', v)} />
            <Field label="ИИН *" value={form.iin} onChange={v => handleChange('iin', v)} />
            <Field label="Номер договора" value={form.contract_number} onChange={v => handleChange('contract_number', v)} />
            <Field label="Телефон" value={form.phone} onChange={v => handleChange('phone', v)} />
          </div>
          <Field label="Адрес" value={form.address} onChange={v => handleChange('address', v)} wide />
          <div style={s.formBtns}>
            <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? '⏳' : '💾'} {editing ? 'Обновить' : 'Создать'}
            </button>
            <button style={s.cancelBtn} onClick={() => { setEditing(null); setForm(emptyFarmer()); setShowForm(false) }}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading && <div style={s.loading}>Загрузка...</div>}
      {!loading && farmers.length === 0 && !error && (
        <div style={s.empty}>Нет данных</div>
      )}
      <div style={s.list}>
        {farmers.map(f => (
          <div key={f.id} style={s.card}>
            <div style={s.cardBody}>
              <div style={s.cardTitle}>{f.full_name}</div>
              <div style={s.cardRow}>ИИН: <strong>{f.iin}</strong></div>
              {f.contract_number && <div style={s.cardRow}>Договор: {f.contract_number}</div>}
              {f.phone && <div style={s.cardRow}>📞 {f.phone}</div>}
              {f.address && <div style={s.cardRow}>📍 {f.address}</div>}
            </div>
            <div style={s.cardActions}>
              <button style={s.editBtn} onClick={() => openEdit(f)}>✏️</button>
              <button style={s.delBtn} onClick={() => handleDelete(f.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ========== CONTRACTS PANEL ========== */

function ContractsPanel() {
  const [contracts, setContracts] = useState([])
  const [farmers, setFarmers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // New contract form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyContract())
  const [parcels, setParcels] = useState([])   // array of ContractParcelItem
  const [saving, setSaving] = useState(false)

  // Edit mode
  const [editingContract, setEditingContract] = useState(null)

  // Excel import
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState(null)
  const fileRef = useRef(null)

  const loadContracts = useCallback(async (q) => {
    setLoading(true)
    try {
      const url = q
        ? `${API}/api/contracts?search=${encodeURIComponent(q)}`
        : `${API}/api/contracts`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Ошибка загрузки')
      setContracts(await res.json())
      setError(null)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  const loadFarmers = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/farmers`)
      if (res.ok) setFarmers(await res.json())
    } catch (_) {}
  }, [])

  useEffect(() => { loadContracts(search) }, [search, loadContracts])
  useEffect(() => { loadFarmers() }, [loadFarmers])

  const openCreate = () => {
    setEditingContract(null)
    setShowForm(true)
    setForm(emptyContract())
    setParcels([])
  }

  const openEdit = (c) => {
    setEditingContract(c)
    setShowForm(true)
    setForm({
      farmer_id: c.farmer_id ?? null,
      contract_number: c.contract_number || '',
      contract_date: c.contract_date || '',
      total_water_volume: c.total_water_volume ?? null,
      actual_water_volume: c.actual_water_volume ?? null,
      tariff_amount: c.tariff_amount ?? null,
      year: c.year ?? null,
    })
    setParcels((c.parcels || []).map(p => ({
      id: p.id,
      parcel_id: p.parcel_id || null,
      cadastral_number: p.cadastral_number || '',
      distribution_channel: p.distribution_channel || '',
      main_channel: p.main_channel || '',
      culture: p.culture || '',
      doc_hectares: p.doc_hectares ?? null,
      irrigated_hectares: p.irrigated_hectares ?? null,
      rural_district: p.rural_district || '',
      geom: null,
    })))
  }

  const handleSave = async () => {
    if (!form.farmer_id || !form.contract_number.trim()) {
      setError('Крестьянин и номер договора обязательны')
      return
    }
    setSaving(true)
    setError(null)
    try {
      let res
      if (editingContract) {
        // БАГ 4 FIX: PUT /full сохраняет договор + участки вместе
        res = await fetch(`${API}/api/contracts/${editingContract.id}/full`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            farmer_id: editingContract.farmer_id,
            contract_number: form.contract_number,
            contract_date: form.contract_date || null,
            total_water_volume: form.total_water_volume,
            actual_water_volume: form.actual_water_volume,
            tariff_amount: form.tariff_amount,
            year: form.year,
            parcels,
          }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.detail || 'Ошибка обновления')
        }
      } else {
        // Create contract (POST)
        res = await fetch(`${API}/api/contracts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, parcels }),
        })
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.detail || 'Ошибка создания')
        }
      }
      setShowForm(false)
      setEditingContract(null)
      setForm(emptyContract())
      setParcels([])
      loadContracts(search)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Удалить договор?')) return
    try {
      const res = await fetch(`${API}/api/contracts/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Ошибка удаления')
      loadContracts(search)
    } catch (e) { setError(e.message) }
  }

  const addParcel = () => {
    setParcels(prev => [...prev, {
      parcel_id: null,
      cadastral_number: '',
      distribution_channel: '',
      main_channel: '',
      culture: '',
      doc_hectares: null,
      irrigated_hectares: null,
      rural_district: '',
      geom: null,
    }])
  }

  const updateParcel = (idx, field, value) => {
    setParcels(prev => prev.map((p, i) =>
      i === idx ? { ...p, [field]: field === 'parcel_id' || field === 'doc_hectares' || field === 'irrigated_hectares' ? (value === '' ? null : Number(value)) : value } : p
    ))
  }

  const removeParcel = (idx) => {
    setParcels(prev => prev.filter((_, i) => i !== idx))
  }

  const handleFormChange = (field, value) => {
    setForm(prev => {
      const numFields = ['farmer_id', 'year', 'total_water_volume', 'actual_water_volume']
      const newVal = numFields.includes(field) ? (value === '' ? null : Number(value)) : value
      const updated = { ...prev, [field]: newVal }

      // Auto-fill tariff when year changes and tariff not explicitly set
      if (field === 'year' && !prev.tariff_amount) {
        updated.tariff_amount = defaultTariff(newVal)
      }
      return updated
    })
  }

  // Excel import handler
  const handleExcelImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    setError(null)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`${API}/api/contracts/import-excel`, {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || 'Ошибка импорта')
      setImportResult(data)
      loadContracts(search)
      loadFarmers()
    } catch (e) {
      setError(e.message)
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const tariffHint = form.year != null ? `(по умолчанию для ${form.year} г.: ${defaultTariff(form.year) ?? '—'} тг/м³)` : ''

  return (
    <div style={s.panel}>
      <div style={s.panelHeader}>
        <h2 style={s.panelTitle}>📄 Договоры</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <label style={{ ...s.addBtn, background: '#5856d6', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            📥 Импорт Excel
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleExcelImport}
              style={{ display: 'none' }}
            />
          </label>
          <button style={s.addBtn} onClick={openCreate}>+ Добавить</button>
        </div>
      </div>

      <input
        style={s.searchInput}
        placeholder="🔍 Поиск по номеру договора..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {error && <div style={s.err}>{error}</div>}

      {importing && <div style={s.loading}>⏳ Импорт Excel...</div>}
      {importResult && (
        <div style={s.importOk}>
          ✅ Импортировано: {importResult.imported?.farmers || 0} крестьян, {importResult.imported?.contracts || 0} договоров, {importResult.imported?.parcels || 0} участков
          {importResult.errors?.length > 0 && (
            <span style={{ color: '#ff9500', marginLeft: 8 }}>
              ⚠️ Ошибок: {importResult.errors.length}
            </span>
          )}
          <button style={{ ...s.smallDelBtn, marginLeft: 10 }} onClick={() => setImportResult(null)}>✕</button>
        </div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <div style={s.formCard}>
          <h3 style={s.formTitle}>{editingContract ? 'Редактировать договор' : 'Новый договор'}</h3>
          <div style={s.formGrid}>
            <div style={s.fieldWrap}>
              <label style={s.label}>Крестьянин *</label>
              <select
                style={{ ...s.input, width: '100%' }}
                value={form.farmer_id ?? ''}
                onChange={e => handleFormChange('farmer_id', e.target.value)}
              >
                <option value="">-- Выберите --</option>
                {farmers.map(f => (
                  <option key={f.id} value={f.id}>{f.full_name} ({f.iin})</option>
                ))}
              </select>
            </div>
            <Field label="Номер договора *" value={form.contract_number} onChange={v => handleFormChange('contract_number', v)} />
            <Field label="Дата договора" value={form.contract_date} onChange={v => handleFormChange('contract_date', v)} type="date" />
            <Field label="Год *" value={form.year ?? ''} onChange={v => handleFormChange('year', v)} type="number" />
            <Field label="Общий объем воды (м³)" value={form.total_water_volume ?? ''} onChange={v => handleFormChange('total_water_volume', v)} type="number" />
            <Field label="Факт. объем воды (м³)" value={form.actual_water_volume ?? ''} onChange={v => handleFormChange('actual_water_volume', v)} type="number" />
            <div style={s.fieldWrap}>
              <Field label="Тариф (тг/м³)" value={form.tariff_amount ?? ''} onChange={v => handleFormChange('tariff_amount', v)} type="number" />
              {tariffHint && <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: -2 }}>{tariffHint}</div>}
            </div>
          </div>

          {/* Parcels sub-form */}
          <div style={s.parcelsSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h4 style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>🌾 Участки в договоре</h4>
              <button style={s.smallAddBtn} onClick={addParcel}>+ Участок</button>
            </div>
            {parcels.map((p, i) => (
              <div key={i} style={s.parcelCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Участок #{i + 1}</span>
                  <button style={s.smallDelBtn} onClick={() => removeParcel(i)}>✕</button>
                </div>
                <div style={s.formGrid}>
                  <Field label="ID участка" value={p.parcel_id || ''} onChange={v => updateParcel(i, 'parcel_id', v)} type="number" />
                  <Field label="Кадастровый номер" value={p.cadastral_number} onChange={v => updateParcel(i, 'cadastral_number', v)} />
                  <Field label="Распред. канал" value={p.distribution_channel} onChange={v => updateParcel(i, 'distribution_channel', v)} />
                  <Field label="Магистр. канал" value={p.main_channel} onChange={v => updateParcel(i, 'main_channel', v)} />
                  <Field label="Культура" value={p.culture} onChange={v => updateParcel(i, 'culture', v)} />
                  <Field label="Сельский округ" value={p.rural_district} onChange={v => updateParcel(i, 'rural_district', v)} />
                  <Field label="Га по док." value={p.doc_hectares ?? ''} onChange={v => updateParcel(i, 'doc_hectares', v)} type="number" />
                  <Field label="Га орошаемые" value={p.irrigated_hectares ?? ''} onChange={v => updateParcel(i, 'irrigated_hectares', v)} type="number" />
                </div>
              </div>
            ))}
          </div>

          <div style={s.formBtns}>
            <button style={s.saveBtn} onClick={handleSave} disabled={saving}>
              {saving ? '⏳' : '💾'} {editingContract ? 'Обновить' : 'Создать договор'}
            </button>
            <button style={s.cancelBtn} onClick={() => { setShowForm(false); setEditingContract(null); setParcels([]) }}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Contracts list */}
      {loading && <div style={s.loading}>Загрузка...</div>}
      {!loading && contracts.length === 0 && !error && (
        <div style={s.empty}>Нет договоров</div>
      )}
      <div style={s.list}>
        {contracts.map(c => (
          <div key={c.id} style={s.card}>
            <div style={s.cardBody}>
              <div style={s.cardTitle}>
                Договор №{c.contract_number}
                {c.year && <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 8 }}>{c.year} г.</span>}
              </div>
              <div style={s.cardRow}>Крестьянин: <strong>{c.farmer_name || `ID ${c.farmer_id}`}</strong></div>
              {c.contract_date && <div style={s.cardRow}>📅 {c.contract_date}</div>}
              <div style={{ display: 'flex', gap: 16, marginTop: 4 }}>
                {c.total_water_volume != null && <div style={s.cardRow}>💧 План: {c.total_water_volume} м³</div>}
                {c.actual_water_volume != null && <div style={s.cardRow}>📏 Факт: {c.actual_water_volume} м³</div>}
              </div>
              {c.tariff_amount != null && <div style={s.cardRow}>💰 Тариф: {c.tariff_amount} тг/м³</div>}
              {c.parcels && c.parcels.length > 0 && (
                <div style={s.cardRow}>
                  🌾 Участков: {c.parcels.length}
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
                    ({c.parcels.map(p => p.culture || `ID${p.parcel_id}`).join(', ')})
                  </span>
                </div>
              )}
            </div>
            <div style={s.cardActions}>
              <button style={s.editBtn} onClick={() => openEdit(c)}>✏️</button>
              <button style={s.delBtn} onClick={() => handleDelete(c.id)}>🗑️</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ========== STATS PANEL ========== */

function StatsPanel() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [year, setYear] = useState('')
  const [district, setDistrict] = useState('')
  const [culture, setCulture] = useState('')

  const loadStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (year) params.set('year', year)
      if (district) params.set('rural_district', district)
      if (culture) params.set('culture', culture)
      const res = await fetch(`${API}/api/contracts/stats?${params}`)
      if (!res.ok) throw new Error('Ошибка загрузки')
      setStats(await res.json())
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [year, district, culture])

  useEffect(() => { loadStats() }, [loadStats])

  const fmt = (v) => {
    if (v == null) return '—'
    if (typeof v === 'number') return v.toLocaleString('ru-RU', { maximumFractionDigits: 1 })
    return v
  }

  return (
    <div style={s.panel}>
      <h2 style={s.panelTitle}>📊 Статистика договоров</h2>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <input
          style={{ ...s.searchInput, width: 120, marginBottom: 0 }}
          placeholder="Год"
          value={year}
          onChange={e => setYear(e.target.value)}
          type="number"
        />
        <input
          style={{ ...s.searchInput, width: 180, marginBottom: 0 }}
          placeholder="Сельский округ"
          value={district}
          onChange={e => setDistrict(e.target.value)}
        />
        <input
          style={{ ...s.searchInput, width: 160, marginBottom: 0 }}
          placeholder="Культура"
          value={culture}
          onChange={e => setCulture(e.target.value)}
        />
        <button style={s.saveBtn} onClick={loadStats}>🔍 Фильтр</button>
      </div>

      {error && <div style={s.err}>{error}</div>}
      {loading && <div style={s.loading}>Загрузка...</div>}

      {stats && (
        <>
          {/* Totals card */}
          <div style={s.statsGrid}>
            <StatCard icon="📄" label="Договоров" value={stats.totals?.contracts} />
            <StatCard icon="🌾" label="Участков" value={stats.totals?.parcels} />
            <StatCard icon="💧" label="План (м³)" value={fmt(stats.totals?.plan_volume)} />
            <StatCard icon="📏" label="Факт (м³)" value={fmt(stats.totals?.actual_volume)} />
            <StatCard icon="💰" label="Тариф (тг)" value={fmt(stats.totals?.total_tariff)} />
            <StatCard icon="📐" label="Га по док." value={fmt(stats.totals?.doc_hectares)} />
            <StatCard icon="🌿" label="Га орош." value={fmt(stats.totals?.irrigated_hectares)} />
          </div>

          {/* By year breakdown */}
          {stats.by_year?.length > 0 && (
            <div style={s.section}>
              <h3 style={s.sectionTitle}>📅 По годам</h3>
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Год</th>
                      <th style={s.th}>Договоров</th>
                      <th style={s.th}>План (м³)</th>
                      <th style={s.th}>Факт (м³)</th>
                      <th style={s.th}>Тариф (тг)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.by_year.map(r => (
                      <tr key={r.year}>
                        <td style={s.td}>{r.year}</td>
                        <td style={s.td}>{r.contracts}</td>
                        <td style={s.td}>{fmt(r.plan_volume)}</td>
                        <td style={s.td}>{fmt(r.actual_volume)}</td>
                        <td style={s.td}>{fmt(r.tariff)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* By culture breakdown */}
          {stats.by_culture?.length > 0 && (
            <div style={s.section}>
              <h3 style={s.sectionTitle}>🌱 По культурам</h3>
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Культура</th>
                      <th style={s.th}>Участков</th>
                      <th style={s.th}>Га по док.</th>
                      <th style={s.th}>Га орош.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.by_culture.map((r, i) => (
                      <tr key={i}>
                        <td style={s.td}>{r.culture}</td>
                        <td style={s.td}>{r.parcels}</td>
                        <td style={s.td}>{fmt(r.doc_hectares)}</td>
                        <td style={s.td}>{fmt(r.irrigated_hectares)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* By district breakdown */}
          {stats.by_rural_district?.length > 0 && (
            <div style={s.section}>
              <h3 style={s.sectionTitle}>🏘️ По сельским округам</h3>
              <div style={s.tableWrap}>
                <table style={s.table}>
                  <thead>
                    <tr>
                      <th style={s.th}>Округ</th>
                      <th style={s.th}>Участков</th>
                      <th style={s.th}>Га по док.</th>
                      <th style={s.th}>Га орош.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.by_rural_district.map((r, i) => (
                      <tr key={i}>
                        <td style={s.td}>{r.rural_district}</td>
                        <td style={s.td}>{r.parcels}</td>
                        <td style={s.td}>{fmt(r.doc_hectares)}</td>
                        <td style={s.td}>{fmt(r.irrigated_hectares)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ icon, label, value }) {
  return (
    <div style={s.statCard}>
      <div style={s.statIcon}>{icon}</div>
      <div style={s.statValue}>{value ?? '—'}</div>
      <div style={s.statLabel}>{label}</div>
    </div>
  )
}

/* ========== SHARED COMPONENTS ========== */

function Field({ label, value, onChange, type = 'text', wide }) {
  return (
    <div style={{ ...s.fieldWrap, ...(wide ? { gridColumn: '1 / -1' } : {}) }}>
      <label style={s.label}>{label}</label>
      <input
        style={s.input}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  )
}

function emptyFarmer() {
  return { full_name: '', iin: '', contract_number: '', phone: '', address: '' }
}

function emptyContract() {
  return {
    farmer_id: null,
    contract_number: '',
    contract_date: '',
    total_water_volume: null,
    actual_water_volume: null,
    tariff_amount: null,
    year: null,
  }
}

/* ========== STYLES ========== */

const s = {
  root: {
    display: 'flex', flexDirection: 'column',
    height: '100%', background: 'var(--bg)',
  },
  tabBar: {
    display: 'flex', gap: 4,
    padding: '8px 12px',
    borderBottom: '1px solid var(--border)',
    background: 'var(--card)',
  },
  tab: {
    padding: '7px 18px', borderRadius: 8,
    border: '1px solid transparent', background: 'transparent',
    fontSize: 12, fontWeight: 500, color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  tabActive: {
    padding: '7px 18px', borderRadius: 8,
    border: '1px solid rgba(0,122,255,0.2)',
    background: 'rgba(0,122,255,0.07)',
    fontSize: 12, fontWeight: 600, color: '#007aff',
    cursor: 'pointer',
  },
  content: {
    flex: 1, overflow: 'auto', padding: '12px 16px',
  },
  panel: { maxWidth: 800 },
  panelHeader: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  panelTitle: { margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text)' },
  addBtn: {
    padding: '6px 14px', borderRadius: 8, border: 'none',
    background: '#007aff', color: '#fff', fontSize: 12,
    fontWeight: 600, cursor: 'pointer',
  },
  searchInput: {
    width: '100%', padding: '8px 12px', marginBottom: 12,
    borderRadius: 8, border: '1px solid var(--border)',
    fontSize: 13, outline: 'none',
    background: 'var(--card)',
    color: 'var(--text)',
    boxSizing: 'border-box',
  },
  formCard: {
    background: 'var(--card)', border: '1px solid var(--border-med)',
    borderRadius: 12, padding: '14px 16px', marginBottom: 14,
    boxShadow: 'var(--shadow-sm)',
  },
  formTitle: { margin: '0 0 10px', fontSize: 14, fontWeight: 600, color: 'var(--text)' },
  formGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    gap: '8px 10px',
  },
  fieldWrap: {},
  label: {
    display: 'block', fontSize: 11, fontWeight: 500,
    color: 'var(--text-muted)', marginBottom: 3,
  },
  input: {
    width: '100%', padding: '6px 10px',
    borderRadius: 6, border: '1px solid var(--border)',
    fontSize: 12, outline: 'none',
    background: 'var(--card-alt)',
    color: 'var(--text)',
    boxSizing: 'border-box',
  },
  formBtns: {
    display: 'flex', gap: 8, marginTop: 12,
  },
  saveBtn: {
    padding: '7px 18px', borderRadius: 8, border: 'none',
    background: '#28c840', color: '#fff', fontSize: 12,
    fontWeight: 600, cursor: 'pointer',
  },
  cancelBtn: {
    padding: '7px 18px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--card-alt)',
    fontSize: 12, fontWeight: 500, color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  parcelsSection: {
    marginTop: 14, paddingTop: 12,
    borderTop: '1px solid var(--border)',
  },
  parcelCard: {
    background: 'var(--card-alt)', border: '1px solid var(--border)',
    borderRadius: 8, padding: '10px 12px', marginBottom: 8,
  },
  smallAddBtn: {
    padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(0,122,255,0.3)',
    background: 'rgba(0,122,255,0.06)', color: '#007aff',
    fontSize: 11, fontWeight: 600, cursor: 'pointer',
  },
  smallDelBtn: {
    padding: '2px 7px', borderRadius: 4, border: 'none',
    background: 'rgba(255,59,48,0.1)', color: '#ff3b30',
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  card: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start',
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '10px 14px',
    boxShadow: 'var(--shadow-xs)',
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 4 },
  cardRow: { fontSize: 12, color: 'var(--text-muted)', marginTop: 2 },
  cardActions: {
    display: 'flex', gap: 4, marginLeft: 10, flexShrink: 0,
  },
  editBtn: {
    padding: '4px 8px', borderRadius: 6, border: 'none',
    background: 'rgba(0,122,255,0.07)', color: '#007aff',
    fontSize: 13, cursor: 'pointer',
  },
  delBtn: {
    padding: '4px 8px', borderRadius: 6, border: 'none',
    background: 'rgba(255,59,48,0.07)', color: '#ff3b30',
    fontSize: 13, cursor: 'pointer',
  },
  err: {
    background: 'rgba(255,59,48,0.08)', color: '#ff3b30',
    padding: '8px 12px', borderRadius: 8, fontSize: 12,
    marginBottom: 10, border: '1px solid rgba(255,59,48,0.15)',
  },
  importOk: {
    background: 'rgba(40,200,64,0.08)', color: '#28c840',
    padding: '8px 12px', borderRadius: 8, fontSize: 12,
    marginBottom: 10, border: '1px solid rgba(40,200,64,0.15)',
    display: 'flex', alignItems: 'center', flexWrap: 'wrap',
  },
  loading: { textAlign: 'center', padding: 20, color: 'var(--text-muted)', fontSize: 13 },
  empty: { textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 13 },

  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
    gap: 10, marginBottom: 20,
  },
  statCard: {
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '12px 14px',
    textAlign: 'center',
    boxShadow: 'var(--shadow-xs)',
  },
  statIcon: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: 700, color: 'var(--text)' },
  statLabel: { fontSize: 11, color: 'var(--text-muted)', marginTop: 2 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 8 },
  tableWrap: {
    overflowX: 'auto',
    background: 'var(--card)', border: '1px solid var(--border)',
    borderRadius: 10,
  },
  table: {
    width: '100%', borderCollapse: 'collapse',
    fontSize: 12,
  },
  th: {
    textAlign: 'left', padding: '8px 12px',
    borderBottom: '1px solid var(--border)',
    fontWeight: 600, color: 'var(--text-muted)',
    whiteSpace: 'nowrap',
  },
  td: {
    padding: '6px 12px',
    borderBottom: '1px solid var(--border-light)',
    color: 'var(--text)',
  },
}