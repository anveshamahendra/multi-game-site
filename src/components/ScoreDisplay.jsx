import './ScoreDisplay.css'

// Reused, identically, by every game's in-game header:
// current score on the left, best score on the right.
// `pulse` briefly highlights the score on change (see Breakout
// for the pattern: bump a key/state when score increases).
export default function ScoreDisplay({ label = 'SCORE', score, best, pulse = false }) {
  return (
    <div className="score-display">
      <div className="score-block">
        <span className="score-label">{label}</span>
        <span className={`score-value ${pulse ? 'score-value--pulse' : ''}`}>{score}</span>
      </div>
      <div className="score-block score-block--best">
        <span className="score-label">BEST</span>
        <span className="score-value score-value--best">{best}</span>
      </div>
    </div>
  )
}
