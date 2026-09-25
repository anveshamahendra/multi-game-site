import { Link } from 'react-router-dom'
import GamePreview from './GamePreview.jsx'
import './GameCard.css'

// One card per game on the hub. `featured` makes the card span a
// larger area of the asymmetric grid (see Hub.css) so the layout
// doesn't read as "5 identical boxes" — the featured slot rotates
// conceptually to whichever game the team wants to spotlight for
// the evaluation (set via the `featured` prop from Hub.jsx).
export default function GameCard({ id, title, tagline, accent, best, featured }) {
  return (
    <Link to={`/${id}`} className={`game-card game-card--${accent} ${featured ? 'game-card--featured' : ''}`}>
      <div className="game-card__preview">
        <GamePreview id={id} />
      </div>
      <div className="game-card__meta">
        <h3 className="game-card__title">{title}</h3>
        <p className="game-card__tagline">{tagline}</p>
        {best > 0 && <span className="game-card__best">Best {best}</span>}
      </div>
    </Link>
  )
}
