import { useState, useRef } from 'react'

export default function SearchBar({ onResult, onError }) {
  const [query,   setQuery]   = useState('')
  const [loading, setLoading] = useState(false)
  const [shake,   setShake]   = useState(false)
  const inputRef = useRef(null)

  const handleSearch = async (e) => {
    e?.preventDefault()
    const q = query.trim()
    if (!q) return

    setLoading(true)
    try {
      const res = await fetch(`/api/parcels/search?q=${encodeURIComponent(q)}`)
      if (res.status === 404) {
        setShake(true)
        setTimeout(() => setShake(false), 500)
        onError?.('Участок не найден')
        setLoading(false)
        return
      }
      if (!res.ok) throw new Error('Ошибка сервера')
      const data = await res.json()
      onResult(data)
      onError?.(null)
    } catch (err) {
      onError?.(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={s.wrap}>
      <form onSubmit={handleSearch} style={{ display:'flex', gap:0 }}>
        <div style={{ ...s.inputWrap, ...(shake ? s.shake : {}) }}>
          <span style={s.searchIcon}>
            {loading
              ? <span style={s.spinner} />
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            }
          </span>
          <input
            ref={inputRef}
            style={s.input}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="ИИН или кадастровый номер..."
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              type="button"
              style={s.clearBtn}
              onClick={() => { setQuery(''); inputRef.current?.focus() }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          )}
        </div>
        <button
          type="submit"
          style={{ ...s.submitBtn, ...(loading ? s.submitDisabled : {}) }}
          disabled={loading || !query.trim()}
        >
          Найти
        </button>
      </form>
      <div style={s.hint}>
        Введите 12-значный ИИН или номер вида <span style={s.code}>21:01:123456:0001</span>
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
    padding: '12px 14px',
    marginBottom: 10,
  },
  inputWrap: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    background: 'var(--bg)',
    border: '1.5px solid var(--border-med)',
    borderRadius: '8px 0 0 8px',
    overflow: 'hidden',
    transition: 'border-color 0.15s',
  },
  shake: {
    animation: 'shake 0.4s ease',
    borderColor: '#ff3b30 !important',
  },
  searchIcon: {
    padding: '0 10px',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  spinner: {
    display: 'block',
    width: 14,
    height: 14,
    border: '2px solid rgba(0,122,255,0.2)',
    borderTopColor: '#007aff',
    borderRadius: '50%',
    animation: 'spin 0.7s linear infinite',
  },
  input: {
    flex: 1,
    border: 'none',
    background: 'transparent',
    color: 'var(--text)',
    fontSize: 12,
    padding: '8px 0',
    outline: 'none',
    minWidth: 0,
  },
  clearBtn: {
    border: 'none',
    background: 'transparent',
    color: 'var(--text-light)',
    padding: '0 8px',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
  },
  submitBtn: {
    background: '#007aff',
    color: '#fff',
    border: 'none',
    borderRadius: '0 8px 8px 0',
    fontWeight: 600,
    fontSize: 12,
    padding: '0 14px',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  submitDisabled: { opacity: 0.5, cursor: 'not-allowed' },
  hint: {
    marginTop: 8,
    fontSize: 10.5,
    color: 'var(--text-light)',
    lineHeight: 1.5,
  },
  code: {
    fontFamily: 'monospace',
    background: 'var(--bg)',
    border: '1px solid var(--border)',
    borderRadius: 3,
    padding: '0 3px',
    fontSize: 10,
    color: 'var(--text-muted)',
  },
}
