import { useEffect, useRef, useState } from 'react'
import styles from './Heatmap.module.scss'

type ColorGroup = [number, number, number]

const heatmapColors: ColorGroup[] = [
  [123, 2, 77],
  [30, 144, 255],
  [34, 139, 34],
  [255, 215, 0],
  [220, 20, 60],
  [147, 112, 219],
  [37, 22, 122],
]

function getLerpedColor(a: ColorGroup, b: ColorGroup, t: number): ColorGroup {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ]
}

function getColor(speed: number): ColorGroup {
  const stepSize = 120
  if (speed <= 0) return heatmapColors[0]
  if (speed > 5 * stepSize) return heatmapColors[6]

  speed += stepSize / 2.0
  const stepIndex = Math.floor(speed / stepSize)
  const nextIndex = Math.min(stepIndex + 1, heatmapColors.length - 1)
  const t = Math.min(1, Math.max(0, (speed - stepIndex * stepSize) / stepSize))

  return getLerpedColor(heatmapColors[stepIndex], heatmapColors[nextIndex], t)
}

export interface HapticPoint {
  time: number // video time in ms
  position: number // 0-100
}

interface LiveHeatmapProps {
  points: HapticPoint[]
  videoDuration: number // in ms
}

export const LiveHeatmap = ({ points, videoDuration }: LiveHeatmapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })

  // Handle resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const parent = canvas.parentElement
    if (!parent) return

    const updateSize = () => {
      setSize({
        width: parent.clientWidth,
        height: parent.clientHeight,
      })
    }

    updateSize()

    const observer = new ResizeObserver(updateSize)
    observer.observe(parent)
    return () => observer.disconnect()
  }, [])

  // Draw heatmap
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || points.length < 2 || videoDuration <= 0 || size.width === 0)
      return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = size.width
    canvas.height = size.height || 64

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw line segments
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i]
      const next = points[i + 1]

      const x1 = (curr.time / videoDuration) * canvas.width
      const y1 = ((100 - curr.position) / 100) * (canvas.height - 4) + 2
      const x2 = (next.time / videoDuration) * canvas.width
      const y2 = ((100 - next.position) / 100) * (canvas.height - 4) + 2

      // Calculate speed (units per second)
      const dt = (next.time - curr.time) / 1000
      const speed = dt > 0 ? Math.abs(next.position - curr.position) / dt : 0

      const [r, g, b] = getColor(speed)

      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`
      ctx.lineWidth = 2
      ctx.stroke()
    }
  }, [points, videoDuration, size])

  return (
    <div className={styles.heatmapContainer}>
      <canvas ref={canvasRef} className={styles.canvas} />
    </div>
  )
}
