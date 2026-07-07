import { useState, useEffect, useRef } from 'react'

/**
 * Animated counter: counts from 0 to `end` over `duration` ms.
 * Uses requestAnimationFrame for smooth 60fps animation.
 */
export default function CountUp({ end, duration = 1200, decimals = 0, prefix = '', suffix = '' }) {
  const [value, setValue] = useState(0)
  const startTime = useRef(null)
  const raf = useRef(null)

  useEffect(() => {
    if (end === undefined || end === null) return

    startTime.current = null
    const startVal = 0

    const step = (timestamp) => {
      if (!startTime.current) startTime.current = timestamp
      const progress = Math.min((timestamp - startTime.current) / duration, 1)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(startVal + (end - startVal) * eased)

      if (progress < 1) {
        raf.current = requestAnimationFrame(step)
      } else {
        setValue(end)
      }
    }

    raf.current = requestAnimationFrame(step)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [end, duration])

  const formatted = value.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })

  return <>{prefix}{formatted}{suffix}</>
}
