import { useCallback, useEffect, useRef, useState } from 'react'
import GameFrame from '../../components/GameFrame.jsx'
import { useGameLoop } from '../../utils/useGameLoop.js'
import { getHighScore, setHighScoreIfBetter } from '../../utils/storage.js'
import { playSfx } from '../../utils/sound.js'
import './snake.css'

// ============================================================
// SNAKE
// Grid-based movement, NOT continuous physics: the snake advances
// one cell every `stepInterval` seconds. We accumulate delta-time
// each frame and only step the game state once enough time has
// passed — this keeps movement on a clean, predictable grid rhythm
// no matter the screen's refresh rate.
// ============================================================
const GAME_ID = 'snake'
const GRID = 22
const CELL = 20
const SIZE = GRID * CELL
const START_INTERVAL = 0.14 // seconds per step
const MIN_INTERVAL = 0.06

function randomCell(exclude) {
  let cell
  do {
    cell = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) }
  } while (exclude.some((c) => c.x === cell.x && c.y === cell.y))
  return cell
}

export default function Snake() {
  const canvasRef = useRef(null)
  const [status, setStatus] = useState('start')
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => getHighScore(GAME_ID))
  const [pulse, setPulse] = useState(false)

  const stateRef = useRef(null)
  const dirRef = useRef({ x: 1, y: 0 })
  const nextDirRef = useRef({ x: 1, y: 0 })
  const accRef = useRef(0)
  const intervalRef = useRef(START_INTERVAL)

  const resetRun = useCallback(() => {
    const snake = [{ x: 5, y: 11 }, { x: 4, y: 11 }, { x: 3, y: 11 }]
    dirRef.current = { x: 1, y: 0 }
    nextDirRef.current = { x: 1, y: 0 }
    intervalRef.current = START_INTERVAL
    accRef.current = 0
    stateRef.current = { snake, food: randomCell(snake) }
    setScore(0)
  }, [])

  const startGame = () => { resetRun(); setStatus('playing'); playSfx('start') }
  const restartGame = () => { resetRun(); setStatus('playing'); playSfx('start') }
  const pauseGame = () => setStatus('paused')
  const resumeGame = () => setStatus('playing')

  useEffect(() => {
    const onKeyDown = (e) => {
      const d = dirRef.current
      const map = {
        ArrowUp: { x: 0, y: -1 }, w: { x: 0, y: -1 },
        ArrowDown: { x: 0, y: 1 }, s: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 }, a: { x: -1, y: 0 },
        ArrowRight: { x: 1, y: 0 }, d: { x: 1, y: 0 },
      }
      const next = map[e.key]
      // block reversing directly into yourself
      if (next && !(next.x === -d.x && next.y === -d.y)) nextDirRef.current = next
      if (e.key === 'Escape') {
        setStatus((s) => (s === 'playing' ? 'paused' : s === 'paused' ? 'playing' : s))
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const endGame = useCallback(() => {
    setStatus('gameover')
    playSfx('gameOver')
    setScore((sc) => { if (setHighScoreIfBetter(GAME_ID, sc)) setBest(sc); return sc })
  }, [])

  const step = useCallback(() => {
    const s = stateRef.current
    dirRef.current = nextDirRef.current
    const head = s.snake[0]
    const newHead = { x: head.x + dirRef.current.x, y: head.y + dirRef.current.y }

    const hitWall = newHead.x < 0 || newHead.x >= GRID || newHead.y < 0 || newHead.y >= GRID
    const hitSelf = s.snake.some((seg) => seg.x === newHead.x && seg.y === newHead.y)
    if (hitWall || hitSelf) { endGame(); return }

    s.snake.unshift(newHead)

    if (newHead.x === s.food.x && newHead.y === s.food.y) {
      s.food = randomCell(s.snake)
      setScore((sc) => sc + 10)
      setPulse(true); setTimeout(() => setPulse(false), 220)
      playSfx('score')
      intervalRef.current = Math.max(MIN_INTERVAL, intervalRef.current * 0.96)
    } else {
      s.snake.pop()
    }
  }, [endGame])

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#20304a'
    ctx.fillRect(0, 0, SIZE, SIZE)
    const s = stateRef.current
    if (!s) return

    ctx.fillStyle = '#ff5d73'
    ctx.fillRect(s.food.x * CELL + 2, s.food.y * CELL + 2, CELL - 4, CELL - 4)

    s.snake.forEach((seg, i) => {
      ctx.fillStyle = i === 0 ? '#ffb627' : '#21c4b6'
      ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2)
    })
  }

  const update = useCallback((dt) => {
    if (!stateRef.current) return
    accRef.current += dt
    if (accRef.current >= intervalRef.current) {
      accRef.current = 0
      step()
    }
    draw()
  }, [step])

  useGameLoop(update, status === 'playing')
  useEffect(() => { draw() }, [status])

  return (
    <GameFrame
      gameId={GAME_ID}
      title="Snake"
      accent="cyan"
      status={status}
      score={score}
      best={best}
      pulse={pulse}
      onStart={startGame}
      onRestart={restartGame}
      onResume={resumeGame}
      onPause={pauseGame}
      instructions={<p>Arrow keys or WASD to steer. Eat the amber block to grow. Don't hit the wall or yourself. Esc to pause.</p>}
    >
      <canvas ref={canvasRef} width={SIZE} height={SIZE} className="snake-canvas" />
    </GameFrame>
  )
}
