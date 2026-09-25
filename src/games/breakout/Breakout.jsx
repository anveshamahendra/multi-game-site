import { useCallback, useEffect, useRef, useState } from 'react'
import GameFrame from '../../components/GameFrame.jsx'
import { useGameLoop } from '../../utils/useGameLoop.js'
import { getHighScore, setHighScoreIfBetter } from '../../utils/storage.js'
import { playSfx } from '../../utils/sound.js'
import './breakout.css'

// ============================================================
// BREAKOUT — reference game implementation.
//
// This file is intentionally the most heavily-commented game in
// the repo: it's the template the other 4 team members copy the
// *pattern* from (GameFrame usage, status state machine, canvas
// draw loop, localStorage high score), even though each game's
// actual mechanics are different.
//
// GAME_ID must be unique per game — it's the localStorage key
// and the route path.
// ============================================================
const GAME_ID = 'breakout'

const WIDTH = 440
const HEIGHT = 520
const PADDLE_W = 84
const PADDLE_H = 10
const PADDLE_Y = HEIGHT - 32
const BALL_R = 6
const ROWS = 5
const COLS = 7
const BRICK_PAD = 6
const BRICK_TOP = 44
const BRICK_H = 18
const BRICK_W = (WIDTH - BRICK_PAD * (COLS + 1)) / COLS
const BASE_BALL_SPEED = 230 // px/sec
const MAX_BALL_SPEED = 480
const PADDLE_SPEED = 420 // px/sec, keyboard control

const ROW_COLORS = ['#ff5d73', '#ff9f6b', '#ffb627', '#21c4b6', '#9b6bff']
const ROW_POINTS = [50, 40, 30, 20, 10] // top rows worth more

function makeBricks() {
  const bricks = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      bricks.push({
        x: BRICK_PAD + c * (BRICK_W + BRICK_PAD),
        y: BRICK_TOP + r * (BRICK_H + BRICK_PAD),
        w: BRICK_W,
        h: BRICK_H,
        alive: true,
        row: r,
      })
    }
  }
  return bricks
}

function freshBallAndPaddle(speedMultiplier) {
  const angle = (Math.random() * 0.5 + 0.25) * Math.PI // between 45 and 135 degrees
  const speed = BASE_BALL_SPEED * speedMultiplier
  return {
    paddle: { x: WIDTH / 2 - PADDLE_W / 2 },
    ball: {
      x: WIDTH / 2,
      y: PADDLE_Y - BALL_R - 2,
      vx: Math.cos(angle) * speed,
      vy: -Math.abs(Math.sin(angle) * speed),
    },
  }
}

export default function Breakout() {
  const canvasRef = useRef(null)
  const [status, setStatus] = useState('start') // start | playing | paused | gameover
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [best, setBest] = useState(() => getHighScore(GAME_ID))
  const [pulse, setPulse] = useState(false)

  // Mutable game state that changes every single frame lives in a
  // ref, NOT React state — putting per-frame physics into useState
  // would re-render React 60x/sec and get janky fast. React state
  // above is only for things the UI needs to show (score, lives,
  // status).
  const stateRef = useRef(null)
  const keysRef = useRef({ left: false, right: false })
  const speedMultRef = useRef(1)

  const resetRun = useCallback(() => {
    speedMultRef.current = 1
    const { paddle, ball } = freshBallAndPaddle(1)
    stateRef.current = { paddle, ball, bricks: makeBricks() }
    setScore(0)
    setLives(3)
  }, [])

  const startGame = () => {
    resetRun()
    setStatus('playing')
    playSfx('start')
  }

  const restartGame = () => {
    resetRun()
    setStatus('playing')
    playSfx('start')
  }

  const pauseGame = () => setStatus('paused')
  const resumeGame = () => setStatus('playing')

  // Keyboard input
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keysRef.current.left = true
      if (e.key === 'ArrowRight' || e.key === 'd') keysRef.current.right = true
      if (e.key === 'Escape') {
        setStatus((s) => (s === 'playing' ? 'paused' : s === 'paused' ? 'playing' : s))
      }
    }
    const onKeyUp = (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a') keysRef.current.left = false
      if (e.key === 'ArrowRight' || e.key === 'd') keysRef.current.right = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // Mouse / touch: move paddle directly under the pointer
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onMove = (clientX) => {
      const rect = canvas.getBoundingClientRect()
      const scale = WIDTH / rect.width
      const x = (clientX - rect.left) * scale
      if (stateRef.current) {
        stateRef.current.paddle.x = Math.min(WIDTH - PADDLE_W, Math.max(0, x - PADDLE_W / 2))
      }
    }
    const onMouseMove = (e) => onMove(e.clientX)
    const onTouchMove = (e) => { onMove(e.touches[0].clientX); e.preventDefault() }
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  const endGame = useCallback(() => {
    setStatus('gameover')
    playSfx('gameOver')
    setScore((s) => {
      if (setHighScoreIfBetter(GAME_ID, s)) setBest(s)
      return s
    })
  }, [])

  // Core physics + collision step, called every frame while playing.
  const update = useCallback((dt) => {
    const s = stateRef.current
    if (!s) return
    const { paddle, ball, bricks } = s

    // --- paddle movement (keyboard) ---
    if (keysRef.current.left) paddle.x -= PADDLE_SPEED * dt
    if (keysRef.current.right) paddle.x += PADDLE_SPEED * dt
    paddle.x = Math.max(0, Math.min(WIDTH - PADDLE_W, paddle.x))

    // --- ball movement ---
    ball.x += ball.vx * dt
    ball.y += ball.vy * dt

    // walls
    if (ball.x - BALL_R < 0) { ball.x = BALL_R; ball.vx *= -1; playSfx('wallBounce') }
    if (ball.x + BALL_R > WIDTH) { ball.x = WIDTH - BALL_R; ball.vx *= -1; playSfx('wallBounce') }
    if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.vy *= -1; playSfx('wallBounce') }

    // paddle collision (only when moving downward)
    if (
      ball.vy > 0 &&
      ball.y + BALL_R >= PADDLE_Y &&
      ball.y + BALL_R <= PADDLE_Y + PADDLE_H + 10 &&
      ball.x >= paddle.x - BALL_R &&
      ball.x <= paddle.x + PADDLE_W + BALL_R
    ) {
      const hitPos = (ball.x - (paddle.x + PADDLE_W / 2)) / (PADDLE_W / 2) // -1..1
      const speed = Math.min(MAX_BALL_SPEED, Math.hypot(ball.vx, ball.vy))
      const angle = hitPos * (Math.PI / 3) // max 60deg off vertical
      ball.vx = Math.sin(angle) * speed
      ball.vy = -Math.abs(Math.cos(angle) * speed)
      ball.y = PADDLE_Y - BALL_R
      playSfx('hit')
    }

    // brick collisions — simple AABB + smallest-overlap axis resolve
    let bricksBrokenThisFrame = 0
    for (const brick of bricks) {
      if (!brick.alive) continue
      const overlapLeft = ball.x + BALL_R - brick.x
      const overlapRight = brick.x + brick.w - (ball.x - BALL_R)
      const overlapTop = ball.y + BALL_R - brick.y
      const overlapBottom = brick.y + brick.h - (ball.y - BALL_R)
      const hit = overlapLeft > 0 && overlapRight > 0 && overlapTop > 0 && overlapBottom > 0
      if (!hit) continue

      const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom)
      if (minOverlap === overlapLeft || minOverlap === overlapRight) ball.vx *= -1
      else ball.vy *= -1

      brick.alive = false
      bricksBrokenThisFrame++
      setScore((sc) => sc + ROW_POINTS[brick.row])
      setPulse(true)
      setTimeout(() => setPulse(false), 220)
      playSfx('score')
      break // one brick per frame is plenty at this speed/resolution
    }

    if (bricksBrokenThisFrame > 0) {
      const remaining = bricks.filter((b) => b.alive).length
      // difficulty progression: speed up as the board clears
      const cleared = ROWS * COLS - remaining
      if (cleared > 0 && cleared % 14 === 0) {
        speedMultRef.current = Math.min(2.1, speedMultRef.current + 0.12)
        const speed = Math.min(MAX_BALL_SPEED, Math.hypot(ball.vx, ball.vy) * 1.12)
        const mag = Math.hypot(ball.vx, ball.vy) || 1
        ball.vx = (ball.vx / mag) * speed
        ball.vy = (ball.vy / mag) * speed
      }
      if (remaining === 0) {
        // level cleared — new board, keep score/lives, ball a bit faster
        s.bricks = makeBricks()
        speedMultRef.current = Math.min(2.1, speedMultRef.current + 0.15)
        const { ball: newBall } = freshBallAndPaddle(speedMultRef.current)
        s.ball = newBall
      }
    }

    // fell below paddle
    if (ball.y - BALL_R > HEIGHT) {
      setLives((l) => {
        const next = l - 1
        if (next <= 0) {
          endGame()
        } else {
          const { ball: newBall } = freshBallAndPaddle(speedMultRef.current)
          s.ball = newBall
          playSfx('hit')
        }
        return Math.max(0, next)
      })
    }

    draw()
  }, [endGame])

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const s = stateRef.current
    ctx.clearRect(0, 0, WIDTH, HEIGHT)

    ctx.fillStyle = '#2c2348'
    ctx.fillRect(0, 0, WIDTH, HEIGHT)

    if (!s) return
    // bricks
    for (const b of s.bricks) {
      if (!b.alive) continue
      ctx.fillStyle = ROW_COLORS[b.row]
      ctx.fillRect(b.x, b.y, b.w, b.h)
    }
    // paddle
    ctx.fillStyle = '#21c4b6'
    ctx.fillRect(s.paddle.x, PADDLE_Y, PADDLE_W, PADDLE_H)
    // ball
    ctx.beginPath()
    ctx.fillStyle = '#fdf9f3'
    ctx.arc(s.ball.x, s.ball.y, BALL_R, 0, Math.PI * 2)
    ctx.fill()
  }

  useGameLoop(update, status === 'playing')

  // draw the current frame once whenever we're not actively looping
  // (so pause/start/gameover screens don't show a frozen blank canvas)
  useEffect(() => { draw() }, [status])

  return (
    <GameFrame
      gameId={GAME_ID}
      title="Breakout"
      accent="pink"
      status={status}
      score={score}
      best={best}
      onStart={startGame}
      onRestart={restartGame}
      onResume={resumeGame}
      onPause={pauseGame}
      pulse={pulse}
      instructions={
        <p>Move the paddle with ← → (or drag/touch). Clear every brick without letting the ball fall. Esc to pause.</p>
      }
    >
      <div>
        <div className="breakout-lives">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className={`breakout-life ${i >= lives ? 'breakout-life--lost' : ''}`} />
          ))}
        </div>
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="breakout-canvas" />
      </div>
    </GameFrame>
  )
}
