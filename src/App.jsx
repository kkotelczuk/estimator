import { useCallback, useMemo, useState } from 'react'

const PEOPLE = ['Gabriel', 'Konrad', 'Akadera', 'łukasz', 'Dycu']
const STORAGE_KEY = 'estimator-clicks'
const COLS = 6
const ROWS = 4
const LAST_COL = COLS - 1
const FIXED_LAST_COL = [
  { kind: 'fixed', display: '+5min', score: 5 },
  { kind: 'fixed', display: '+15min', score: 15 },
  { kind: 'fixed', display: '???', score: 0 },
]

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function buildMatrix() {
  const nums = Array.from({ length: 21 }, (_, i) => i)
  shuffleInPlace(nums)
  const grid = []
  let n = 0
  for (let r = 0; r < ROWS; r++) {
    const row = []
    for (let c = 0; c < COLS; c++) {
      if (c === LAST_COL && r < 3) {
        row.push({ ...FIXED_LAST_COL[r] })
      } else {
        const value = nums[n++]
        row.push({
          kind: 'number',
          display: String(value),
          score: value,
        })
      }
    }
    grid.push(row)
  }
  return grid
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

function sumForPerson(clicks, person) {
  return clicks
    .filter((e) => e.person === person)
    .reduce((acc, e) => acc + (typeof e.score === 'number' ? e.score : 0), 0)
}

export default function App() {
  const [person, setPerson] = useState(PEOPLE[0])
  const [tab, setTab] = useState('matrix')
  const [matrix, setMatrix] = useState(() => buildMatrix())
  const [clicks, setClicks] = useState(() => readClicks())

  const persist = useCallback((next) => {
    setClicks(next)
    writeClicks(next)
  }, [])

  const handleCellClick = useCallback(
    (cell) => {
      const entry = {
        person,
        display: cell.display,
        score: cell.score,
        at: Date.now(),
      }
      persist([...clicks, entry])
      setMatrix(buildMatrix())
    },
    [person, clicks, persist],
  )

  const handleReset = useCallback(() => {
    persist([])
  }, [persist])

  const totals = useMemo(
    () =>
      PEOPLE.map((p) => ({
        name: p,
        total: sumForPerson(clicks, p),
      })),
    [clicks],
  )

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-slate-950 text-slate-100">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-900/80 px-3 py-2">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <span className="whitespace-nowrap">Person</span>
          <select
            value={person}
            onChange={(e) => setPerson(e.target.value)}
            className="rounded-md border border-slate-600 bg-slate-800 px-2 py-1 text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-500"
          >
            {PEOPLE.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <div
          className="flex rounded-lg border border-slate-600 p-0.5"
          role="tablist"
          aria-label="View"
        >
          {[
            { id: 'matrix', label: 'Matrix' },
            { id: 'result', label: 'Result' },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`rounded-md px-3 py-1 text-sm font-medium transition ${
                tab === id
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <main className="min-h-0 min-w-0 flex-1 p-2">
        {tab === 'matrix' && (
          <div
            className="grid h-full min-h-0 w-full min-w-0 gap-1 sm:gap-2"
            style={{
              gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${ROWS}, minmax(0, 1fr))`,
            }}
          >
            {matrix.map((row, r) =>
              row.map((cell, c) => (
                <button
                  key={`${r}-${c}`}
                  type="button"
                  onClick={() => handleCellClick(cell)}
                  className="flex min-h-0 min-w-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/90 text-center text-[clamp(0.75rem,4vmin,1.5rem)] font-semibold leading-tight text-sky-100 shadow-inner transition hover:border-sky-500/60 hover:bg-slate-700/90 active:scale-[0.98]"
                >
                  {cell.display}
                </button>
              )),
            )}
          </div>
        )}

        {tab === 'result' && (
          <div className="flex h-full min-h-0 flex-col gap-4">
            <button
              type="button"
              onClick={handleReset}
              className="self-start rounded-lg border border-red-900/80 bg-red-950/80 px-4 py-2 text-sm font-medium text-red-100 hover:bg-red-900/80"
            >
              Reset stored data
            </button>
            <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-700">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900">
                    <th className="p-3 font-semibold text-slate-200">Person</th>
                    <th className="p-3 font-semibold text-slate-200">
                      Sum of clicked values
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {totals.map(({ name, total }) => (
                    <tr
                      key={name}
                      className="border-b border-slate-800 odd:bg-slate-900/40"
                    >
                      <td className="p-3 font-medium text-slate-200">{name}</td>
                      <td className="p-3 tabular-nums text-slate-100">{total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
