import { Funscript } from '@background/types'
import { useEffect, useRef, useState } from 'react'
import styles from './Heatmap.module.scss'

// OKLCH to RGB conversion
function oklchToRGB(l: number, c: number, h: number): [number, number, number] {
  const hRad = (h * Math.PI) / 180
  const r = l + c * Math.cos(hRad)
  const g = l + c * Math.cos(hRad + (2 * Math.PI) / 3)
  const b = l + c * Math.cos(hRad + (4 * Math.PI) / 3)

  return [
    Math.max(0, Math.min(1, r)),
    Math.max(0, Math.min(1, g)),
    Math.max(0, Math.min(1, b)),
  ]
}

// Speed to OKLCH conversion
function speedToOklch(speed: number): [number, number, number] {
  const clampLerp = (
    outMin: number,
    outMax: number,
    inMin: number,
    inMax: number,
    t: number,
  ) => {
    const lerp = (min: number, max: number, t: number) => min + t * (max - min)
    const unlerp = (min: number, max: number, t: number) =>
      (t - min) / (max - min)
    const clamp = (min: number, want: number, max: number) =>
      Math.max(min, Math.min(want, max))
    return lerp(outMin, outMax, clamp(0, unlerp(inMin, inMax, t), 1))
  }

  const roll = (value: number, cap: number) => ((value % cap) + cap) % cap

  return [
    clampLerp(0.8, 0.4, 500, 700, speed),
    clampLerp(0.4, 0.1, 500, 800, speed),
    roll(210 - speed / 2.4, 360),
  ]
}

type HeatmapProps = {
  funscript: Funscript | null
}

export const Heatmap = ({ funscript }: HeatmapProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [error, setError] = useState<string | null>(null)

  // Render funscript
  useEffect(() => {
    if (!funscript || !canvasRef.current) return

    const canvas = canvasRef.current
    const gl = canvas.getContext('webgl')

    if (!gl) {
      setError('WebGL not supported')
      return
    }

    try {
      renderFunscript(gl, canvas, funscript)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rendering failed')
    }
  }, [funscript])

  const renderFunscript = (
    gl: WebGLRenderingContext,
    canvas: HTMLCanvasElement,
    funscript: Funscript | null,
  ) => {
    // Update canvas size
    const containerWidth = canvas.parentElement?.clientWidth || 800
    canvas.width = containerWidth
    canvas.height = 64

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
    const fragmentShader = createShader(
      gl.FRAGMENT_SHADER,
      fragmentShaderSource,
    )

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

    // Setup viewport
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.clearColor(0.1, 0.1, 0.1, 1.0)
    gl.clear(gl.COLOR_BUFFER_BIT)

    // Get actions
    const actions = funscript?.actions
    if (!actions || actions.length < 2) {
      throw new Error('Invalid funscript data')
    }

    const duration = actions[actions.length - 1].at
    const positions: number[] = []
    const colors: number[] = []

    // Create line segments
    for (let i = 0; i < actions.length - 1; i++) {
      const current = actions[i]
      const next = actions[i + 1]

      const x1 = (current.at / duration) * canvas.width
      const y1 = ((100 - current.pos) / 100) * canvas.height
      const x2 = (next.at / duration) * canvas.width
      const y2 = ((100 - next.pos) / 100) * canvas.height

      positions.push(x1, y1, x2, y2)

      // Calculate speed and color
      const speed = Math.abs(
        (next.pos - current.pos) / ((next.at - current.at) / 1000),
      )
      const [l, c, h] = speedToOklch(speed)
      const [r, g, b] = oklchToRGB(l, c, h)

      colors.push(r, g, b, r, g, b)
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

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (funscript && canvasRef.current) {
        const canvas = canvasRef.current
        const gl = canvas.getContext('webgl')
        if (gl) {
          renderFunscript(gl, canvas, funscript)
        }
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [funscript])

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
