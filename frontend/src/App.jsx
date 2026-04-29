import { useState, useEffect, useCallback, useRef } from 'react'
import MapView    from './components/MapView'
import ParcelInfo from './components/ParcelInfo'
import DataManagement from './components/DataManagement'

const API = import.meta.env.VITE_API_URL || ''

export default function App() {
  const [mapData,     setMapData]     = useState(null)
  const [stats,       setStats]       = useState(null)
  const [selected,    setSelected]    = useState(null)   // выбранный участок (клик)
  const [flyTarget,   setFlyTarget]   = useState(null)   // { lon, lat } для flyTo
  const [searchError, setSearchError] = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [error,       setError]       = useState(null)
  const [refreshKey,  setRefreshKey]  = useState(0)
  const [lastUpdate,  setLastUpdate]  = useState(null)
  const [view,        setView]        = useState('map')   // 'map' | 'data'

  /* ── Загрузка данных ── */
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    async function load() {
      try {
        const [mRes, cRes, sRes] = await Promise.all([
          fetch(`${API}/api/parcels/map`),
          fetch(`${API}/api/contracts/parcels/map`),
          fetch(`${API}/api/stats`),
        ])
        if (!mRes.ok || !cRes.ok || !sRes.ok) throw new Error('Ошибка ответа сервера')
        const [mJson, cJson, sJson] = await Promise.all([mRes.json(), cRes.json(), sRes.json()])
        if (!cancelled) {
          // Merge contract_parcels outlines + fills into parcels map data
          if (cJson?.outlines?.features?.length) {
            mJson.outlines.features = [...mJson.outlines.features, ...cJson.outlines.features]
          }
          if (cJson?.fills?.features?.length) {
            mJson.fills.features = [...mJson.fills.features, ...cJson.fills.features]
          }
          setMapData(mJson)
          setStats(sJson)
          setError(null)
          setLastUpdate(new Date())
        }
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [refreshKey])

  /* ── Клик по участку на карте ── */
  const handleParcelClick = useCallback(props => {
    setSelected(props)
    setFlyTarget({ lon: props.lon, lat: props.lat, _t: Date.now() })
  }, [])

  /* ── Результат поиска → flyTo + выбор ── */
  const handleSearchResult = useCallback(result => {
    setSelected(result)
    setFlyTarget({ lon: result.lon, lat: result.lat, _t: Date.now() })
    setSearchError(null)
  }, [])

  /* ── Обновление факта ── */
  const handleFactUpdate = useCallback(async (id, newFact) => {
    try {
      const res = await fetch(`${API}/api/parcels/${id}/fact`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ water_fact: newFact }),
      })
      if (!res.ok) throw new Error('Ошибка сохранения')
      const updated = await res.json()
      setSelected(prev => prev?.id === id ? { ...prev, ...updated } : prev)
      setRefreshKey(k => k + 1)
    } catch (e) { alert(e.message) }
  }, [])

  const formatTime = (d) => d
    ? d.toLocaleTimeString('ru-RU', { hour:'2-digit', minute:'2-digit', second:'2-digit' })
    : '—'

  return (
    <div style={s.root}>
      {/* ── Шапка macOS ── */}
      <header style={s.header}>
        <div style={s.trafficLights}>
          <div style={{ ...s.tl, background:'#ff5f57', boxShadow:'0 0 0 0.5px rgba(0,0,0,0.12)' }} />
          <div style={{ ...s.tl, background:'#febc2e', boxShadow:'0 0 0 0.5px rgba(0,0,0,0.12)' }} />
          <div style={{ ...s.tl, background:'#28c840', boxShadow:'0 0 0 0.5px rgba(0,0,0,0.12)' }} />
        </div>

        <div style={s.titleGroup}>
          <span style={s.titleIcon}>💧</span>
          <span style={s.titleText}>Мониторинг водных лимитов</span>
          {stats && view === 'map' && (
            <span style={s.titleSub}>
              · {stats.total} участков · Туркестанская обл.
            </span>
          )}
        </div>

        <div style={s.navGroup}>
          <button
            style={view === 'map' ? s.navActive : s.nav}
            onClick={() => setView('map')}
          >🗺️ Карта</button>
          <button
            style={view === 'data' ? s.navActive : s.nav}
            onClick={() => setView('data')}
          >📋 Данные</button>
        </div>

        <div style={s.headerRight}>
          {loading && (
            <div style={s.loadingPill}>
              <div style={s.spinnerSm} />
              Обновление...
            </div>
          )}
          {lastUpdate && !loading && (
            <span style={s.lastUpdate}>
              Обновлено {formatTime(lastUpdate)}
            </span>
          )}
          <button
            style={s.refreshBtn}
            onClick={() => setRefreshKey(k => k + 1)}
            title="Обновить данные"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight:5 }}>
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M8 16H3v5"/>
            </svg>
            Обновить
          </button>
        </div>
      </header>

      {/* ── Тело ── */}
      <div style={s.body}>
        {view === 'map' ? (
          <>
            <ParcelInfo
              stats={stats}
              selected={selected}
              onClose={() => setSelected(null)}
              onFactUpdate={handleFactUpdate}
              onFlyTo={handleSearchResult}
              searchError={searchError}
              onSearchError={setSearchError}
            />

            <div style={s.mapWrap}>
              {error ? (
                <ErrorScreen message={error} onRetry={() => setRefreshKey(k => k + 1)} />
              ) : (
                <MapView
                  mapData={mapData}
                  onParcelClick={handleParcelClick}
                  flyToTarget={flyTarget}
                  selectedId={selected?.id}
                />
              )}
            </div>
          </>
        ) : (
          <div style={s.dataWrap}>
            <DataManagement />
          </div>
        )}
      </div>
    </div>
  )
}

function ErrorScreen({ message, onRetry }) {
  return (
    <div style={s.errWrap}>
      <div style={s.errBox}>
        <div style={s.errEmoji}>⚠️</div>
        <div style={s.errTitle}>Не удалось загрузить данные</div>
        <div style={s.errMsg}>{message}</div>
        <div style={s.errCmd}>
          <code>docker compose up --build</code>
        </div>
        <button style={s.retryBtn} onClick={onRetry}>↺ Повторить</button>
      </div>
    </div>
  )
}

const s = {
  root: {
    display: 'flex', flexDirection: 'column',
    width: '100%', height: '100%', background: 'var(--bg)',
  },
  header: {
    height: 50,
    background: 'rgba(246,246,248,0.92)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid rgba(0,0,0,0.1)',
    display: 'flex', alignItems: 'center',
    padding: '0 18px', flexShrink: 0, zIndex: 50, gap: 14,
    userSelect: 'none',
  },
  trafficLights: { display:'flex', gap:6, flexShrink:0 },
  tl: { width:12, height:12, borderRadius:'50%' },

  titleGroup: {
    flex: 1, display:'flex', alignItems:'center',
    justifyContent:'center', gap:6,
  },
  titleIcon: { fontSize:16 },
  titleText: { fontSize:13, fontWeight:600, color:'var(--text)' },
  titleSub:  { fontSize:12, color:'var(--text-muted)', fontWeight:400 },

  navGroup: {
    display: 'flex', gap: 4, flexShrink: 0,
  },
  nav: {
    padding: '5px 14px', borderRadius: 8,
    border: '1px solid transparent', background: 'transparent',
    fontSize: 12, fontWeight: 500, color: 'var(--text-muted)',
    cursor: 'pointer',
  },
  navActive: {
    padding: '5px 14px', borderRadius: 8,
    border: '1px solid rgba(0,122,255,0.2)',
    background: 'rgba(0,122,255,0.07)',
    fontSize: 12, fontWeight: 600, color: '#007aff',
    cursor: 'pointer',
  },

  headerRight: {
    display:'flex', alignItems:'center',
    gap:10, flexShrink:0,
  },
  loadingPill: {
    display:'flex', alignItems:'center', gap:6,
    background:'rgba(0,122,255,0.09)', color:'#007aff',
    fontSize:11, fontWeight:600, padding:'3px 10px', borderRadius:20,
  },
  spinnerSm: {
    width:11, height:11,
    border:'1.5px solid rgba(0,122,255,0.2)',
    borderTopColor:'#007aff',
    borderRadius:'50%',
    animation:'spin 0.7s linear infinite',
    flexShrink:0,
  },
  lastUpdate: {
    fontSize:11, color:'var(--text-light)',
  },
  refreshBtn: {
    display:'flex', alignItems:'center',
    background:'white', border:'1px solid rgba(0,0,0,0.12)',
    borderRadius:8, color:'#007aff', fontSize:12, fontWeight:600,
    padding:'5px 12px',
    boxShadow:'0 1px 3px rgba(0,0,0,0.07)',
  },

  body: { flex:1, display:'flex', overflow:'hidden' },
  mapWrap: { flex:1, position:'relative', overflow:'hidden' },
  dataWrap: { flex:1, overflow:'hidden' },

  errWrap: {
    display:'flex', alignItems:'center', justifyContent:'center',
    height:'100%', background:'var(--bg)',
  },
  errBox: {
    background:'var(--card)',
    border:'1px solid var(--border-med)',
    borderRadius:18, padding:'40px 44px',
    maxWidth:420, textAlign:'center',
    boxShadow:'var(--shadow-lg)',
  },
  errEmoji: { fontSize:44, marginBottom:14 },
  errTitle: { fontSize:18, fontWeight:700, color:'var(--text)', marginBottom:8 },
  errMsg:   { fontSize:13, color:'var(--text-muted)', marginBottom:14 },
  errCmd: {
    background:'var(--card-alt)', border:'1px solid var(--border)',
    borderRadius:8, padding:'8px 14px', marginBottom:22,
    fontFamily:'monospace', fontSize:12, color:'var(--text-2)',
  },
  retryBtn: {
    background:'#007aff', border:'none', borderRadius:10,
    color:'#fff', fontWeight:600, fontSize:14,
    padding:'10px 28px',
    boxShadow:'0 4px 14px rgba(0,122,255,0.35)',
  },
}
