import './Button.css'

// One button component, reused by every game's start/pause/game-over
// screens and the hub. `variant` controls color language only —
// shape, size, and hover/press motion stay identical everywhere,
// so switching games never feels like switching products.
export default function Button({ children, variant = 'primary', ...props }) {
  return (
    <button className={`btn btn--${variant}`} {...props}>
      {children}
    </button>
  )
}
