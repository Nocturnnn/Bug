import * as THREE from 'three'

export function createStructureMode() {
  // Build unique indexed edges once. The original position buffer and transforms
  // are shared, so toggling never copies geometry or compiles a physical shader.
  const material = new THREE.LineBasicMaterial({ color: '#83bac6', toneMapped: false })
  const parts: { mesh: THREE.Mesh; lines: THREE.LineSegments; mask: number }[] = []
  let enabled = false
  let light = -1
  return {
    register(mesh: THREE.Mesh) {
      const source = mesh.geometry
      const position = source.getAttribute('position')
      const edges = new Set<number>()
      const indices: number[] = []
      const addEdge = (a: number, b: number) => {
        const low = Math.min(a, b), high = Math.max(a, b)
        const key = low * position.count + high
        if (edges.has(key)) return
        edges.add(key); indices.push(low, high)
      }
      const count = source.index?.count ?? position.count
      for (let i = 0; i < count; i += 3) {
        const a = source.index?.getX(i) ?? i
        const b = source.index?.getX(i + 1) ?? i + 1
        const c = source.index?.getX(i + 2) ?? i + 2
        addEdge(a, b); addEdge(b, c); addEdge(c, a)
      }
      const geometry = new THREE.BufferGeometry()
      geometry.setAttribute('position', position)
      geometry.setIndex(indices)
      const lines = new THREE.LineSegments(geometry, material)
      lines.visible = false
      mesh.add(lines)
      parts.push({ mesh, lines, mask: mesh.layers.mask })
    },
    setEnabled(value: boolean) {
      if (value === enabled) return
      enabled = value
      // Layers hide the filled mesh while letting its line child inherit the
      // same animation. Mesh.visible=false would also hide that child.
      parts.forEach(({ mesh, lines, mask }) => { mesh.layers.mask = enabled ? 0 : mask; lines.visible = enabled })
    },
    setLight(value: number) {
      if (light === value) return
      light = value
      material.color.set('#83bac6').multiplyScalar(0.4 + value / 100)
    },
    dispose() {
      parts.forEach(({ mesh, lines, mask }) => { mesh.layers.mask = mask; mesh.remove(lines); lines.geometry.dispose() })
      parts.length = 0
      material.dispose()
    },
  }
}
