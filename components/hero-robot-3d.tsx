"use client"

import { useRef, useEffect, Suspense } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { useGLTF, useAnimations, Stage, OrbitControls } from "@react-three/drei"
import * as THREE from "three"
import { useRobotAnimation } from "@/lib/robot-animation-context"

// ─── Types ─────────────────────────────────────────────────────────────────────
export interface RobotSceneProps {
  /** Path to the GLB model file (relative to /public) */
  modelPath: string
  /** Enable idle floating animation (default: true) */
  float?: boolean
  /** Floating amplitude (default: 0.08) */
  floatAmplitude?: number
  /** Enable idle Y-axis rotation (default: true) */
  rotate?: boolean
  /** Rotation speed multiplier (default: 0.12) */
  rotateSpeed?: number
  /** Stage environment preset (default: "city") */
  environment?: "apartment" | "city" | "dawn" | "forest" | "lobby" | "night" | "park" | "studio" | "sunset" | "warehouse"
  /** Stage lighting intensity (default: 0.45) */
  intensity?: number
  /** Enable orbit controls for interactive dragging (default: true) */
  orbitControls?: boolean
  /** Canvas height CSS value (default: "100%") */
  height?: string
  /** Manual scale of the 3D model (default: 1) */
  scale?: number
  /** Manual Y position offset of the 3D model (default: 0) */
  positionY?: number
}

// ─── Inner Scene Model ─────────────────────────────────────────────────────────
function RobotModel({
  modelPath,
  float: enableFloat = true,
  floatAmplitude = 0.08,
  rotate: enableRotate = true,
  rotateSpeed = 0.12,
  scale = 1,
  positionY = 0,
}: Pick<RobotSceneProps, "modelPath" | "float" | "floatAmplitude" | "rotate" | "rotateSpeed" | "scale" | "positionY">) {
  const group = useRef<THREE.Group>(null)

  // Load the rigged robot model (Draco decoder enabled)
  const { scene, animations } = useGLTF(modelPath, true)

  // Bind animations to the scene skeleton
  const { actions, names } = useAnimations(animations, scene)

  const { currentAnimation, fadeDuration } = useRobotAnimation()
  const activeActionRef = useRef<string | null>(null)

  useEffect(() => {
    if (names.length === 0) return

    // Map custom/aliased animation names to actual clip names inside the GLB
    let targetName = currentAnimation
    if (currentAnimation === "waving" || currentAnimation === "idle") {
      targetName = names.find((name) => name.toLowerCase().includes("mixamo")) || names[0]
    }

    // Fallback: if the requested name isn't found, play the first clip
    const action = actions[targetName] ?? actions[names[0]]
    if (action) {
      // Crossfade: fade out previous action
      if (activeActionRef.current && activeActionRef.current !== targetName) {
        const prevAction = actions[activeActionRef.current]
        if (prevAction) {
          prevAction.fadeOut(fadeDuration)
        }
      }

      action.reset().fadeIn(fadeDuration).play()
      activeActionRef.current = targetName
    }
  }, [actions, names, currentAnimation, fadeDuration])

  // Idle float & rotation applied to the group wrapper
  useFrame((state) => {
    if (group.current) {
      const time = state.clock.getElapsedTime()
      if (enableFloat) {
        group.current.position.y = positionY + Math.sin(time * 1.5) * floatAmplitude
      } else {
        group.current.position.y = positionY
      }
      
      if (enableRotate) {
        group.current.rotation.y = time * rotateSpeed
      }
    }
  })

  return (
    <group ref={group} dispose={null} scale={scale} position={[0, positionY, 0]}>
      <primitive object={scene} />
    </group>
  )
}

// ─── Loader Fallback ───────────────────────────────────────────────────────────
function RobotLoader() {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-14 h-14 rounded-full border border-[#c5a880]/20 animate-ping duration-1000" />
        <div className="w-10 h-10 rounded-full border-2 border-white/5 border-t-[#c5a880] animate-spin" />
        <div className="absolute w-2 h-2 rounded-full bg-[#c5a880] shadow-[0_0_10px_#c5a880]" />
      </div>
      <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase mt-4">
        Loading 3D Assistant...
      </span>
    </div>
  )
}

// ─── Reusable Public Component ─────────────────────────────────────────────────
/**
 * RobotScene — Drop-in reusable 3D robot canvas.
 *
 * Usage:
 * ```tsx
 * <RobotScene modelPath="/animations/Waving.fbx.glb" scale={0.02} positionY={-1.5} />
 * ```
 */
export function RobotScene({
  modelPath,
  float = true,
  floatAmplitude = 0.08,
  rotate = true,
  rotateSpeed = 0.12,
  environment = "city",
  intensity = 0.45,
  orbitControls = true,
  height = "100%",
  scale = 1,
  positionY = 0,
}: RobotSceneProps) {
  return (
    <div className="w-full relative bg-transparent" style={{ height }}>
      <Suspense fallback={<RobotLoader />}>
        <Canvas
          gl={{ antialias: true, alpha: true }}
          camera={{ position: [0, 0, 5], fov: 45 }}
          style={{ width: "100%", height: "100%", touchAction: "auto" }}
        >
          <Stage
            environment={environment}
            intensity={intensity}
            adjustCamera={false}
            shadows={{ type: "contact", opacity: 0.4, blur: 2 }}
          >
            <RobotModel
              modelPath={modelPath}
              float={float}
              floatAmplitude={floatAmplitude}
              rotate={rotate}
              rotateSpeed={rotateSpeed}
              scale={scale}
              positionY={positionY}
            />
          </Stage>

          {orbitControls && (
            <OrbitControls
              enableZoom={false}
              enablePan={false}
              enableDamping
              minPolarAngle={Math.PI / 2.5}
              maxPolarAngle={Math.PI / 1.8}
            />
          )}
        </Canvas>
      </Suspense>
    </div>
  )
}

// Preload animation models
useGLTF.preload("/animations/Waving.fbx.glb", true)
useGLTF.preload("/animations/Looking Around.fbx.glb", true)
