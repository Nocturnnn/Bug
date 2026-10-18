import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

export type View = 'study' | 'dorsal' | 'profile'
export type SpecimenInfo = { meshes: number; triangles: number }
type Options = { paused: boolean; wireframe: boolean; view: View; reset: number; light: number }
type Props = Options & { onReady: (info: SpecimenInfo) => void }

function makeStudio(renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#080d13')
  const panels: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = []
  const panel = (color: string, power: number, x: number, y: number, z: number, w: number, h: number) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(power), side: THREE.DoubleSide }))
    mesh.position.set(x, y, z); mesh.lookAt(0, 0, 0); scene.add(mesh); panels.push(mesh)
  }
  panel('#c9f8ff', 5, -3, 3, 4, 1, 7)
  panel('#3eeaff', 9, 4, 1, 2, 0.5, 7)
  panel('#8d79ff', 5, -4, -1, 2, 1, 5)
  panel('#fcab6a', 5, 2, 4, 3, 0.45, 4)
  panel('#94ffe0', 5, -1, -3, 4, 4, 0.4)
  panel('#cedcf5', 2, 1, 5, -1, 5, 2)
  const generator = new THREE.PMREMGenerator(renderer)
  const target = generator.fromScene(scene, 0.025, 0.1, 50, { size: 256 })
  generator.dispose(); panels.forEach(p => { p.geometry.dispose(); p.material.dispose() })
  return target
}

function membrane(source: THREE.MeshStandardMaterial) {
  const material = new THREE.MeshPhysicalMaterial({
    color: '#5268ae', vertexColors: source.vertexColors, side: THREE.DoubleSide,
    metalness: 0.62, roughness: 0.2, transparent: true, opacity: 0.72,
    depthWrite: false, iridescence: 1, iridescenceIOR: 1.32,
    iridescenceThicknessRange: [180, 680], clearcoat: 1, clearcoatRoughness: 0.13,
    envMapIntensity: 0.7,
  })
  material.name = source.name
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFilmPosition;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvFilmPosition = position;')
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vFilmPosition;').replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
      float angle = abs(dot(normalize(vViewPosition), normal));
      float phase = vFilmPosition.x * 4.8 + vFilmPosition.z * 6.2 + sin(vFilmPosition.z * 3.5) * 0.5 + angle * 5.0;
      vec3 spectrum = 0.5 + 0.5 * cos(phase + vec3(0.0, 2.094, 4.188));
      float band = pow(0.5 + 0.5 * sin(phase * 2.7), 14.0);
      float radial = length(vFilmPosition.xz);
      float vein = pow(0.5 + 0.5 * cos(atan(vFilmPosition.z, vFilmPosition.x) * 110.0 + sin(radial * 7.0) * 0.18), 48.0);
      reflectedLight.indirectSpecular *= mix(vec3(0.35, 0.6, 1.0), 0.15 + spectrum * 1.7, 0.55);
      reflectedLight.directSpecular *= 0.55 + spectrum * 1.6;
      reflectedLight.indirectSpecular += spectrum * band * 0.11 + vec3(0.12, 0.35, 0.5) * vein * 0.18;
    `)
  }
  material.customProgramCacheKey = () => 'butterfly-film-1'
  return material
}

const orientations: Record<View, THREE.Euler> = {
  study: new THREE.Euler(0.1, 0.88, -0.64, 'ZYX'),
  dorsal: new THREE.Euler(0, 0, 0, 'ZYX'),
  profile: new THREE.Euler(0.08, 1.22, -0.6, 'ZYX'),
}

export default function ButterflyScene(props: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const options = useRef(props)
  options.current = props
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [retry, setRetry] = useState(0)
  const [error, setError] = useState('')
  useEffect(() => {
    const host = hostRef.current!
    let disposed = false, loaded = false, frame = 0, visible = true, time = 0, previous = 0
    let renderer: THREE.WebGLRenderer | undefined, controls: OrbitControls | undefined, environment: THREE.WebGLRenderTarget | undefined
    let mixer: THREE.AnimationMixer | undefined, root: THREE.Group | undefined, centerOffsetY = 0
    const geometries = new Set<THREE.BufferGeometry>(), materials = new Set<THREE.Material>(), textures = new Set<THREE.Texture>()
    const scene = new THREE.Scene()
    const pivot = new THREE.Group(); scene.add(pivot)
    const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 100)
    const targetRotation = new THREE.Quaternion().setFromEuler(orientations[options.current.view])
    pivot.quaternion.copy(targetRotation)
    let currentView = options.current.view, currentReset = options.current.reset
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const key = new THREE.DirectionalLight('#d3f6ff', 4); key.position.set(-4, 5, 7); scene.add(key)
    const rim = new THREE.DirectionalLight('#62cfff', 3); rim.position.set(4, -2, 3); scene.add(rim)
    const warm = new THREE.DirectionalLight('#ffd7a0', 3); warm.position.set(2, 4, 5); scene.add(warm)
    scene.add(new THREE.HemisphereLight('#b5d9e4', '#162d28', 1.5))
    const fail = (message: string) => { if (!disposed) { loaded = false; setStatus('error'); setError(message); host.dataset.ready = 'false' } }
    setStatus('loading')
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' })
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, window.innerWidth < 700 ? 1.5 : 1.8))
      renderer.setClearColor(0x070b09, 0); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1
      renderer.domElement.setAttribute('aria-hidden', 'true'); host.appendChild(renderer.domElement)
      environment = makeStudio(renderer); scene.environment = environment.texture
      controls = new OrbitControls(camera, host)
      controls.enableDamping = true; controls.dampingFactor = 0.065; controls.enablePan = false
      controls.rotateSpeed = 0.65; controls.zoomSpeed = 0.7; controls.minDistance = 4; controls.maxDistance = 23
      controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
      controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE }
      host.style.touchAction = 'pan-y'
    } catch { fail('A visualização 3D precisa de WebGL. Ative a aceleração gráfica do navegador e tente novamente.') }
    let framingDistance = 0
    const fit = () => {
      const width = host.clientWidth, height = host.clientHeight
      camera.aspect = width / height; camera.updateProjectionMatrix(); renderer?.setSize(width, height)
      const nextDistance = Math.max(14.3, 11.8 / camera.aspect)
      if (framingDistance) camera.position.multiplyScalar(nextDistance / framingDistance)
      framingDistance = nextDistance
    }
    const restoreCamera = () => {
      const aspect = host.clientWidth / host.clientHeight
      camera.position.set(0, 0, Math.max(14.3, 11.8 / aspect))
      controls?.target.set(0, 0, 0); controls?.update()
    }
    fit(); restoreCamera()
    const resize = new ResizeObserver(fit); resize.observe(host)
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting }, { rootMargin: '100px' }); observer.observe(host)
    const contextLost = (event: Event) => { event.preventDefault(); fail('O contexto gráfico foi interrompido. Recarregue o espécime para continuar.') }
    renderer?.domElement.addEventListener('webglcontextlost', contextLost)
    const keyboard = (event: KeyboardEvent) => {
      const step = 0.1
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', '+', '=', '-'].includes(event.key)) event.preventDefault()
      const offset = camera.position.clone().sub(controls?.target ?? new THREE.Vector3())
      const spherical = new THREE.Spherical().setFromVector3(offset)
      if (event.key === 'ArrowLeft') spherical.theta -= step
      if (event.key === 'ArrowRight') spherical.theta += step
      if (event.key === 'ArrowUp') spherical.phi -= step
      if (event.key === 'ArrowDown') spherical.phi += step
      if (event.key === '+' || event.key === '=') spherical.radius = Math.max(4, spherical.radius * 0.9)
      if (event.key === '-') spherical.radius = Math.min(23, spherical.radius * 1.1)
      spherical.makeSafe(); camera.position.setFromSpherical(spherical).add(controls?.target ?? new THREE.Vector3())
      if (event.key === 'Home') restoreCamera()
      controls?.update()
    }
    host.addEventListener('keydown', keyboard)
    if (renderer) new GLTFLoader().load(`${import.meta.env.BASE_URL}models/borboleta_iridescente.glb`, gltf => {
      if (disposed) { gltf.scene.traverse(node => { if (node instanceof THREE.Mesh) { node.geometry.dispose(); (Array.isArray(node.material) ? node.material : [node.material]).forEach(m => m.dispose()) } }); return }
      root = gltf.scene
      let meshes = 0, triangles = 0
      root.traverse(node => {
        if (!(node instanceof THREE.Mesh)) return
        meshes++; triangles += (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3
        geometries.add(node.geometry)
        node.material = (Array.isArray(node.material) ? node.material : [node.material]).map(source => {
          materials.add(source)
          Object.values(source).forEach(v => { if (v instanceof THREE.Texture) textures.add(v) })
          if (source.name.includes('Membrana')) { const m = membrane(source); materials.add(m); return m }
          if (source instanceof THREE.MeshStandardMaterial) {
            source.envMapIntensity = 1.4
            if (source.name.includes('Nervuras')) { source.emissive.set('#23647c'); source.emissiveIntensity = 0.25; source.roughness = 0.3 }
            if (source.name.includes('Reflexos')) { source.emissive.set('#39b8df'); source.emissiveIntensity = 0.5 }
          }
          return source
        })
        if (node.material.length === 1) node.material = node.material[0]
      })
      // Open the forewings slightly for a legible, oblique study pose.
      for (const side of ['L', 'R']) {
        const wing = root.getObjectByName(`Asa_Anterior_${side}`)
        if (wing?.parent) {
          const mount = new THREE.Group()
          mount.position.copy(wing.position)
          mount.rotation.y = side === 'L' ? 0.36 : -0.36
          wing.parent.add(mount); mount.add(wing); wing.position.set(0, 0, 0)
        }
      }
      root.rotation.x = Math.PI / 2; root.updateMatrixWorld(true)
      const box = new THREE.Box3().setFromObject(root), center = box.getCenter(new THREE.Vector3())
      root.position.sub(center)
      centerOffsetY = center.y
      pivot.add(root)
      if (gltf.animations.length) { mixer = new THREE.AnimationMixer(root); gltf.animations.forEach(clip => mixer!.clipAction(clip).play()); mixer.setTime(0.48) }
      loaded = true; setStatus('ready'); host.dataset.ready = 'true'; options.current.onReady({ meshes, triangles: Math.round(triangles) })
    }, undefined, () => fail('Não foi possível carregar a borboleta. Verifique sua conexão e tente novamente.'))
    const animate = (now: number) => {
      if (disposed || !renderer) return
      frame = requestAnimationFrame(animate)
      const delta = Math.min((now - previous) / 1000 || 0, 0.05); previous = now
      if (!visible || document.hidden) return
      const p = options.current
      if (p.reset !== currentReset || p.view !== currentView) { currentReset = p.reset; currentView = p.view; targetRotation.setFromEuler(orientations[p.view]); restoreCamera(); if (p.reset) mixer?.setTime(0.48) }
      pivot.quaternion.slerp(targetRotation, reduced.matches ? 1 : 0.065)
      if (!p.paused && !reduced.matches) { time += delta; mixer?.setTime(0.48 + Math.sin(time * 0.45) * 0.08) }
      if (root) root.position.y = -centerOffsetY + (!p.paused && !reduced.matches ? Math.sin(time * 0.5) * 0.025 : 0)
      materials.forEach(material => { if (material instanceof THREE.MeshStandardMaterial) material.wireframe = p.wireframe })
      renderer.toneMappingExposure = 0.4 + p.light / 85
      controls?.update()
      if (loaded) renderer.render(scene, camera)
    }
    if (renderer) frame = requestAnimationFrame(animate)
    return () => {
      disposed = true; cancelAnimationFrame(frame); resize.disconnect(); observer.disconnect(); host.removeEventListener('keydown', keyboard)
      controls?.dispose(); if (root) mixer?.uncacheRoot(root)
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); environment?.dispose()
      if (renderer) { renderer.domElement.removeEventListener('webglcontextlost', contextLost); renderer.dispose(); renderer.domElement.remove() }
    }
  }, [retry])
  return <div ref={hostRef} className="specimen-scene" tabIndex={0} role="region" aria-label="Borboleta 3D interativa. Arraste para girar, use scroll para aproximar. Teclado: setas, mais, menos e Home.">
    {status === 'loading' && <div className="scene-message" role="status"><span className="loading-orbit" /><span>REVELANDO O ESPÉCIME</span><small>GEOMETRIA · MATÉRIA · LUZ</small></div>}
    {status === 'error' && <div className="scene-message scene-error" role="alert"><span>VISUALIZAÇÃO INTERROMPIDA</span><p>{error}</p><button onClick={() => setRetry(v => v + 1)}>Recarregar espécime ↗</button></div>}
  </div>
}
