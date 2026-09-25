import { useCallback, useEffect, useRef, useState } from 'react'
import GameFrame from '../../components/GameFrame.jsx'
import { useGameLoop } from '../../utils/useGameLoop.js'
import { getHighScore, setHighScoreIfBetter } from '../../utils/storage.js'
import { playSfx } from '../../utils/sound.js'
import './tetris.css'

// ============================================================
// TETRIS-LITE
// Simplified on purpose: 4x4-bounding-box pieces, matrix rotation
// with NO wall-kick system (a rotation that would collide is just
// rejected). That's "basic rotation" as scoped in the brief — a
// full Super Rotation System is out of scope for a mid-sem project.
// ============================================================
const GAME_ID = 'tetris'
const COLS = 10
const ROWS = 18
const CELL = 22
const WIDTH = COLS * CELL
const HEIGHT = ROWS * CELL

const SHAPES = {
  I: { color: '#21c4b6', grid: ['....', 'XXXX', '....', '....'] },
  O: { color: '#ffb627', grid: ['.XX.', '.XX.', '....', '....'] },
  T: { color: '#9b6bff', grid: ['.X..', 'XXX.', '....', '....'] },
  S: { color: '#4cd97b', grid: ['.XX.', 'XX..', '....', '....'] },
  Z: { color: '#ff5d73', grid: ['XX..', '.XX.', '....', '....'] },
  J: { color: '#3fa9f5', grid: ['X...', 'XXX.', '....', '....'] },
  L: { color: '#ff9f6b', grid: ['..X.', 'XXX.', '....', '....'] },
}
const TYPES = Object.keys(SHAPES)

function strToMatrix(grid) {
  return grid.map((row) => row.split('').map((c) => c === 'X'))
}

function rotateCW(matrix) {
  const n = matrix.length
  const out = Array.from({ length: n }, () => Array(n).fill(false))
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      out[x][n - 1 - y] = matrix[y][x]
    }
  }
  return out
}

function randomPiece() {
  const type = TYPES[Math.floor(Math.random() * TYPES.length)]
  return { type, matrix: strToMatrix(SHAPES[type].grid), x: 3, y: -1, color: SHAPES[type].color }
}

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null))
}

function collides(board, matrix, px, py) {
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      if (!matrix[y][x]) continue
      const bx = px + x
      const by = py + y
      if (bx < 0 || bx >= COLS || by >= ROWS) return true
      if (by >= 0 && board[by][bx]) return true
    }
  }
  return false
}

const LINE_SCORES = [0, 100, 300, 500, 800]

export default function Tetris() {
  const canvasRef = useRef(null)
  const nextCanvasRef = useRef(null)
  const [status, setStatus] = useState('start')
  const [score, setScore] = useState(0)
  const [level, setLevel] = useState(1)
  const [best, setBest] = useState(() => getHighScore(GAME_ID))
  const [pulse, setPulse] = useState(false)

  const stateRef = useRef(null)
  const accRef = useRef(0)
  const intervalRef = useRef(0.8)
  const softDropRef = useRef(false)

  const resetRun = useCallback(() => {
    stateRef.current = { board: emptyBoard(), piece: randomPiece(), next: randomPiece(), linesCleared: 0 }
    intervalRef.current = 0.8
    accRef.current = 0
    setScore(0)
    setLevel(1)
  }, [])

  const startGame = () => { resetRun(); setStatus('playing'); playSfx('start') }
  const restartGame = () => { resetRun(); setStatus('playing'); playSfx('start') }
  const pauseGame = () => setStatus('paused')
  const resumeGame = () => setStatus('playing')

  const endGame = useCallback(() => {
    setStatus('gameover')
    playSfx('gameOver')
    setScore((sc) => { if (setHighScoreIfBetter(GAME_ID, sc)) setBest(sc); return sc })
  }, [])

  const lockPiece = useCallback(() => {
    const s = stateRef.current
    const { piece, board } = s
    piece.matrix.forEach((row, y) => row.forEach((cell, x) => {
      if (cell && piece.y + y >= 0) board[piece.y + y][piece.x + x] = piece.color
    }))

    // clear full lines
    let cleared = 0
    for (let y = ROWS - 1; y >= 0; y--) {
      if (board[y].every((c) => c)) {
        board.splice(y, 1)
        board.unshift(Array(COLS).fill(null))
        cleared++
        y++ // re-check same index after shift
      }
    }

    if (cleared > 0) {
      playSfx('clear')
      setPulse(true); setTimeout(() => setPulse(false), 220)
      setScore((sc) => sc + LINE_SCORES[cleared] * level)
      s.linesCleared += cleared
      const newLevel = 1 + Math.floor(s.linesCleared / 10)
      if (newLevel !== level) {
        setLevel(newLevel)
        intervalRef.current = Math.max(0.14, 0.8 - (newLevel - 1) * 0.07)
      }
    } else {
      playSfx('hit')
    }

    s.piece = s.next
    s.next = randomPiece()
    if (collides(board, s.piece.matrix, s.piece.x, s.piece.y)) {
      endGame()
    }
  }, [endGame, level])

  const tryMove = useCallback((dx, dy) => {
    const s = stateRef.current
    if (!s || status !== 'playing') return false
    const { piece, board } = s
    if (!collides(board, piece.matrix, piece.x + dx, piece.y + dy)) {
      piece.x += dx
      piece.y += dy
      return true
    }
    if (dy > 0) lockPiece() // couldn't move down -> settle
    return false
  }, [status, lockPiece])

  const tryRotate = useCallback(() => {
    const s = stateRef.current
    if (!s || status !== 'playing') return
    const { piece, board } = s
    const rotated = rotateCW(piece.matrix)
    if (!collides(board, rotated, piece.x, piece.y)) {
      piece.matrix = rotated
      playSfx('move')
    }
  }, [status])

  const hardDrop = useCallback(() => {
    const s = stateRef.current
    if (!s || status !== 'playing') return
    const { piece, board } = s
    while (!collides(board, piece.matrix, piece.x, piece.y + 1)) piece.y += 1
    lockPiece()
  }, [status, lockPiece])

  useEffect(() => {
    const onKeyDown = (e) => {
      if (status !== 'playing') {
        if (e.key === 'Escape') setStatus((s) => (s === 'paused' ? 'playing' : s))
        return
      }
      if (e.key === 'ArrowLeft' || e.key === 'a') { tryMove(-1, 0); playSfx('move') }
      if (e.key === 'ArrowRight' || e.key === 'd') { tryMove(1, 0); playSfx('move') }
      if (e.key === 'ArrowUp' || e.key === 'w') tryRotate()
      if (e.key === 'ArrowDown' || e.key === 's') softDropRef.current = true
      if (e.key === ' ') { e.preventDefault(); hardDrop() }
      if (e.key === 'Escape') setStatus('paused')
    }
    const onKeyUp = (e) => { if (e.key === 'ArrowDown' || e.key === 's') softDropRef.current = false }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp) }
  }, [status, tryMove, tryRotate, hardDrop])

  const draw = () => {
    const canvas = canvasRef.current
    const s = stateRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#2c2348'
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    if (!s) return

    ctx.strokeStyle = 'rgba(253,249,243,0.06)'
    for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * CELL, 0); ctx.lineTo(x * CELL, HEIGHT); ctx.stroke() }
    for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * CELL); ctx.lineTo(WIDTH, y * CELL); ctx.stroke() }

    s.board.forEach((row, y) => row.forEach((color, x) => {
      if (color) { ctx.fillStyle = color; ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2) }
    }))

    const { piece } = s
    ctx.fillStyle = piece.color
    piece.matrix.forEach((row, y) => row.forEach((cell, x) => {
      if (cell && piece.y + y >= 0) ctx.fillRect((piece.x + x) * CELL + 1, (piece.y + y) * CELL + 1, CELL - 2, CELL - 2)
    }))

    // next piece preview
    const nc = nextCanvasRef.current
    if (nc) {
      const nctx = nc.getContext('2d')
      nctx.fillStyle = '#2c2348'
      nctx.fillRect(0, 0, nc.width, nc.height)
      nctx.fillStyle = s.next.color
      s.next.matrix.forEach((row, y) => row.forEach((cell, x) => {
        if (cell) nctx.fillRect(x * 16 + 4, y * 16 + 4, 14, 14)
      }))
    }
  }

  const update = useCallback((dt) => {
    if (!stateRef.current) return
    accRef.current += dt
    const interval = softDropRef.current ? Math.min(intervalRef.current, 0.06) : intervalRef.current
    if (accRef.current >= interval) {
      accRef.current = 0
      tryMove(0, 1)
    }
    draw()
  }, [tryMove])

  useGameLoop(update, status === 'playing')
  useEffect(() => { draw() }, [status])

  return (
    <GameFrame
      gameId={GAME_ID}
      title="Tetris-lite"
      accent="violet"
      status={status}
      score={score}
      best={best}
      pulse={pulse}
      onStart={startGame}
      onRestart={restartGame}
      onResume={resumeGame}
      onPause={pauseGame}
      instructions={<p>← → move, ↑ rotate, ↓ soft drop, Space hard drop. Clear full rows. Esc to pause.</p>}
    >
      <div className="tetris-layout">
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="tetris-canvas" />
        <div className="tetris-side">
          <div>
            <h4>LEVEL</h4>
            <span className="tetris-level">{level}</span>
          </div>
          <div className="tetris-next">
            <h4>NEXT</h4>
            <canvas ref={nextCanvasRef} width={72} height={72} />
          </div>
        </div>
      </div>
    </GameFrame>
  )
}
