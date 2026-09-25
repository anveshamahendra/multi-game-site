import { useEffect, useState } from 'react'
import GameCard from '../components/GameCard.jsx'
import { getAllHighScores } from '../utils/storage.js'
import './Hub.css'

const GAMES = [
  { id: 'breakout', title: 'Breakout', tagline: 'Break every brick before you run out of balls.', accent: 'pink', featured: true },
  { id: 'snake',    title: 'Snake',    tagline: 'Grow long. Don\u2019t bite yourself.', accent: 'cyan' },
  { id: 'pong',     title: 'Pong',     tagline: 'First to 7 against the house AI.', accent: 'amber' },
  { id: 'tetris',   title: 'Tetris-lite', tagline: 'Stack, rotate, clear the line.', accent: 'violet' },
  { id: 'blaster',  title: 'Blaster',  tagline: 'Hold the line against the descending fleet.', accent: 'sky' },
]

export default function Hub() {
  const [scores, setScores] = useState({})

  useEffect(() => {
    setScores(getAllHighScores(GAMES.map((g) => g.id)))
  }, [])

  const featured = GAMES.find((g) => g.featured)
  const rest = GAMES.filter((g) => !g.featured)

  return (
    <div className="hub">
      <header className="hub__hero">
        <h1 className="hub__title">PRISM ROW</h1>
        <p className="hub__subtitle">Five games. One cabinet row. Pick a machine.</p>
      </header>

      <div className="hub__grid">
        <div className="hub__slot hub__slot--featured">
          <GameCard {...featured} best={scores[featured.id] || 0} featured />
        </div>
        {rest.map((g) => (
          <div className="hub__slot" key={g.id}>
            <GameCard {...g} best={scores[g.id] || 0} />
          </div>
        ))}
      </div>

      <footer className="hub__footer">
        <p>Built by a team of 5 &middot; high scores saved locally on this device</p>
      </footer>
    </div>
  )
}
