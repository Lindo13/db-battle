import { useEffect, useState, useMemo } from 'react'
import Confetti from 'react-confetti'
import { getCharacters, getPlanets } from './api'

// Parse KI values like "2.5M"
function normalizeKi(ki) {
  if (!ki) return 0
  const s = String(ki).replace(/,/g, '').trim()
  const n = parseFloat(s.replace(/[^\d.]/g, '')) || 0
  if (/b/i.test(s)) return n * 1e9
  if (/m/i.test(s)) return n * 1e6
  if (/k/i.test(s)) return n * 1e3
  return n
}

// Spanish → English dictionary
const ES_EN = { Saiyajin: 'Saiyan', Tierra: 'Earth', Planeta: 'Planet' }
function translateES(text) {
  if (!text) return ''
  let out = text
  for (const [es, en] of Object.entries(ES_EN)) {
    out = out.replace(new RegExp(`\\b${es}\\b`, 'gi'), en)
  }
  return out
}

export default function App() {
  const [allCharacters, setAllCharacters] = useState([])
  const [characters, setCharacters] = useState([])
  const [planets, setPlanets] = useState([])
  const [filterPlanetName, setFilterPlanetName] = useState('all')
  const [loading, setLoading] = useState(true)
  const [picked, setPicked] = useState({ a: null, b: null })
  const [history, setHistory] = useState([])
  const [currentWinnerId, setCurrentWinnerId] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)

  // Load characters & planets
  useEffect(() => {
    (async () => {
      setLoading(true)
      const [chars, pls] = await Promise.all([getCharacters(), getPlanets()])

      const normalizedChars = chars.map(c => ({
        ...c,
        originPlanetName: c.originPlanet?.name || 'Unknown'
      }))

      setAllCharacters(normalizedChars)
      setCharacters(normalizedChars)

      const planetNames = Array.from(new Set(normalizedChars.map(c => c.originPlanetName).filter(Boolean)))
      setPlanets(planetNames)

      setLoading(false)
    })()
  }, [])

  // Filter characters by planet
  useEffect(() => {
    if (filterPlanetName === 'all') {
      setCharacters(allCharacters)
      setPicked({ a: null, b: null })
      return
    }
    const filtered = allCharacters.filter(
      c => c.originPlanetName?.toLowerCase() === filterPlanetName.toLowerCase()
    )
    setCharacters(filtered)
    setPicked({ a: null, b: null })
  }, [filterPlanetName, allCharacters])

  const sortedCharacters = useMemo(() => {
    return [...characters].sort((a, b) => normalizeKi(b.ki || b.maxKi) - normalizeKi(a.ki || a.maxKi))
  }, [characters])

  function togglePick(c) {
    setPicked(prev => {
      if (prev.a?.id === c.id) return { a: null, b: prev.b }
      if (prev.b?.id === c.id) return { a: prev.a, b: null }
      if (!prev.a) return { a: c, b: prev.b }
      if (!prev.b) return { a: prev.a, b: c }
      return { a: c, b: prev.b }
    })
  }

  function battleNow() {
    if (!picked.a || !picked.b) return
    const winner = normalizeKi(picked.a.ki || picked.a.maxKi) >= normalizeKi(picked.b.ki || picked.b.maxKi)
      ? picked.a
      : picked.b

    setHistory(h => [{ a: picked.a, b: picked.b, winner, at: Date.now() }, ...h].slice(0, 10))
    setCurrentWinnerId(winner.id)
    setShowConfetti(true)

    // Stop confetti after 3 seconds + clear highlight
    setTimeout(() => {
      setShowConfetti(false)
      setCurrentWinnerId(null)
    }, 3000)
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <h1>Dragon Ball: Ki Battle</h1>

      {/* Confetti animation when someone wins */}
      {showConfetti && <Confetti recycle={false} numberOfPieces={400} />}

      {/* Planet Filter */}
      <section style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <label>
          Planet filter:{' '}
          <select value={filterPlanetName} onChange={e => setFilterPlanetName(e.target.value)}>
            <option value="all">All planets</option>
            {planets.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </label>

        <button onClick={battleNow} disabled={!picked.a || !picked.b} style={{ marginLeft: 12 }}>
          ⚔️ Battle
        </button>
      </section>

      {/* Characters Grid */}
      {loading ? <p>Loading…</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginTop: 16 }}>
          {sortedCharacters.map(c => {
            const isA = picked.a?.id === c.id
            const isB = picked.b?.id === c.id
            const isPicked = isA || isB
            const isWinner = c.id === currentWinnerId

            return (
              <article
                key={c.id}
                onClick={() => togglePick(c)}
                style={{
                  position: 'relative',
                  border: `2px solid ${isPicked ? 'green' : '#ddd'}`,
                  borderRadius: 12,
                  padding: 10,
                  cursor: 'pointer',
                  boxShadow: isWinner ? '0 0 20px 4px gold' : 'none',
                  transition: 'box-shadow 0.3s ease'
                }}
              >
                {isPicked && (
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    background: isA ? '#3b82f6' : '#f59e0b', color: 'white',
                    padding: '2px 6px', borderRadius: 6, fontSize: 12, fontWeight: 'bold'
                  }}>
                    {isA ? 'Player A' : 'Player B'}
                  </div>
                )}

                <img src={c.image} alt={c.name} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }} />
                <h3>{c.name}</h3>
                <div style={{ fontSize: 13 }}>KI: {c.ki || c.maxKi || 'unknown'}</div>
                {c.originPlanetName && <div style={{ fontSize: 12 }}>Planet: {c.originPlanetName}</div>}
                {c.description && <p style={{ fontSize: 12 }}>{translateES(c.description)}</p>}

                <button
                  onClick={e => { e.stopPropagation(); togglePick(c) }}
                  style={{
                    marginTop: 8,
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid #ccc',
                    background: isPicked ? '#dc2626' : '#16a34a',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  {isPicked ? 'Deselect' : 'Select'}
                </button>
              </article>
            )
          })}
        </div>
      )}

      {/* Battle History */}
      <h2>Battle History</h2>
      {history.length === 0 ? <p>No battles yet.</p> : (
        <ol>
          {history.map(item => (
            <li key={item.at}>
              <strong>{item.winner.name}</strong> beat {item.winner.id === item.a.id ? item.b.name : item.a.name}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
 