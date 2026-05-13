'use client'

import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

function Particles({ count = 500 }: { count?: number }) {
  const mesh = useRef<THREE.Points>(null)
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 })

  // Track mouse globally
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Normalize to -1 to 1
      mouseRef.current.targetX = (e.clientX / window.innerWidth) * 2 - 1
      mouseRef.current.targetY = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Generate random positions for particles
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30      // x
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20  // y
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15  // z
    }
    return pos
  }, [count])

  useFrame(({ clock }) => {
    if (!mesh.current) return

    // Smooth mouse tracking - more responsive
    mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.1
    mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.1

    // Much stronger rotation based on mouse
    mesh.current.rotation.y = mouseRef.current.x * 0.5
    mesh.current.rotation.x = -mouseRef.current.y * 0.4

    // Subtle constant drift
    mesh.current.rotation.z = Math.sin(clock.elapsedTime * 0.1) * 0.05
    mesh.current.position.y = Math.sin(clock.elapsedTime * 0.2) * 0.3
  })

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#ffffff"
        transparent
        opacity={0.5}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function Connections({ count = 200 }: { count?: number }) {
  const linesRef = useRef<THREE.LineSegments>(null)
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.targetX = (e.clientX / window.innerWidth) * 2 - 1
      mouseRef.current.targetY = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15
    }
    return pos
  }, [count])

  useFrame(({ clock }) => {
    if (!linesRef.current) return

    mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.1
    mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.1

    linesRef.current.rotation.y = mouseRef.current.x * 0.5
    linesRef.current.rotation.x = -mouseRef.current.y * 0.4
    linesRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.1) * 0.05
    linesRef.current.position.y = Math.sin(clock.elapsedTime * 0.2) * 0.3
  })

  const linePositions = useMemo(() => {
    const lines: number[] = []
    const threshold = 4

    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = positions[i * 3] - positions[j * 3]
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1]
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2]
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)

        if (dist < threshold) {
          lines.push(
            positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
            positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]
          )
        }
      }
    }

    return new Float32Array(lines)
  }, [positions, count])

  return (
    <lineSegments ref={linesRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={linePositions.length / 3}
          array={linePositions}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial
        color="#3b82f6"
        transparent
        opacity={0.15}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </lineSegments>
  )
}

function ReadyTrigger({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    onReady()
  }, [onReady])
  return null
}

interface ParticleFieldProps {
  className?: string
  particleCount?: number
  onReady?: () => void
}

export function ParticleField({ className = '', particleCount = 400, onReady }: ParticleFieldProps) {
  return (
    <div className={`fixed inset-0 ${className}`}>
      <Canvas
        camera={{ position: [0, 0, 12], fov: 60 }}
        style={{ background: 'transparent' }}
        dpr={[1, 2]}
      >
        {onReady && <ReadyTrigger onReady={onReady} />}
        <Particles count={particleCount} />
        <Connections count={Math.floor(particleCount * 0.5)} />
      </Canvas>
    </div>
  )
}
