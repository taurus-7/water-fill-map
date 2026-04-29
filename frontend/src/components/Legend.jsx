import { STATUSES } from '../utils/colors'

export default function Legend() {
  return (
    <div style={s.wrap}>
      <div style={s.header}>
        <span style={s.title}>Шкала заполнения</span>
      </div>
      <div style={s.gradientWrap}>
        <div style={s.gradient} />
        <div style={s.ticks}>
          {['0%','60%','80%','95%','100%'].map(t => (
            <span key={t} style={s.tick}>{t}</span>
          ))}
        </div>
      </div>
      <div style={s.grid}>
        {STATUSES.map(({ label, range, color, bg, border }) => (
          <div key={label} style={{ ...s.pill, background: bg, border: `1px solid ${border}` }}>
            <span style={{ ...s.dot, background: color }} />
            <div style={s.pillText}>
              <span style={{ ...s.pillLabel, color }}>{label}</span>
              <span style={s.pillRange}>{range}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const s = {
  wrap: {
    background: 'var(--card)',
    borderRadius: 'var(--radius-lg)',
    border: '1px solid var(--border)',
    boxShadow: 'var(--shadow-sm)',
    padding: '14px 14px 12px',
    marginBottom: 10,
  },
  header: { display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 },
  title: { fontSize:11, fontWeight:600, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.07em' },
  gradientWrap: { marginBottom:10 },
  gradient: {
    height:7, borderRadius:4, marginBottom:5,
    background:'linear-gradient(to right,#34c759 0%,#f59e0b 42%,#f97316 65%,#ff3b30 100%)',
  },
  ticks: { display:'flex', justifyContent:'space-between' },
  tick: { fontSize:10, color:'var(--text-light)' },
  grid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 },
  pill: {
    display:'flex', alignItems:'center', gap:7,
    padding:'6px 9px', borderRadius:8,
  },
  dot: { width:7, height:7, borderRadius:'50%', flexShrink:0 },
  pillText: { display:'flex', flexDirection:'column', gap:1 },
  pillLabel: { fontSize:12, fontWeight:600, lineHeight:1 },
  pillRange: { fontSize:10, color:'var(--text-muted)' },
}
