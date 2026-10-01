/** "mm:ss", "hh:mm:ss" or a plain number of seconds → seconds. */
export const parseDuration = (d: string | number | null | undefined): number => {
  if (d == null || d === '') return 0
  if (typeof d === 'number') return d
  const parts = d.split(':').map(Number)
  if (parts.some(isNaN)) return 0
  return parts.reduce((acc, n) => acc * 60 + n, 0)
}

/** 95 → "1:35", 3725 → "1:02:05". */
export const formatDuration = (seconds: number): string => {
  const s = Math.round(seconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return `${h ? `${h}:` : ''}${mm}:${String(sec).padStart(2, '0')}`
}

export const totalDuration = (videos: { duration?: string | number }[]): number =>
  videos.reduce((acc, v) => acc + parseDuration(v.duration), 0)

/** Bytes → "12.4 MB" (or "812 KB"). */
export const formatSize = (bytes: number | null | undefined): string => {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/** "YYYY-MM-DD" for today in the device's timezone. */
export const todayISO = (): string => {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
