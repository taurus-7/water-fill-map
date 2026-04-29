import { getStatus, formatVolume, formatPct } from '../utils/colors'
import Legend from './Legend'
import SearchBar from './SearchBar'

/* ── Маленький прогресс-бар ── */
function MiniProgress({ pct, color }) {
  return (
    <div style={s.progTrack}>
      <div style={{ ...s.progFill, width:`${pct}%`, background:color }} />
    </div>
  )
}

/* ── Строка данных ── */
function Row({ label, value, color, mono }) {
  return (
    <div style={s.row}>
      <span style={s.rowLabel}>{label}</span>
      <span style={{ ...s.rowValue, color: color||'var(--text)', fontFamily: mono?'monospace':'inherit' }}>
        {value}
      </span>
    </div>
  )
}

/* ── Значок статуса ── */
function StatusBadge({ status, color, bg, border }) {
  return (
    <span style={{ ...s.statusBadge, color, background:bg, border:`1px solid ${border}` }}>
      {status}
    </span>
  )
}

/* ── Карточки статистики ── */
function StatCard({ label, count, color, bg, border }) {
  return (
    <div style={{ ...s.statCard, background:bg, border:`1px solid ${border}` }}>
      <span style={{ ...s.statNum, color }}>{count}</span>
      <span style={s.statLabel}>{label}</span>
    </div>
  )
}

/* ── Форма обновления ── */
function FactForm({ parcelId, currentFact, limit, onUpdate }) {
  const handleSubmit = async (e) => {
    e.preventDefault()
    const val = parseFloat(e.target.fact.value)
    if (!isNaN(val) && val >= 0) { await onUpdate(parcelId, val); e.target.reset() }
  }
  return (
    <div style={s.formWrap}>
      <div style={s.formTitle}>Обновить водозабор</div>
      <form onSubmit={handleSubmit} style={s.formRow}>
        <div style={s.inputGroup}>
          <input name="fact" type="number" min="0" max={limit}
            defaultValue={Math.round(currentFact)}
            style={s.input} step="1000" />
          <span style={s.inputUnit}>м³</span>
        </div>
        <button type="submit" style={s.saveBtn}>Сохранить</button>
      </form>
    </div>
  )
}

export default function ParcelInfo({ stats, selected, onClose, onFactUpdate, onFlyTo, searchError, onSearchError }) {
  return (
    <div style={s.panel}>

      {/* Поиск */}
      <SearchBar onResult={onFlyTo} onError={onSearchError} />
      {searchError && (
        <div style={s.searchErr}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
          {searchError}
        </div>
      )}

      <Legend />

      {/* Статистика */}
      {stats ? (
        <div style={s.card}>
          <div style={s.cardHeader}>
            <span style={s.cardTitle}>Сводка по участкам</span>
            <span style={s.totalBadge}>{stats.total} уч.</span>
          </div>
          <div style={s.statGrid}>
            <StatCard label="Норма"    count={stats.normal}    color="#34c759" bg="rgba(52,199,89,0.09)"   border="rgba(52,199,89,0.2)" />
            <StatCard label="Внимание" count={stats.attention} color="#f59e0b" bg="rgba(245,158,11,0.09)"  border="rgba(245,158,11,0.2)" />
            <StatCard label="Высокое"  count={stats.high}      color="#f97316" bg="rgba(249,115,22,0.09)"  border="rgba(249,115,22,0.2)" />
            <StatCard label="Критично" count={stats.critical}  color="#ff3b30" bg="rgba(255,59,48,0.09)"   border="rgba(255,59,48,0.2)" />
          </div>
          <div style={s.divider} />
          <Row label="Суммарный лимит" value={formatVolume(stats.total_limit)} />
          <Row label="Суммарный факт"  value={formatVolume(stats.total_fact)} />
          {(() => {
            const st = getStatus(stats.overall_pct)
            return <>
              <div style={{ ...s.row, marginTop:8 }}>
                <span style={s.rowLabel}>Общее заполнение</span>
                <span style={{ ...s.rowValue, color:st.color, fontWeight:700 }}>
                  {formatPct(stats.overall_pct)}
                </span>
              </div>
              <MiniProgress pct={stats.overall_pct} color={st.color} />
            </>
          })()}
        </div>
      ) : (
        <div style={s.loading}><div style={s.spinnerBlue} />Загрузка...</div>
      )}

      {/* Детали участка */}
      {selected && (() => {
        const st = getStatus(selected.fill_pct)
        const remain = Math.max(0, selected.water_limit - selected.water_fact)
        return (
          <div style={{ ...s.card, borderLeft:`3px solid ${st.color}` }}>
            <div style={s.selHeader}>
              <div style={s.selName}>{selected.name}</div>
              <button style={s.closeBtn} onClick={onClose} title="Закрыть">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12"/>
                </svg>
              </button>
            </div>

            <StatusBadge status={st.label} color={st.color} bg={st.bg} border={st.border} />

            {/* Прогресс */}
            <div style={s.pctRow}>
              <span style={{ ...s.pctBig, color:st.color }}>{formatPct(selected.fill_pct)}</span>
              <div style={s.pctRight}>
                <MiniProgress pct={selected.fill_pct} color={st.color} />
                <span style={s.pctSub}>{formatVolume(selected.water_fact)} из {formatVolume(selected.water_limit)}</span>
              </div>
            </div>

            <div style={s.divider} />

            {/* IIN и кадастр */}
            {selected.iin && <Row label="ИИН" value={selected.iin} mono />}
            {selected.cadastral_number && <Row label="Кадастровый №" value={selected.cadastral_number} mono />}

            <div style={s.divider} />
            <Row label="Лимит"   value={formatVolume(selected.water_limit)} />
            <Row label="Факт"    value={formatVolume(selected.water_fact)}  color={st.color} />
            <Row label="Остаток" value={formatVolume(remain)} />

            {selected.notes && <div style={s.notes}>{selected.notes}</div>}

            <FactForm
              parcelId={selected.id}
              currentFact={selected.water_fact}
              limit={selected.water_limit}
              onUpdate={onFactUpdate}
            />
          </div>
        )
      })()}

      {!selected && stats && (
        <div style={s.hint}>
          <div style={s.hintIcon}>🗺</div>
          <div>Кликните на участок<br/>для просмотра деталей</div>
        </div>
      )}
    </div>
  )
}

const s = {
  panel: {
    width:300, height:'100%', overflowY:'auto',
    padding:'12px 12px 24px', background:'var(--bg)',
    borderRight:'1px solid var(--border-med)',
    flexShrink:0, display:'flex', flexDirection:'column', gap:0,
  },
  card: {
    background:'var(--card)', borderRadius:'var(--radius-lg)',
    border:'1px solid var(--border)', boxShadow:'var(--shadow-sm)',
    padding:'14px 14px', marginBottom:10,
  },
  cardHeader: { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 },
  cardTitle: { fontSize:13, fontWeight:600, color:'var(--text)' },
  totalBadge: {
    background:'var(--blue-light)', color:'var(--blue)',
    fontWeight:700, fontSize:11, padding:'2px 8px', borderRadius:20,
  },
  statGrid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:12 },
  statCard: {
    display:'flex', flexDirection:'column', alignItems:'center',
    padding:'8px 6px', borderRadius:10,
  },
  statNum: { fontSize:22, fontWeight:800, lineHeight:1, letterSpacing:'-0.03em' },
  statLabel: { fontSize:10, color:'var(--text-muted)', marginTop:3, fontWeight:500 },
  divider: { height:1, background:'var(--border)', margin:'10px 0' },
  row: { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'2.5px 0' },
  rowLabel: { fontSize:12, color:'var(--text-muted)' },
  rowValue: { fontSize:12, fontWeight:600 },
  progTrack: {
    height:5, borderRadius:3, background:'rgba(0,0,0,0.07)',
    overflow:'hidden', marginTop:6,
  },
  progFill: { height:'100%', borderRadius:3, transition:'width 0.4s cubic-bezier(0.4,0,0.2,1)' },

  selHeader: { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 },
  selName: { fontSize:14, fontWeight:700, color:'var(--text)', lineHeight:1.3, paddingRight:8 },
  closeBtn: {
    background:'var(--bg)', border:'1px solid var(--border-med)',
    borderRadius:'50%', width:22, height:22,
    display:'flex', alignItems:'center', justifyContent:'center',
    flexShrink:0, color:'var(--text-muted)',
  },
  statusBadge: {
    display:'inline-flex', alignItems:'center',
    fontSize:11, fontWeight:600, padding:'2px 9px', borderRadius:20,
    marginBottom:10,
  },
  pctRow: { display:'flex', alignItems:'center', gap:10, marginBottom:2 },
  pctBig: { fontSize:28, fontWeight:800, letterSpacing:'-0.04em', lineHeight:1, flexShrink:0 },
  pctRight: { flex:1 },
  pctSub: { fontSize:10, color:'var(--text-muted)', marginTop:4, display:'block' },
  notes: {
    marginTop:8, fontSize:11, color:'var(--text-muted)',
    background:'var(--card-alt)', borderRadius:7, padding:'6px 9px',
    border:'1px solid var(--border)', fontStyle:'italic',
  },

  formWrap: { marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)' },
  formTitle: { fontSize:11, fontWeight:500, color:'var(--text-muted)', marginBottom:7 },
  formRow: { display:'flex', gap:6 },
  inputGroup: {
    flex:1, display:'flex', alignItems:'center',
    background:'var(--card-alt)', border:'1px solid var(--border-med)',
    borderRadius:7, overflow:'hidden', paddingRight:8,
  },
  input: {
    flex:1, border:'none', background:'transparent',
    color:'var(--text)', fontSize:12, padding:'7px 8px', outline:'none',
  },
  inputUnit: { fontSize:11, color:'var(--text-muted)', flexShrink:0 },
  saveBtn: {
    background:'var(--blue)', border:'none', borderRadius:7,
    color:'#fff', fontWeight:600, fontSize:12, padding:'7px 12px',
  },

  searchErr: {
    display:'flex', alignItems:'center', gap:6,
    fontSize:12, color:'#ff3b30',
    background:'rgba(255,59,48,0.08)', border:'1px solid rgba(255,59,48,0.2)',
    borderRadius:8, padding:'7px 10px', marginBottom:10,
  },

  hint: {
    textAlign:'center', color:'var(--text-muted)', fontSize:12,
    padding:'20px 0', display:'flex', flexDirection:'column',
    alignItems:'center', gap:8,
  },
  hintIcon: { fontSize:28, opacity:0.5 },
  loading: {
    display:'flex', alignItems:'center', gap:8,
    color:'var(--text-muted)', fontSize:12, padding:'16px 0',
    justifyContent:'center',
  },
  spinnerBlue: {
    width:15, height:15,
    border:'2px solid rgba(0,122,255,0.15)',
    borderTopColor:'#007aff',
    borderRadius:'50%',
    animation:'spin 0.7s linear infinite',
  },
}
