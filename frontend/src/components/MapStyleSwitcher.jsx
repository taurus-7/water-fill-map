export const MAP_STYLES = [
  {
    id: 'light',
    label: 'Светлая',
    icon: '☀️',
    url: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  },
  {
    id: 'dark',
    label: 'Тёмная',
    icon: '🌙',
    url: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  },
  {
    id: 'satellite',
    label: 'Спутник',
    icon: '🛰',
    url: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  },
]

export default function MapStyleSwitcher({ activeId, onChange }) {
  return (
    <div style={s.wrap}>
      {MAP_STYLES.map(({ id, label, icon }) => {
        const active = activeId === id
        return (
          <button
            key={id}
            style={{ ...s.btn, ...(active ? s.active : {}) }}
            onClick={() => onChange(id)}
            title={label}
          >
            <span style={s.icon}>{icon}</span>
            <span>{label}</span>
          </button>
        )
      })}
    </div>
  )
}

const s = {
  wrap: {
    position: 'absolute',
    top: 14,
    right: 14,
    zIndex: 20,
    display: 'flex',
    background: 'rgba(255,255,255,0.88)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    borderRadius: 11,
    border: '1px solid rgba(0,0,0,0.11)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.13)',
    padding: 3,
    gap: 2,
  },
  btn: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 11px',
    background: 'transparent',
    border: 'none',
    borderRadius: 8,
    color: '#3c3c43',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.15s, color 0.15s',
    userSelect: 'none',
  },
  active: {
    background: '#007aff',
    color: '#fff',
    boxShadow: '0 1px 4px rgba(0,122,255,0.35)',
  },
  icon: { fontSize: 13, lineHeight: 1 },
}
