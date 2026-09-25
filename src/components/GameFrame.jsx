import { Link } from 'react-router-dom'
import Modal from './Modal.jsx'
import Button from './Button.jsx'
import ScoreDisplay from './ScoreDisplay.jsx'
import { isMuted, setMuted } from '../utils/sound.js'
import { useState } from 'react'
import './GameFrame.css'

// ============================================================
// GameFrame — the shared "chrome" around every game.
//
// Every game (Breakout, Snake, Pong, Tetris, Blaster) renders:
//   <GameFrame ...>  <their own canvas/board as children>  </GameFrame>
//
// This is what makes 5 different games, built by 5 different
// people, feel like ONE site: identical header, identical score
// display, identical start/pause/game-over modal treatment.
// A game only needs to manage its own `status` state machine
// ('start' | 'playing' | 'paused' | 'gameover') and pass in the
// right callbacks — GameFrame draws the right screen for you.
// ============================================================
export default function GameFrame({
  gameId,
  title,
  accent = 'pink',
  status,
  score = 0,
  best = 0,
  onStart,
  onRestart,
  onResume,
  onPause,
  pulse = false,
  instructions,
  children,
}) {
  const [muted, setMutedState] = useState(isMuted())

  const toggleMute = () => {
    setMuted(!muted)
    setMutedState(!muted)
  }

  return (
    <div className="game-frame">
      <header className="game-frame__header">
        <Link to="/" className="game-frame__back">← Hub</Link>
        <h1 className="game-frame__title">{title}</h1>
        <div className="game-frame__header-right">
          <ScoreDisplay score={score} best={best} pulse={pulse} />
          <button
            className="game-frame__mute"
            onClick={toggleMute}
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? '🔇' : '🔊'}
          </button>
          {status === 'playing' && (
            <button className="game-frame__pause" onClick={onPause} aria-label="Pause">⏸</button>
          )}
        </div>
      </header>

      <div className={`game-frame__stage game-frame__stage--${accent}`}>
        {children}

        {status === 'start' && (
          <Modal title={title} accent={accent}>
            {instructions}
            <Button onClick={onStart}>Start Game</Button>
          </Modal>
        )}

        {status === 'paused' && (
          <Modal title="Paused" accent={accent}>
            <p>Take a breath. Your run is safe.</p>
            <Button onClick={onResume}>Resume</Button>
          </Modal>
        )}

        {status === 'gameover' && (
          <Modal title="Game Over" accent={accent}>
            <ScoreDisplay label="FINAL" score={score} best={best} />
            <Button onClick={onRestart}>Play Again</Button>
          </Modal>
        )}
      </div>
    </div>
  )
}
