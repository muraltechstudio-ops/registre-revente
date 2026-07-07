import { useRef, useState, useEffect } from 'react'

/**
 * Magnetic hover effect: the button follows the cursor slightly when hovered.
 * Pure CSS + JS, no framer-motion dependency for this micro-interaction.
 */
export default function MagneticButton({ children, className = '', as: Tag = 'button', ...props }) {
  const ref = useRef(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [hover, setHover] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const handleMouseMove = (e) => {
      const rect = el.getBoundingClientRect()
      const x = e.clientX - rect.left - rect.width / 2
      const y = e.clientY - rect.top - rect.height / 2
      setPos({ x: x * 0.15, y: y * 0.15 })
    }

    const handleMouseEnter = () => setHover(true)
    const handleMouseLeave = () => { setHover(false); setPos({ x: 0, y: 0 }) }

    el.addEventListener('mousemove', handleMouseMove)
    el.addEventListener('mouseenter', handleMouseEnter)
    el.addEventListener('mouseleave', handleMouseLeave)
    return () => {
      el.removeEventListener('mousemove', handleMouseMove)
      el.removeEventListener('mouseenter', handleMouseEnter)
      el.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <Tag
      ref={ref}
      className={`inline-flex items-center transition-transform duration-150 ease-out ${className}`}
      style={{
        transform: hover ? `translate(${pos.x}px, ${pos.y}px)` : 'translate(0px, 0px)',
      }}
      {...props}
    >
      {children}
    </Tag>
  )
}
