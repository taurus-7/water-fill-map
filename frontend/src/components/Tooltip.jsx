import { getStatus, formatVolume } from '../utils/colors'

/* Красивый тултип при наведении на участок */
export default function Tooltip({ x, y, props: p }) {
  if (!p) return null

  const st = getStatus(p.fill_pct)
  const remain = Math.max(0, p.water_limit - p.water_fact)
  const usedPct = p.fill_pct

  // Не даём уйти за края экрана
  const W = 240
  const left = x + 16 + W > window.innerWidth ? x - W - 8 : x + 16
  const top  = Math.max(8, y - 10)

  return (
    <div style={{ ...s.wrap, left, top }}>
      {/* Заголовок */}
      <div style={s.header}>
        <div style={{ ...s.colorBar, background: st.color }} />
        <div style={s.headerText}>
          <div style={s.name}>{p.name}</div>
          <div style={{ ...s.statusBadge, color: st.color, background: st.bg, border: `1px solid ${st.border}` }}>
            {st.label}
          </div>
        </div>
      </div>

      {/* Прогресс-бар */}
      <div style={s.pctSection}>
        <div style={s.pctRow}>
          <span style={{ ...s.pctNum, color: st.color }}>{p.fill_pct.toFixed(1)}%</span>
          <span style={s.pctLabel}>заполнено</span>
        </div>
        <div style={s.track}>
          <div style={{ ...s.fill, width: `${usedPct}%`, background: st.color }} />
          {/* Маркеры порогов */}
          <div style={{ ...s.threshold, left: '60%' }} />
          <div style={{ ...s.threshold, left: '80%' }} />
          <div style={{ ...s.threshold, left: '95%' }} />
        </div>
      </div>

      <div style={s.divider} />

      {/* Данные */}
      <div style={s.dataGrid}>
        <DataCell label="Лимит"   value={formatVolume(p.water_limit)} />
        <DataCell label="Факт"    value={formatVolume(p.water_fact)}  color={st.color} />
        <DataCell label="Остаток" value={formatVolume(remain)} />
        <DataCell label="ID"      value={`#${p.id}`} />
      </div>

      {/* ИИН / Кадастр */}
      {(p.iin || p.cadastral_number) && (
        <>
          <div style={s.divider} />
          <div style={s.idSection}>
            {p.iin && (
              <div style={s.idRow}>
                <span style={s.idLabel}>ИИН</span>
                <span style={s.idValue}>{p.iin}</span>
              </div>
            )}
            {p.cadastral_number && (
              <div style={s.idRow}>
                <span style={s.idLabel}>Кадастр</span>
                <span style={s.idValue}>{p.cadastral_number}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Подсказка */}
      <div style={s.footer}>Кликните для подробностей →</div>
    </div>
  )
}

function DataCell({ label, value, color }) {
  return (
    <div style={s.dataCell}>
      <span style={s.cellLabel}>{label}</span>
      <span style={{ ...s.cellValue, color: color || 'var(--text, #1d1d1f)' }}>{value}</span>
    </div>
  )
}

const s = {
  wrap: {
    position: 'absolute',
    pointerEvents: 'none',
    zIndex: 30,
    width: 240,
    background: 'rgba(255,255,255,0.97)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: 14,
    boxShadow: '0 8px 40px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'stretch',
    gap: 0,
  },
  colorBar: {
    width: 4,
    flexShrink: 0,
    borderRadius: '0 0 0 0',
  },
  headerText: {
    flex: 1,
    padding: '11px 12px 9px',
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
  },
  name: {
    fontWeight: 700,
    fontSize: 13,
    color: '#1d1d1f',
    lineHeight: 1.2,
  },
  statusBadge: {
    display: 'inline-flex',
    alignSelf: 'flex-start',
    fontSize: 10,
    fontWeight: 600,
    padding: '2px 7px',
    borderRadius: 20,
  },
  pctSection: {
    padding: '8px 12px 10px',
    background: 'rgba(0,0,0,0.018)',
  },
  pctRow: {
    display: 'flex',
    alignItems: 'baseline',
    gap: 5,
    marginBottom: 6,
  },
  pctNum: {
    fontSize: 26,
    fontWeight: 800,
    letterSpacing: '-0.04em',
    lineHeight: 1,
  },
  pctLabel: {
    fontSize: 11,
    color: '#6e6e73',
    fontWeight: 500,
  },
  track: {
    position: 'relative',
    height: 6,
    borderRadius: 3,
    background: 'rgba(0,0,0,0.08)',
    overflow: 'visible',
  },
  fill: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    borderRadius: 3,
    transition: 'width 0.3s ease',
  },
  threshold: {
    position: 'absolute',
    top: -2,
    bottom: -2,
    width: 1.5,
    background: 'rgba(255,255,255,0.7)',
    borderRadius: 1,
  },
  divider: {
    height: 1,
    background: 'rgba(0,0,0,0.07)',
    margin: '0',
  },
  dataGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1px',
    background: 'rgba(0,0,0,0.06)',
    border: 'none',
  },
  dataCell: {
    background: 'rgba(255,255,255,0.97)',
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  cellLabel: {
    fontSize: 10,
    color: '#6e6e73',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  cellValue: {
    fontSize: 12,
    fontWeight: 700,
    color: '#1d1d1f',
  },
  idSection: {
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  idRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  idLabel: {
    fontSize: 10,
    color: '#6e6e73',
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    flexShrink: 0,
  },
  idValue: {
    fontSize: 11,
    fontWeight: 600,
    color: '#1d1d1f',
    fontFamily: 'monospace',
    letterSpacing: '0.02em',
  },
  footer: {
    padding: '7px 12px',
    fontSize: 10,
    color: '#aeaeb2',
    fontWeight: 500,
    background: 'rgba(0,0,0,0.018)',
    textAlign: 'right',
  },
}
