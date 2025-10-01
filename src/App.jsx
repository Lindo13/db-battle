import { useEffect, useState, useMemo } from 'react'
import Confetti from 'react-confetti'
import { motion, AnimatePresence } from 'framer-motion'
import { getCharacters, getCharacter, getPlanets, getPlanetWithCharacters } from './api'

// Parse KI strings like "2.5M"
function normalizeKi(ki) {
  if (!ki) return 0;
  const s = String(ki).replace(/,/g, '').trim();
  const n = parseFloat(s.replace(/[^\d.]/g, '')) || 0;
  if (/b/i.test(s)) return n * 1e9;
  if (/m/i.test(s)) return n * 1e6;
  if (/k/i.test(s)) return n * 1e3;
  return n;
}

// Spanish → English dictionary
const ES_EN = { Saiyajin: 'Saiyan', Tierra: 'Earth', Planeta: 'Planet' };
function translateES(text) {
  if (!text) return '';
  let out = text;
  for (const [es, en] of Object.entries(ES_EN)) {
    out = out.replace(new RegExp(`\\b${es}\\b`, 'gi'), en);
  }
  return out;
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

  // Load characters & planets
  useEffect(() => {
    (async () => {
      setLoading(true)
      const [chars, pls] = await Promise.all([getCharacters(1, 50), getPlanets(50)])
      setCharacters(chars)
      setPlanets(pls)
      setLoading(false)
    })()
  }, [])

  // Filter characters by planet
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

  const selectedIds = useMemo(() => new Set([picked.a?.id, picked.b?.id].filter(Boolean)), [picked])

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

  return (
    <div
      style={{
        fontFamily: 'sans-serif',
        padding: 16,
        maxWidth: 1100,
        margin: '0 auto',
        minHeight: '100vh',
        background: 'linear-gradient(to top, #0f0c29, #302b63, #24243e)',
        color: 'white',
      }}
    >
      {/* Heading */}
      <h1
        style={{
          color: '#FFD700',
          textAlign: 'center',
          textShadow: '0 0 6px #FFD700, 0 0 12px #FFA500, 0 0 20px #FF4500, 0 0 30px #FFD700',
          fontSize: '2.5rem',
          marginBottom: 24,
        }}
      >
        Dragon Ball Battle
      </h1>

      {/* Confetti */}
      {showConfetti && <Confetti recycle={false} numberOfPieces={400} />}

      {/* Planet Filter & Battle Button */}
      <section
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          marginBottom: 16,
          justifyContent: 'center',
        }}
      >
        <label>
          Planet filter:{' '}
          <select
            value={filterPlanetId}
            onChange={e => setFilterPlanetId(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}
          >
            <option value="all">All planets</option>
            {planets.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>

        <button
          onClick={battleNow}
          disabled={!picked.a || !picked.b}
          style={{
            padding: '6px 12px',
            borderRadius: 6,
            background: '#FF4500',
            border: 'none',
            color: 'white',
            cursor: picked.a && picked.b ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
          }}
        >
          ⚔️ Battle
        </button>
      </section>

      {/* Characters Grid */}
      {loading ? <p>Loading…</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
          {characters.map(c => {
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
                  border: `2px solid ${isPicked ? '#00FF00' : '#ddd'}`,
                  borderRadius: 12,
                  padding: 10,
                  cursor: 'pointer',
                  background: 'rgba(0,0,0,0.4)',
                  boxShadow: isWinner ? '0 0 20px 6px #FFD700' : 'none',
                  transition: 'box-shadow 0.3s ease'
                }}
              >
                {isPicked && (
                  <div style={{
                    position: 'absolute', top: 8, right: 8,
                    background: isA ? '#3b82f6' : '#f59e0b',
                    color: 'white', padding: '2px 6px',
                    borderRadius: 6, fontSize: 12, fontWeight: 'bold'
                  }}>
                    {isA ? 'Player A' : 'Player B'}
                  </div>
                )}
                <img src={c.image} alt={c.name} style={{ width: '100%', aspectRatio: '1/1', objectFit: 'cover', borderRadius: 8 }} />
                <h3 style={{ marginTop: 6 }}>{c.name}</h3>
                <div style={{ fontSize: 13 }}>KI: {c.ki || c.maxKi || 'unknown'}</div>
                {c.originPlanet?.name && <div style={{ fontSize: 12 }}>Planet: {c.originPlanet.name}</div>}
                {c.description && <p style={{ fontSize: 12 }}>{translateES(c.description)}</p>}
              </article>
            )
          })}
        </div>
      )}

      {/* Battle History */}
      <h2 style={{ marginTop: 32, color: '#FFD700', textShadow: '1px 1px 4px black' }}>Battle History</h2>
      {history.length === 0 ? (
        <p>No battles yet.</p>
      ) : (
        <ol style={{ listStyle: 'none', padding: 0 }}>
          <AnimatePresence>
            {history.map(item => {
              const loser = item.winner.id === item.a.id ? item.b : item.a
              return (
                <motion.li
                  key={item.at}
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: [0, -5, 5, -5, 5, 0] }}
                  exit={{ opacity: 0, x: 50 }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                  style={{
                    marginBottom: 10,
                    padding: 12,
                    borderRadius: 8,
                    background: 'rgba(0,0,0,0.7)',
                    boxShadow: '0 0 15px rgba(255,215,0,0.7)',
                    color: 'white',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: 15
                  }}
                >
                  <span>
                    <motion.span
                      initial={{ scale: 0.8, textShadow: '0 0 0px #FFD700' }}
                      animate={{
                        scale: [1.2, 1, 1.1, 1],
                        textShadow: [
                          '0 0 4px #FFD700',
                          '0 0 12px #FFA500',
                          '0 0 20px #FF4500',
                          '0 0 6px #FFD700'
                        ]
                      }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      style={{ fontWeight: 'bold', color: '#FFD700' }}
                    >
                      {item.winner.name}
                    </motion.span>{' '}
                    beat{' '}
                    <motion.span
                      initial={{ opacity: 0.5, textShadow: '0 0 0px #FF4C4C' }}
                      animate={{
                        opacity: [0.5, 0.7, 0.6],
                        textShadow: [
                          '0 0 4px #FF4C4C',
                          '0 0 8px #FF0000',
                          '0 0 4px #FF4C4C'
                        ]
                      }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      style={{ fontWeight: 'bold', color: '#FF4C4C' }}
                    >
                      {loser.name}
                    </motion.span>
                  </span>
                  <span style={{ fontSize: 12, opacity: 0.8 }}>
                    {new Date(item.at).toLocaleTimeString()}
                  </span>
                </motion.li>
              )
            })}
          </AnimatePresence>
        </ol>
      )}
    </div>
  )
}
