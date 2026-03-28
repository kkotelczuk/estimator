import { useCallback, useMemo, useState } from 'react'

const PEOPLE = ['Gabriel', 'Konrad', 'Akadera', 'łukasz', 'Dycu']
const STORAGE_KEY = 'estimator-clicks'
const RESULT_LAST_CLICKS = 3
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
        // Columns 1–3: third-from-last, second-from-last, latest (always col 3 = newest)
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

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col bg-slate-950 text-slate-100">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-900/80 px-3 py-2">
        <div
          className="flex min-w-0 flex-wrap gap-1 rounded-lg border border-slate-600 p-0.5"
          role="group"
          aria-label="Person"
        >
          {PEOPLE.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={person === p}
              onClick={() => setPerson(p)}
              className={`rounded-md px-2.5 py-1 text-sm font-medium transition sm:px-3 ${
                person === p
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
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
              <table className="border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700 bg-slate-900">
                    <th className="sticky left-0 z-10 bg-slate-900 p-3 font-semibold text-slate-200">
                      Person
                    </th>
                    {[
                      { key: 'older', label: '-2' },
                      { key: 'prev', label: '-1' },
                      { key: 'latest', label: 'Latest' },
                    ].map(({ key, label }) => (
                      <th
                        key={key}
                        className="whitespace-nowrap p-3 font-semibold text-slate-200"
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PEOPLE.map((name) => (
                    <tr
                      key={name}
                      className="border-b border-slate-800 odd:bg-slate-900/40"
                    >
                      <td className="sticky left-0 z-[1] border-r border-slate-700 bg-slate-950 p-3 font-medium text-slate-200 odd:bg-slate-900/80">
                        {name}
                      </td>
                      {Array.from({ length: RESULT_LAST_CLICKS }, (_, i) => {
                        const entry = lastThreeByPerson[name][i]
                        return (
                          <td
                            key={i}
                            className="whitespace-nowrap p-3 tabular-nums text-slate-100"
                          >
                            {entry ? entry.display : '—'}
                          </td>
                        )
                      })}
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
