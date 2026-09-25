import './Modal.css'

// Shared modal shell for every "Start / Paused / Game Over" screen
// in every game. A game only supplies the title + body content —
// the panel, backdrop blur, and entrance motion are identical
// everywhere, which is what makes the 5 games feel like one product.
export default function Modal({ title, accent = 'pink', children }) {
  return (
    <div className="modal-backdrop">
      <div className={`modal-panel modal-panel--${accent}`}>
        <h2 className="modal-title">{title}</h2>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
