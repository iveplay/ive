import { Funscript } from '@background/types'
import { useEffect, useRef, useState } from 'react'
import { useDeviceStore } from '@/store/useDeviceStore'
import { useVideoStore } from '@/store/useVideoStore'
import styles from './Heatmap.module.scss'

type ColorGroup = [number, number, number]

const heatmapColors: ColorGroup[] = [
  [0, 0, 0], // Black for 0 speed
  [30, 144, 255], // Blue
  [34, 139, 34], // Green
  [255, 215, 0], // Gold
  [220, 20, 60], // Crimson
  [147, 112, 219], // Medium Slate Blue
  [37, 22, 122], // Dark Purple
]

function getLerpedColor(
  colorA: ColorGroup,
  colorB: ColorGroup,
  t: number,
): ColorGroup {
  return [
    colorA[0] + (colorB[0] - colorA[0]) * t,
    colorA[1] + (colorB[1] - colorA[1]) * t,
    colorA[2] + (colorB[2] - colorA[2]) * t,
  ]
}

function getColor(intensity: number): ColorGroup {
  const stepSize = 120
  if (intensity <= 0) return heatmapColors[0]
  if (intensity > 5 * stepSize) return heatmapColors[6]

  intensity += stepSize / 2.0

  try {
    const stepIndex = Math.floor(intensity / stepSize)
    const nextIndex = Math.min(stepIndex + 1, heatmapColors.length - 1)
    const t = Math.min(
      1.0,
      Math.max(0.0, (intensity - stepIndex * stepSize) / stepSize),
    )

    return getLerpedColor(heatmapColors[stepIndex], heatmapColors[nextIndex], t)
  } catch (error) {
    return [0, 0, 0]
  }
}

// Vertex shader
const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec3 a_color;
      uniform vec2 u_resolution;
      varying vec3 v_color;
      
      void main() {
        vec2 clipSpace = (a_position / u_resolution) * 2.0 - 1.0;
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        v_color = a_color;
      }
    `

// Fragment shader
const fragmentShaderSource = `
      precision mediump float;
      varying vec3 v_color;
      
      void main() {
        gl_FragColor = vec4(v_color, 1.0);
      }
    `

const renderFunscript = (
  gl: WebGLRenderingContext,
  canvas: HTMLCanvasElement,
  funscript: Funscript | null,
  videoDuration: number,
) => {
  // Update canvas size
  const containerWidth = canvas.parentElement?.clientWidth || 800
  canvas.width = containerWidth
  canvas.height = 64

  // Create shaders
  const createShader = (type: number, source: string) => {
    const shader = gl.createShader(type)
    if (!shader) throw new Error('Failed to create shader')

    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader)
      gl.deleteShader(shader)
      throw new Error(`Shader compilation error: ${info}`)
    }

    return shader
  }

  const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource)
  const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource)

  // Create program
  const program = gl.createProgram()
  if (!program) throw new Error('Failed to create program')

  gl.attachShader(program, vertexShader)
  gl.attachShader(program, fragmentShader)
  gl.linkProgram(program)

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program)
    throw new Error(`Program linking error: ${info}`)
  }

  gl.useProgram(program)

  // Set uniforms
  const resolutionLocation = gl.getUniformLocation(program, 'u_resolution')
  gl.uniform2f(resolutionLocation, canvas.width, canvas.height)

  // Setup viewport with transparent background
  gl.viewport(0, 0, canvas.width, canvas.height)
  gl.clearColor(0, 0, 0, 0) // Transparent background
  gl.clear(gl.COLOR_BUFFER_BIT)

  // Get actions
  const actions = funscript?.actions
  if (!actions || actions.length < 2) {
    throw new Error('Invalid funscript data')
  }

  // Use video duration (in ms) instead of script duration for scaling
  const scaleDuration =
    videoDuration > 0 ? videoDuration : actions[actions.length - 1].at
  const positions: number[] = []
  const colors: number[] = []

  // Create line segments
  for (let i = 0; i < actions.length - 1; i++) {
    const current = actions[i]
    const next = actions[i + 1]

    // Scale based on video duration, not script duration
    const x1 = (current.at / scaleDuration) * canvas.width
    const y1 = ((100 - current.pos) / 100) * canvas.height
    const x2 = (next.at / scaleDuration) * canvas.width
    const y2 = ((100 - next.pos) / 100) * canvas.height

    positions.push(x1, y1, x2, y2)

    // Calculate speed and color
    const speed = Math.abs(
      (next.pos - current.pos) / ((next.at - current.at) / 1000),
    )
    const [r, g, b] = getColor(speed)

    // Normalize to 0-1 range for WebGL
    colors.push(r / 255, g / 255, b / 255, r / 255, g / 255, b / 255)
  }

  // Create buffers
  const positionBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW)

  const positionLocation = gl.getAttribLocation(program, 'a_position')
  gl.enableVertexAttribArray(positionLocation)
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)

  const colorBuffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW)

  const colorLocation = gl.getAttribLocation(program, 'a_color')
  gl.enableVertexAttribArray(colorLocation)
  gl.vertexAttribPointer(colorLocation, 3, gl.FLOAT, false, 0, 0)

  // Draw
  gl.drawArrays(gl.LINES, 0, positions.length / 2)
}

export const Heatmap = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  const funscript = useDeviceStore((state) => state.funscript)
  const videoDuration = useVideoStore((state) => state.duration)

  useEffect(() => {
    if (!funscript || !canvasRef.current || videoDuration <= 0) return

    const canvas = canvasRef.current
    const gl = canvas.getContext('webgl')

    if (!gl) {
      setError('WebGL not supported')
      return
    }

    try {
      renderFunscript(gl, canvas, funscript, videoDuration)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rendering failed')
    }
  }, [funscript, videoDuration])

  useEffect(() => {
    const handleResize = () => {
      if (funscript && canvasRef.current && videoDuration > 0) {
        const canvas = canvasRef.current
        const gl = canvas.getContext('webgl')
        if (gl) {
          renderFunscript(gl, canvas, funscript, videoDuration)
        }
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [funscript, videoDuration])

  return (
    <div className={styles.heatmapContainer}>
      {error ? (
        <div className={styles.error}>{error}</div>
      ) : (
        <canvas ref={canvasRef} className={styles.canvas} />
      )}
    </div>
  )
}
