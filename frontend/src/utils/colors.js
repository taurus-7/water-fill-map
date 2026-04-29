export const STATUSES = [
  { key:'normal',    label:'Норма',    range:'0–60%',   color:'#34c759', bg:'rgba(52,199,89,0.10)',   border:'rgba(52,199,89,0.25)',  rgba:[52,199,89,170]  },
  { key:'attention', label:'Внимание', range:'60–80%',  color:'#f59e0b', bg:'rgba(245,158,11,0.10)',  border:'rgba(245,158,11,0.25)', rgba:[245,158,11,175] },
  { key:'high',      label:'Высокое',  range:'80–95%',  color:'#f97316', bg:'rgba(249,115,22,0.10)',  border:'rgba(249,115,22,0.25)', rgba:[249,115,22,185] },
  { key:'critical',  label:'Критично', range:'95–100%', color:'#ff3b30', bg:'rgba(255,59,48,0.10)',   border:'rgba(255,59,48,0.25)',  rgba:[255,59,48,195]  },
]
export function getStatus(pct) {
  if (pct < 60) return STATUSES[0]
  if (pct < 80) return STATUSES[1]
  if (pct < 95) return STATUSES[2]
  return STATUSES[3]
}
export function formatVolume(m3) {
  if (m3 >= 1_000_000) return `${(m3/1_000_000).toFixed(2)} млн м³`
  if (m3 >= 1_000)     return `${(m3/1_000).toFixed(1)} тыс м³`
  return `${Math.round(m3)} м³`
}
export function formatPct(pct) {
  return `${pct.toFixed(1)}%`
}
