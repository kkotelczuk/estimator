import { useCallback, useEffect, useMemo, useState } from 'react'

const PEOPLE = ['Gabriel', 'Konrad', 'Akadera', 'łukasz', 'Dycu']
const STORAGE_KEY = 'estimator-clicks'
const RESULT_LAST_CLICKS = 3

const SCORE_RANGES = [
  { display: '0-2', label: 'LOSS CRITICAL', worst: 0, best: 2 },
  { display: '2-4', label: 'MAJOR DEFEAT', worst: 2, best: 4 },
  { display: '5-8', label: 'MINOR LOSS', worst: 5, best: 8 },
  { display: '9-11', label: 'BALANCED', worst: 9, best: 11 },
  { display: '12-14', label: 'MINOR WIN', worst: 12, best: 14 },
  { display: '15-17', label: 'MAJOR WIN', worst: 15, best: 17 },
  { display: '17-20', label: 'DOMINANCE', worst: 17, best: 20 },
  { display: 'TIMER', label: 'SYSTEM SYNC', worst: null, best: null, isTimer: true },
]

const RANGE_COLORS = {
  '0-2': { bg: '#5c1010', text: '#ff9090', border: '#7a1a1a', borderTop: '#cc2020' },
  '2-4': { bg: '#dc4e4e', text: '#ffffff', border: '#c44040', borderTop: '#ff7070' },
  '5-8': { bg: '#e07830', text: '#ffffff', border: '#c86828', borderTop: '#ffa850' },
  '9-11': { bg: '#d4b820', text: '#1a1a0a', border: '#b8a018', borderTop: '#f0d840' },
  '12-14': { bg: '#2a6e3a', text: '#c0f0cc', border: '#1e5a2c', borderTop: '#48b860' },
  '15-17': { bg: '#0f3318', text: '#80d090', border: '#0a2810', borderTop: '#1a6828' },
  '17-20': { bg: '#38c850', text: '#ffffff', border: '#2eb040', borderTop: '#60e870' },
  TIMER: { bg: '#1e2428', text: '#8b949e', border: '#2d333b', borderTop: '#505860' },
}

/* ---------- helpers (logic unchanged) ---------- */

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function readClicks() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeClicks(clicks) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(clicks))
}


/* ---------- small UI helpers ---------- */

function getInitials(name) {
  return name.slice(0, 2).toUpperCase()
}

function timeAgo(timestamp, now) {
  const seconds = Math.floor((now - timestamp) / 1000)
  if (seconds < 5) return 'just now'
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}

/* ================================================
   App
   ================================================ */

export default function App() {
  const [person, setPerson] = useState(PEOPLE[0])
  const [tab, setTab] = useState('matrix')
  const [clicks, setClicks] = useState(() => readClicks())
  const [rangeOrder, setRangeOrder] = useState(SCORE_RANGES)
  const [now, setNow] = useState(Date.now())

  /* live clock for "updated X ago" */
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const persist = useCallback((next) => {
    setClicks(next)
    writeClicks(next)
  }, [])

  const handleCellClick = useCallback(
    (cell) => {
      if (cell.isTimer) return // timer does not record
      const entry = {
        person,
        display: cell.display,
        worst: cell.worst,
        best: cell.best,
        at: Date.now(),
      }
      persist([...clicks, entry])
    },
    [person, clicks, persist],
  )

  const handleReshuffle = useCallback(() => {
    setRangeOrder(() => {
      const nonTimer = [...SCORE_RANGES.filter((r) => !r.isTimer)]
      const timer = SCORE_RANGES.filter((r) => r.isTimer)
      shuffleInPlace(nonTimer)
      return [...nonTimer, ...timer]
    })
  }, [])


  const handleReset = useCallback(() => {
    persist([])
  }, [persist])

  /* ---------- derived data (logic unchanged) ---------- */

  const clicksByPerson = useMemo(() => {
    const map = Object.fromEntries(PEOPLE.map((p) => [p, []]))
    for (const e of clicks) {
      if (map[e.person]) map[e.person].push(e)
    }
    return map
  }, [clicks])

  const lastThreeByPerson = useMemo(() => {
    return Object.fromEntries(
      PEOPLE.map((p) => {
        const list = clicksByPerson[p]
        const n = list.length
        return [
          p,
          [
            n >= 3 ? list[n - 3] : null,
            n >= 2 ? list[n - 2] : null,
            n >= 1 ? list[n - 1] : null,
          ],
        ]
      }),
    )
  }, [clicksByPerson])

  /* live-score simulation: best / lowest / totals */
  const liveScore = useMemo(() => {
    let bestTotal = 0
    let worstTotal = 0
    let count = 0

    for (const p of PEOPLE) {
      const list = clicksByPerson[p]
      if (list.length === 0) continue
      const latest = list[list.length - 1]
      count++
      bestTotal += latest.best
      worstTotal += latest.worst
    }

    const maxPossible = 100
    const bestOpponent = maxPossible - bestTotal
    const worstOpponent = maxPossible - worstTotal
    return { bestTotal, worstTotal, bestOpponent, worstOpponent, maxPossible, count }
  }, [clicksByPerson])

  const latestActivity = useMemo(() => {
    if (clicks.length === 0) return null
    return clicks[clicks.length - 1]
  }, [clicks])

  const awaitingPerson = useMemo(() => {
    for (const p of PEOPLE) {
      if (clicksByPerson[p].length === 0) return p
    }
    return null
  }, [clicksByPerson])

  /* ================================================
     RENDER
     ================================================ */
  return (
    <div className="app-container">

      {/* ---- Main Content ---- */}
      <main className="main-content">
        {tab === 'matrix' && (
          <div className="dashboard-fullpage">
            {/* Header */}
            <div className="console-header">
              <div>
                <span className="mode-badge">ESTIMATOR MODE: S13</span>
                <h1 className="console-title">CAPTAIN&rsquo;S TACTICAL CONSOLE</h1>
                <p className="console-subtitle">
                  WTC 2024 / Round 4 / Match 12.A
                </p>
              </div>
              <div className="header-actions">
                <button className="btn-outline" onClick={handleReshuffle}>
                  RESHUFFLE
                </button>
                <button className="btn-primary" onClick={() => setTab('result')}>
                  RESULTS
                </button>
              </div>
            </div>

            {/* Person Selector */}
            <section className="person-section">
              <h2 className="section-label">⚔ ACTIVE STRATEGIST</h2>
              <div className="person-grid">
                {PEOPLE.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPerson(p)}
                    className={`person-card ${person === p ? 'selected' : ''}`}
                  >
                    <div className="person-avatar">{getInitials(p)}</div>
                    <div className="person-name">{p}</div>
                    <div
                      className={`person-status ${person === p ? 'active' : ''}`}
                    >
                      {person === p ? 'SELECTED' : 'STANDBY'}
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Score Range Grid */}
            <section className="score-grid">
              {rangeOrder.map((cell, i) => {
                const colors = RANGE_COLORS[cell.display]
                return (
                  <button
                    key={`${cell.display}-${i}`}
                    onClick={() => handleCellClick(cell)}
                    className="score-cell"
                    style={{
                      '--cell-bg': colors.bg,
                      '--cell-text': colors.text,
                      '--cell-border': colors.border,
                      '--cell-border-top': colors.borderTop,
                    }}
                  >
                    <span className="score-value">{cell.display}</span>
                    <span className="score-label">{cell.label}</span>
                  </button>
                )
              })}
            </section>
          </div>
        )}

        {/* ---- Result View ---- */}
        {tab === 'result' && (
          <div className="result-view">
            <div className="result-header">
              <button className="btn-outline" onClick={() => setTab('matrix')}>
                ← BACK TO CONSOLE
              </button>
              <h2 className="result-title">ESTIMATION RESULTS</h2>
              <button className="btn-danger" onClick={handleReset}>
                RESET DATA
              </button>
            </div>

            {/* Live Score Simulation */}
            <div className="live-score-panel">
              <div className="live-score-header">
                <h3 className="live-score-title">LIVE SCORE SIMULATION</h3>
                <span className="live-score-updated">
                  {latestActivity
                    ? `UPDATED ${timeAgo(latestActivity.at, now)}`
                    : 'NO DATA YET'}
                </span>
              </div>
              <div className="live-score-body">
                {/* Best Scenario */}
                <div className="live-score-scenario">
                  <span className="scenario-title best">BEST SCENARIO</span>
                  <div className="scenario-row">
                    <div className="score-stat estimated">
                      <span className="score-stat-value">{liveScore.bestTotal}</span>
                      <span className="score-stat-label">OUR PTS</span>
                    </div>
                    <div className="score-bar-container">
                      <div
                        className="score-bar-fill"
                        style={{ width: `${(liveScore.bestTotal / liveScore.maxPossible) * 100}%` }}
                      />
                      <div
                        className="score-bar-opponent"
                        style={{ width: `${(liveScore.bestOpponent / liveScore.maxPossible) * 100}%` }}
                      />
                    </div>
                    <div className="score-stat opponent">
                      <span className="score-stat-value">{liveScore.bestOpponent}</span>
                      <span className="score-stat-label">OPP PTS</span>
                    </div>
                  </div>
                </div>
                {/* Worst Scenario */}
                <div className="live-score-scenario">
                  <span className="scenario-title worst">WORST SCENARIO</span>
                  <div className="scenario-row">
                    <div className="score-stat estimated">
                      <span className="score-stat-value">{liveScore.worstTotal}</span>
                      <span className="score-stat-label">OUR PTS</span>
                    </div>
                    <div className="score-bar-container">
                      <div
                        className="score-bar-fill worst"
                        style={{ width: `${(liveScore.worstTotal / liveScore.maxPossible) * 100}%` }}
                      />
                      <div
                        className="score-bar-opponent"
                        style={{ width: `${(liveScore.worstOpponent / liveScore.maxPossible) * 100}%` }}
                      />
                    </div>
                    <div className="score-stat opponent">
                      <span className="score-stat-value">{liveScore.worstOpponent}</span>
                      <span className="score-stat-label">OPP PTS</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="result-table-container">
              <table className="result-table">
                <thead>
                  <tr>
                    <th>STRATEGIST</th>
                    {[
                      { key: 'older', label: '-2' },
                      { key: 'prev', label: '-1' },
                      { key: 'latest', label: 'LATEST' },
                    ].map(({ key, label }) => (
                      <th key={key}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PEOPLE.map((name) => (
                    <tr key={name}>
                      <td className="strategist-cell">
                        <span className="mini-avatar">{getInitials(name)}</span>
                        {name}
                      </td>
                      {Array.from({ length: RESULT_LAST_CLICKS }, (_, i) => {
                        const entry = lastThreeByPerson[name][i]
                        return (
                          <td key={i} className="score-cell-result">
                            {entry ? (
                              <span
                                className="result-badge"
                                style={{
                                  '--badge-bg':
                                    RANGE_COLORS[entry.display]?.bg ||
                                    '#2d333b',
                                }}
                              >
                                {entry.display}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Stats */}
            <div className="result-summary">
              <div className="summary-card">
                <span className="summary-label">BEST SCENARIO</span>
                <span className="summary-value best">
                  {liveScore.bestTotal} — {liveScore.bestOpponent}
                </span>
              </div>
              <div className="summary-card">
                <span className="summary-label">WORST SCENARIO</span>
                <span className="summary-value lowest">
                  {liveScore.worstTotal} — {liveScore.worstOpponent}
                </span>
              </div>
              <div className="summary-card">
                <span className="summary-label">TOTAL POOL</span>
                <span className="summary-value">{liveScore.maxPossible}</span>
              </div>
              <div className="summary-card">
                <span className="summary-label">SUBMISSIONS</span>
                <span className="summary-value">
                  {liveScore.count}/{PEOPLE.length}
                </span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
