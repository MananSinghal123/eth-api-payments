
"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Grid } from "@react-three/drei"
import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { Manrope } from "next/font/google"
import { useRouter } from "next/navigation";
const manrope = Manrope({ subsets: ["latin"] })

function SpinningLogo() {
  const groupRef = useRef<THREE.Group>(null)


  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.5
    }
  })

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.5, 0.5, 0.5]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#cccccc" />
      </mesh>
      <mesh position={[-0.5, -0.5, -0.5]}>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color="#999999" />
      </mesh>
    </group>
  )
}

function AnimatedBox({ initialPosition }: { initialPosition: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [targetPosition, setTargetPosition] = useState(new THREE.Vector3(...initialPosition))
  const currentPosition = useRef(new THREE.Vector3(...initialPosition))

  const getAdjacentIntersection = (current: THREE.Vector3) => {
    const directions = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]
    const randomDirection = directions[Math.floor(Math.random() * directions.length)]
    return new THREE.Vector3(current.x + randomDirection[0] * 3, 0.5, current.z + randomDirection[1] * 3)
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const newPosition = getAdjacentIntersection(currentPosition.current)
      newPosition.x = Math.max(-15, Math.min(15, newPosition.x))
      newPosition.z = Math.max(-15, Math.min(15, newPosition.z))
      setTargetPosition(newPosition)
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  useFrame((state, delta) => {
    if (meshRef.current) {
      currentPosition.current.lerp(targetPosition, 0.1)
      meshRef.current.position.copy(currentPosition.current)
    }
  })

  return (
    <mesh ref={meshRef} position={initialPosition}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#ffffff" opacity={0.9} transparent />
      <lineSegments>
        <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(1, 1, 1)]} />
        <lineBasicMaterial attach="material" color="#000000" linewidth={2} />
      </lineSegments>
    </mesh>
  )
}

function Scene() {
  const initialPositions: [number, number, number][] = [
    [-9, 0.5, -9],
    [-3, 0.5, -3],
    [0, 0.5, 0],
    [3, 0.5, 3],
    [9, 0.5, 9],
    [-6, 0.5, 6],
    [6, 0.5, -6],
    [-12, 0.5, 0],
    [12, 0.5, 0],
    [0, 0.5, 12],
  ]

  return (
    <>
      <OrbitControls />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <Grid
        renderOrder={-1}
        position={[0, 0, 0]}
        infiniteGrid
        cellSize={1}
        cellThickness={0.5}
        sectionSize={3}
        sectionThickness={1}
        sectionColor={[0.5, 0.5, 0.5]}
        fadeDistance={50}
      />
      {initialPositions.map((position, index) => (
        <AnimatedBox key={index} initialPosition={position} />
      ))}
    </>
  )
}

export default function LandingPage() {
    const router = useRouter();
  return (
    <div className={`relative w-full h-screen bg-black text-white overflow-hidden ${manrope.className}`}>
      <header className="absolute top-0 left-0 right-0 z-10 px-4 sm:px-8 py-4 sm:py-6">
        <nav className="flex justify-between items-center w-full">
          <div className="flex items-center">
            <div className="w-12 h-12 sm:w-20 sm:h-20">
              <Canvas camera={{ position: [0, 0, 5] }}>
                <ambientLight intensity={0.5} />
                <pointLight position={[10, 10, 10]} />
                <SpinningLogo />
              </Canvas>
            </div>
            <span className="text-lg sm:text-2xl font-bold ml-2 sm:ml-3">AgenticPay</span>
          </div>
          <ul className="hidden md:flex space-x-8">
            <li>
              <a href="#" className="text-lg hover:text-gray-300 transition-colors font-medium">
                Home
              </a>
            </li>
            <li>
              <a href="#" className="text-lg hover:text-gray-300 transition-colors font-medium">
                Features
              </a>
            </li>
            <li>
              <a href="#" className="text-lg hover:text-gray-300 transition-colors font-medium">
                Pricing
              </a>
            </li>
            <li>
              <a href="#" className="text-lg hover:text-gray-300 transition-colors font-medium">
                Contact
              </a>
            </li>
          </ul>
          <button className="md:hidden text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </nav>
      </header>
      
      <main className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/3 text-center z-10 px-4 sm:px-8 w-full max-w-6xl">
        <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold mb-8 sm:mb-12 lg:mb-16 leading-tight tracking-tight">
          Autonomous AI Payments
        </h1>
        <p className="text-lg sm:text-xl lg:text-2xl mb-12 sm:mb-16 lg:mb-20 text-gray-300 max-w-sm sm:max-w-2xl lg:max-w-3xl mx-auto font-light leading-relaxed">
          Enable AI agents to handle micropayments, generate zero-knowledge proofs, and settle transactions seamlessly on Polygon.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center items-center">
          <button onClick={() => router.push("/docs")} className="bg-white text-black font-semibold py-3 px-6 sm:py-4 sm:px-8 rounded-lg text-base sm:text-lg hover:bg-gray-200 transition duration-300 transform hover:scale-105 w-full sm:w-auto">
            Visit Docs
          </button>
          <button onClick={() => router.push("/playground")} className="border-2 border-white text-white font-semibold py-3 px-6 sm:py-4 sm:px-8 rounded-lg text-base sm:text-lg hover:bg-white hover:text-black transition duration-300 transform hover:scale-105 w-full sm:w-auto">
            Playground
          </button>
          <button onClick={() => router.push("/dashboard")} className="bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold py-3 px-6 sm:py-4 sm:px-8 rounded-lg text-base sm:text-lg hover:from-purple-600 hover:to-blue-600 transition duration-300 transform hover:scale-105 w-full sm:w-auto">
            Dashboard
          </button>
        </div>
      </main>
      
      <Canvas shadows camera={{ position: [25, 25, 25], fov: 50 }} className="absolute inset-0">
        <Scene />
      </Canvas>
    </div>
  )
}