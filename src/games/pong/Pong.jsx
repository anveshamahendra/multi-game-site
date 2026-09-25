import { useCallback, useEffect, useRef, useState } from 'react'
import GameFrame from '../../components/GameFrame.jsx'
import { useGameLoop } from '../../utils/useGameLoop.js'
import { getHighScore, setHighScoreIfBetter } from '../../utils/storage.js'
import { playSfx } from '../../utils/sound.js'
import './pong.css'

// ============================================================
// PONG — player (left) vs a simple reactive AI (right).
// First to WIN_SCORE takes the match. "Best" here tracks the
// highest number of points you've ever scored in a single match
// (a meaningful "high score" for a game that's normally win/lose).
// ============================================================
const GAME_ID = 'pong'
const WIDTH = 440
const HEIGHT = 400
const PADDLE_W = 10
const PADDLE_H = 70
const BALL_R = 6
const PLAYER_X = 18
const AI_X = WIDTH - 18 - PADDLE_W
const BASE_SPEED = 220
const MAX_SPEED = 460
const AI_SPEED = 260
const WIN_SCORE = 7

function serve(direction) {
  const angle = (Math.random() * 0.6 - 0.3) * Math.PI // -54deg..54deg from horizontal
  return {
    x: WIDTH / 2,
    y: HEIGHT / 2,
    vx: Math.cos(angle) * BASE_SPEED * direction,
    vy: Math.sin(angle) * BASE_SPEED,
  }
}

export default function Pong() {
  const canvasRef = useRef(null)
  const [status, setStatus] = useState('start')
  const [playerScore, setPlayerScore] = useState(0)
  const [aiScore, setAiScore] = useState(0)
  const [best, setBest] = useState(() => getHighScore(GAME_ID))
  const [pulse, setPulse] = useState(false)

  const stateRef = useRef(null)
  const keysRef = useRef({ up: false, down: false })
  const pointerYRef = useRef(null)

  const resetRun = useCallback(() => {
    stateRef.current = {
      player: { y: HEIGHT / 2 - PADDLE_H / 2 },
      ai: { y: HEIGHT / 2 - PADDLE_H / 2 },
      ball: serve(Math.random() < 0.5 ? 1 : -1),
    }
    setPlayerScore(0)
    setAiScore(0)
  }, [])

  const startGame = () => { resetRun(); setStatus('playing'); playSfx('start') }
  const restartGame = () => { resetRun(); setStatus('playing'); playSfx('start') }
  const pauseGame = () => setStatus('paused')
  const resumeGame = () => setStatus('playing')

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w') keysRef.current.up = true
      if (e.key === 'ArrowDown' || e.key === 's') keysRef.current.down = true
      if (e.key === 'Escape') setStatus((s) => (s === 'playing' ? 'paused' : s === 'paused' ? 'playing' : s))
    }
    const onKeyUp = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w') keysRef.current.up = false
      if (e.key === 'ArrowDown' || e.key === 's') keysRef.current.down = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp) }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onMove = (clientY) => {
      const rect = canvas.getBoundingClientRect()
      const scale = HEIGHT / rect.height
      pointerYRef.current = (clientY - rect.top) * scale
    }
    const onMouseMove = (e) => onMove(e.clientY)
    const onTouchMove = (e) => { onMove(e.touches[0].clientY); e.preventDefault() }
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => { canvas.removeEventListener('mousemove', onMouseMove); canvas.removeEventListener('touchmove', onTouchMove) }
  }, [])

  const endMatch = useCallback((didPlayerWin) => {
    setStatus('gameover')
    playSfx(didPlayerWin ? 'clear' : 'gameOver')
  }, [])

  const update = useCallback((dt) => {
    const s = stateRef.current
    if (!s) return
    const { player, ai, ball } = s

    // player paddle: pointer (mouse/touch) takes priority if used this session, else keyboard
    if (pointerYRef.current != null) {
      player.y += ((pointerYRef.current - PADDLE_H / 2) - player.y) * Math.min(1, dt * 14)
    } else {
      if (keysRef.current.up) player.y -= 320 * dt
      if (keysRef.current.down) player.y += 320 * dt
    }
    player.y = Math.max(0, Math.min(HEIGHT - PADDLE_H, player.y))

    // AI paddle: chases the ball's y with capped speed + a deadzone so it's beatable
    const aiTarget = ball.y - PADDLE_H / 2
    const aiDelta = aiTarget - ai.y
    if (Math.abs(aiDelta) > 6) {
      ai.y += Math.sign(aiDelta) * Math.min(Math.abs(aiDelta), AI_SPEED * dt)
    }
    ai.y = Math.max(0, Math.min(HEIGHT - PADDLE_H, ai.y))

    // ball
    ball.x += ball.vx * dt
    ball.y += ball.vy * dt

    if (ball.y - BALL_R < 0) { ball.y = BALL_R; ball.vy *= -1; playSfx('wallBounce') }
    if (ball.y + BALL_R > HEIGHT) { ball.y = HEIGHT - BALL_R; ball.vy *= -1; playSfx('wallBounce') }

    // player paddle collision
    if (ball.vx < 0 && ball.x - BALL_R <= PLAYER_X + PADDLE_W && ball.x - BALL_R >= PLAYER_X - 8 &&
        ball.y >= player.y - BALL_R && ball.y <= player.y + PADDLE_H + BALL_R) {
      const hitPos = (ball.y - (player.y + PADDLE_H / 2)) / (PADDLE_H / 2)
      const speed = Math.min(MAX_SPEED, Math.hypot(ball.vx, ball.vy) * 1.06)
      ball.vx = Math.cos(hitPos * 0.4) * speed
      ball.vy = hitPos * speed
      ball.x = PLAYER_X + PADDLE_W + BALL_R
      playSfx('hit')
    }

    // AI paddle collision
    if (ball.vx > 0 && ball.x + BALL_R >= AI_X && ball.x + BALL_R <= AI_X + 8 &&
        ball.y >= ai.y - BALL_R && ball.y <= ai.y + PADDLE_H + BALL_R) {
      const hitPos = (ball.y - (ai.y + PADDLE_H / 2)) / (PADDLE_H / 2)
      const speed = Math.min(MAX_SPEED, Math.hypot(ball.vx, ball.vy) * 1.06)
      ball.vx = -Math.cos(hitPos * 0.4) * speed
      ball.vy = hitPos * speed
      ball.x = AI_X - BALL_R
      playSfx('hit')
    }

    // scoring
    if (ball.x < -20) {
      setAiScore((sc) => {
        const next = sc + 1
        if (next >= WIN_SCORE) endMatch(false)
        return next
      })
      s.ball = serve(1)
      playSfx('score')
    } else if (ball.x > WIDTH + 20) {
      setPlayerScore((sc) => {
        const next = sc + 1
        setPulse(true); setTimeout(() => setPulse(false), 220)
        if (setHighScoreIfBetter(GAME_ID, next)) setBest(next)
        if (next >= WIN_SCORE) endMatch(true)
        return next
      })
      s.ball = serve(-1)
      playSfx('score')
    }

    draw()
  }, [endMatch])

  const draw = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#2c2348'
    ctx.fillRect(0, 0, WIDTH, HEIGHT)
    const s = stateRef.current
    if (!s) return

    // center dashed line
    ctx.strokeStyle = '#262e4a'
    ctx.setLineDash([6, 10])
    ctx.beginPath()
    ctx.moveTo(WIDTH / 2, 0)
    ctx.lineTo(WIDTH / 2, HEIGHT)
    ctx.stroke()
    ctx.setLineDash([])

    ctx.fillStyle = '#21c4b6'
    ctx.fillRect(PLAYER_X, s.player.y, PADDLE_W, PADDLE_H)
    ctx.fillStyle = '#ff5d73'
    ctx.fillRect(AI_X, s.ai.y, PADDLE_W, PADDLE_H)

    ctx.beginPath()
    ctx.fillStyle = '#fdf9f3'
    ctx.arc(s.ball.x, s.ball.y, BALL_R, 0, Math.PI * 2)
    ctx.fill()

    ctx.font = '28px "Space Grotesk", sans-serif'
    ctx.fillStyle = '#8a7eae'
    ctx.textAlign = 'center'
    ctx.fillText(String(playerScore), WIDTH / 2 - 50, 40)
    ctx.fillText(String(aiScore), WIDTH / 2 + 50, 40)
  }

  useGameLoop(update, status === 'playing')
  useEffect(() => { draw() }, [status, playerScore, aiScore])

  return (
    <GameFrame
      gameId={GAME_ID}
      title="Pong"
      accent="amber"
      status={status}
      score={playerScore}
      best={best}
      pulse={pulse}
      onStart={startGame}
      onRestart={restartGame}
      onResume={resumeGame}
      onPause={pauseGame}
      instructions={<p>Move your paddle (left, cyan) with the mouse, touch, or ↑ ↓ / W S. First to {WIN_SCORE} wins. Esc to pause.</p>}
    >
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} className="pong-canvas" />
    </GameFrame>
  )
}
