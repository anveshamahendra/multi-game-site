import { useEffect, useRef } from 'react'

// ============================================================
// useGameLoop — shared requestAnimationFrame hook.
//
// Every game calls this the same way:
//   useGameLoop(update, isRunning)
// where `update(deltaSeconds)` mutates game state / redraws.
//
// Why share this instead of each game writing its own rAF loop?
//   - One place that gets delta-time (frame-rate independent
//     movement) right, instead of 5 slightly-different, possibly
//     janky versions.
//   - Automatically pauses/resumes with `isRunning` and always
//     cleans up on unmount — no leaked loops when you leave a
//     game and go back to the hub.
// ============================================================
export function useGameLoop(update, isRunning) {
  const frameRef = useRef()
  const lastTimeRef = useRef(null)
  const updateRef = useRef(update)
  updateRef.current = update // always call the latest version

  useEffect(() => {
    if (!isRunning) {
      lastTimeRef.current = null
      return
    }

    const tick = (time) => {
      if (lastTimeRef.current != null) {
        let delta = (time - lastTimeRef.current) / 1000
        // Clamp huge deltas (e.g. tab was backgrounded) so physics
        // doesn't "teleport" the ball/snake/paddle on return.
        if (delta > 0.05) delta = 0.05
        updateRef.current(delta)
      }
      lastTimeRef.current = time
      frameRef.current = requestAnimationFrame(tick)
    }

    frameRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameRef.current)
  }, [isRunning])
}
