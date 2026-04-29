import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import DeckGL from '@deck.gl/react'
import { GeoJsonLayer } from '@deck.gl/layers'
import { FlyToInterpolator } from '@deck.gl/core'
import { Map } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import MapStyleSwitcher, { MAP_STYLES } from './MapStyleSwitcher'
import Tooltip from './Tooltip'

const INITIAL_VIEW = {
  longitude: 67.38,
  latitude:  40.67,
  zoom:      11.2,
  pitch:     0,
  bearing:   0,
}

export default function MapView({ mapData, onParcelClick, flyToTarget, selectedId }) {
  const [styleId,   setStyleId]   = useState('light')
  const [hoveredId, setHoveredId] = useState(null)
  const [tooltip,   setTooltip]   = useState(null)  // { x, y, props }
  const [viewState, setViewState] = useState(INITIAL_VIEW)
  const deckRef = useRef(null)

  /* ── FlyTo при поиске ── */
  useEffect(() => {
    if (!flyToTarget) return
    setViewState(prev => ({
      ...prev,
      longitude: flyToTarget.lon,
      latitude:  flyToTarget.lat,
      zoom:      15,
      transitionDuration: 1400,
      transitionInterpolator: new FlyToInterpolator({ speed: 1.6 }),
    }))
  }, [flyToTarget])

  const mapStyle = useMemo(() => {
    const found = MAP_STYLES.find(s => s.id === styleId)
    return found?.url
  }, [styleId])

  const outlineBaseColor = styleId === 'dark'
    ? [30, 220, 190, 180]
    : [20, 90, 200, 200]

  const layers = useMemo(() => {
    if (!mapData) return []
    return [
      new GeoJsonLayer({
        id: 'fills',
        data: mapData.fills,
        filled: true,
        stroked: false,
        getFillColor: f => {
          const c = f.properties.fill_color
          const isHov = hoveredId === f.properties.id
          const isSel = selectedId === f.properties.id
          if (isSel) return [Math.min(c[0]+20,255), Math.min(c[1]+20,255), Math.min(c[2]+20,255), 230]
          if (isHov) return [Math.min(c[0]+35,255), Math.min(c[1]+35,255), Math.min(c[2]+35,255), 215]
          return c
        },
        updateTriggers: { getFillColor: [hoveredId, selectedId] },
        pickable: false,
      }),
      new GeoJsonLayer({
        id: 'outlines',
        data: mapData.outlines,
        filled: false,
        stroked: true,
        getLineColor: f => {
          if (selectedId === f.properties.id) return [0, 122, 255, 255]
          if (hoveredId  === f.properties.id) return [0, 122, 255, 200]
          return outlineBaseColor
        },
        getLineWidth: f => {
          if (selectedId === f.properties.id) return 3.5
          if (hoveredId  === f.properties.id) return 2.5
          return 1.5
        },
        lineWidthMinPixels: 1,
        lineWidthMaxPixels: 6,
        updateTriggers: {
          getLineColor: [hoveredId, selectedId, styleId],
          getLineWidth:  [hoveredId, selectedId],
        },
        pickable: true,
        onHover: ({ object, x, y }) => {
          setHoveredId(object ? object.properties.id : null)
          setTooltip(object ? { x, y, props: object.properties } : null)
        },
        onClick: ({ object }) => {
          if (object) onParcelClick(object.properties)
        },
      }),
    ]
  }, [mapData, hoveredId, selectedId, styleId, outlineBaseColor, onParcelClick])

  const getCursor = useCallback(({ isHovering }) =>
    isHovering ? 'pointer' : 'grab'
  , [])

  return (
    <div style={{ position:'relative', width:'100%', height:'100%' }}>
      <DeckGL
        ref={deckRef}
        viewState={viewState}
        onViewStateChange={({ viewState: vs }) => setViewState(vs)}
        controller={{ dragRotate: false }}
        layers={layers}
        getCursor={getCursor}
      >
        <Map mapStyle={mapStyle} />
      </DeckGL>

      <MapStyleSwitcher activeId={styleId} onChange={setStyleId} />

      {/* Количество участков */}
      {mapData && (
        <div style={s.countBadge}>
          {mapData.outlines.features.length} участков
        </div>
      )}

      {tooltip && !selectedId && (
        <Tooltip x={tooltip.x} y={tooltip.y} props={tooltip.props} />
      )}

      {!mapData && (
        <div style={s.loadOverlay}>
          <div style={s.loadBox}>
            <div style={s.spinner} />
            Загрузка карты...
          </div>
        </div>
      )}
    </div>
  )
}

const s = {
  countBadge: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    background: 'rgba(255,255,255,0.88)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(0,0,0,0.1)',
    borderRadius: 20,
    padding: '4px 12px',
    fontSize: 11,
    fontWeight: 600,
    color: '#3c3c43',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    zIndex: 10,
    pointerEvents: 'none',
  },
  loadOverlay: {
    position: 'absolute', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    pointerEvents: 'none',
  },
  loadBox: {
    background: 'rgba(255,255,255,0.92)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(0,0,0,0.09)',
    borderRadius: 12,
    padding: '12px 20px',
    display: 'flex', alignItems: 'center', gap: 10,
    fontSize: 13, color: '#6e6e73',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  },
  spinner: {
    width: 16, height: 16,
    border: '2px solid rgba(0,122,255,0.15)',
    borderTopColor: '#007aff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
    flexShrink: 0,
  },
}
