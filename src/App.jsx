import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Confetti from 'react-confetti'
import { getCharacters, getCharacter, getPlanets, getPlanetWithCharacters } from './api'

// Parse KI strings like "2.5M"
function normalizeKi(ki) {
  if (!ki) return 0
  const s = String(ki).replace(/,/g, '').trim()
  const n = parseFloat(s.replace(/[^\d.]/g, '')) || 0
  if (/b/i.test(s)) return n * 1e9
  if (/m/i.test(s)) return n * 1e6
  if (/k/i.test(s)) return n * 1e3
  return n
}

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
  const [characters, setCharacters] = useState([])
  const [planets, setPlanets] = useState([])
  const [filterPlanetId, setFilterPlanetId] = useState('all')
  const [loading, setLoading] = useState(true)
  const [picked, setPicked] = useState({ a: null, b: null })
  const [history, setHistory] = useState([])
  const [currentWinnerId, setCurrentWinnerId] = useState(null)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const [chars, pls] = await Promise.all([getCharacters(1, 50), getPlanets(50)])
      setCharacters(chars)
      setPlanets(pls)
      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    if (filterPlanetId === 'all') return
    ;(async () => {
      const planet = await getPlanetWithCharacters(filterPlanetId)
      const list = planet.characters ?? []
      const hydrated = await Promise.all(list.map(async c => {
        try { return await getCharacter(c.id) } catch { return c }
      }))
      setCharacters(hydrated)
      setPicked({ a: null, b: null })
    })()
  }, [filterPlanetId])

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
    const aKi = normalizeKi(picked.a.ki || picked.a.maxKi)
    const bKi = normalizeKi(picked.b.ki || picked.b.maxKi)
    const winner = aKi >= bKi ? picked.a : picked.b

    setHistory(h => [{ a: picked.a, b: picked.b, winner, at: Date.now() }, ...h].slice(0, 10))
    setCurrentWinnerId(winner.id)
    setShowConfetti(true)

    setTimeout(() => {
      setShowConfetti(false)
      setCurrentWinnerId(null)
    }, 3000)
  }

  const selectedIds = useMemo(() => new Set([picked.a?.id, picked.b?.id].filter(Boolean)), [picked])

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 16, maxWidth: 1100, margin: '0 auto' }}>
      <h1>Dragon Ball: Ki Battle</h1>

      <section style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <label>
          Planet filter:{' '}
          <select value={filterPlanetId} onChange={e => setFilterPlanetId(e.target.value)}>
            <option value="all">All planets</option>
            {planets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>

        <button onClick={battleNow} disabled={!picked.a || !picked.b}>
          ⚔️ Battle
        </button>
      </section>

      {loading ? <p>Loading…</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {characters.map(c => {
            const isA = picked.a?.id === c.id
            const isB = picked.b?.id === c.id
            const isPicked = isA || isB
            const isWinner = c.id === currentWinnerId

            return (
              <motion.article
                key={c.id}
                onClick={() => togglePick(c)}
                animate={{
                  scale: isWinner ? 1.1 : 1,
                  boxShadow: isWinner ? '0 0 25px 8px gold' : '0 0 0px transparent'
                }}
                transition={{ duration: 0.4 }}
                style={{
                  position: 'relative',
                  border: `2px solid ${isPicked ? 'green' : '#ddd'}`,
                  borderRadius: 12,
                  padding: 10,
                  cursor: 'pointer',
                }}
              >
                {/* Confetti burst above winner */}
                {isWinner && showConfetti && (
                  <Confetti
                    width={180}
                    height={60}
                    numberOfPieces={40}
                    recycle={false}
                    gravity={0.3}
                    style={{
                      position: 'absolute',
                      top: -30,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      pointerEvents: 'none',
                      zIndex: 10,
                    }}
                  />
                )}

                {isPicked && (
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    background: isA ? '#3b82f6' : '#f59e0b',
                    color: 'white',
                    padding: '2px 6px',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 'bold'
                  }}>
                    {isA ? 'Player A' : 'Player B'}
                  </div>
                )}

                <img src={c.image} alt={c.name} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover' }} />
                <h3>{c.name}</h3>
                <div style={{ fontSize: 13 }}>KI: {c.ki || c.maxKi || 'unknown'}</div>
                {c.originPlanet?.name && <div style={{ fontSize: 12 }}>Planet: {c.originPlanet.name}</div>}
                {c.description && <p style={{ fontSize: 12 }}>{translateES(c.description)}</p>}
              </motion.article>
            )
          })}
        </div>
      )}

      <h2>Battle History</h2>
      <AnimatePresence>
        {history.length === 0 ? (
          <p>No battles yet.</p>
        ) : (
          <ol style={{ listStyle: 'none', padding: 0 }}>
            {history.map(item => (
              <motion.li
                key={item.at}
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.5 }}
                style={{
                  background: '#f9fafb',
                  margin: '8px 0',
                  padding: '8px 12px',
                  borderRadius: 8,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                }}
              >
                🏆 <strong>{item.winner.name}</strong> beat {item.winner.id === item.a.id ? item.b.name : item.a.name}
              </motion.li>
            ))}
          </ol>
        )}
      </AnimatePresence>
    </div>
  )
}
