import { useCallback, useEffect, useState } from 'react'
import ButterflyScene, { type SpecimenInfo, type View } from './ButterflyScene'

function Graph({ kind = 'wave' }: { kind?: 'wave' | 'spectrum' | 'angle' }) {
  return <svg className={`graph graph-${kind}`} viewBox="0 0 180 64" fill="none" aria-hidden="true">
    <g className="graph-grid">{Array.from({ length: 13 }, (_, i) => <path key={i} d={`M${i * 15} 0V64`} />)}{[8, 24, 40, 56].map(y => <path key={y} d={`M0 ${y}H180`} />)}</g>
    {kind === 'wave' && <><path d="M0 34Q7 5 14 34T28 34T42 34T56 34T70 34T84 34T98 34T112 34T126 34T140 34T154 34T168 34T182 34" /><path className="dim" d="M0 34Q17 10 34 34T68 34T102 34T136 34T170 34" /></>}
    {kind === 'spectrum' && <path d="M0 54L9 52L16 54L23 45L28 50L34 25L39 48L44 39L49 51L56 47L61 13L67 6L72 34L77 47L82 24L87 43L95 51L101 38L107 45L115 18L120 49L127 51L133 43L140 54L146 48L154 53L160 50L169 54H180" />}
    {kind === 'angle' && <><path d="M16 54H166M28 58V4M28 54L129 8L149 54ZM129 8V54M28 54L160 30M99 54A72 72 0 0 0 91 23" /><circle cx="28" cy="54" r="2" /></>}
  </svg>
}

function PlateLines() {
  return <svg className="plate-lines" viewBox="0 0 1200 900" preserveAspectRatio="none" fill="none" aria-hidden="true">
    <g className="construction"><path d="M39 171V735H1163M717 16V866M31 450H1174M226 190H1016V744M133 304H894M133 304V650M390 107H695M46 676H426M997 254V790M281 812H1004" /><path d="M193 713L535 135L973 635M151 266L891 674M718 189L948 750M88 580H443M457 686H876" /><ellipse cx="634" cy="480" rx="353" ry="300" strokeDasharray="2 8" /><path d="M381 151Q676 40 939 437M327 757Q716 882 950 601" /></g>
    <g className="measures"><path d="M57 187V759M1128 213V769M200 839H1059M708 49V826M155 329H529M790 569H1113M311 725H736" />{Array.from({ length: 38 }, (_, i) => <path key={i} d={`M${i % 5 ? 53 : 48} ${192 + i * 15}H58M1128 ${215 + i * 14}H${i % 5 ? 1132 : 1138}`} />)}{Array.from({ length: 47 }, (_, i) => <path key={i} d={`M${204 + i * 18} 839V${i % 5 ? 843 : 850}`} />)}{[[155,329],[529,329],[708,189],[790,569],[997,450],[311,725],[717,686]].map(([x,y]) => <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}><path d="M-7 0H7M0-7V7" /><circle r="2" /></g>)}</g>
  </svg>
}

function WingDiagram() {
  return <svg className="wing-diagram" viewBox="0 0 180 140" fill="none" aria-hidden="true"><g className="graph-grid"><path d="M5 5H175V135H5ZM90 0V140M0 70H180" /><circle cx="90" cy="70" r="62" /></g><g><path d="M88 89C65 77 15 69 21 23C35 2 72 26 88 75M92 89C115 77 165 69 159 23C145 2 108 26 92 75M86 90C39 64 35 119 64 123C78 125 87 106 89 94M94 90C141 64 145 119 116 123C102 125 93 106 91 94M90 48V116M86 48L81 36M94 48L99 36" />{[0,1,2,3,4].map(i=><path key={i} d={`M88 89Q${28+i*11} ${54-i*5} ${24+i*11} ${23+i*4}M92 89Q${152-i*11} ${54-i*5} ${156-i*11} ${23+i*4}`} />)}</g></svg>
}

function Icon({ type }: { type: 'play' | 'pause' | 'reset' | 'mesh' | 'expand' }) {
  return <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" aria-hidden="true">{type === 'play' && <path d="M6 3L14 9L6 15Z" />}{type === 'pause' && <path d="M6 4V14M12 4V14" />}{type === 'reset' && <path d="M4 7A6 6 0 1 1 4 13M4 2V7H9" />}{type === 'mesh' && <path d="M9 2L16 6V13L9 17L2 13V6ZM2 6L9 10L16 6M9 10V17M9 2V10M2 13L9 10L16 13" />}{type === 'expand' && <path d="M2 7V2H7M11 2H16V7M16 11V16H11M7 16H2V11" />}</svg>
}

const base = import.meta.env.BASE_URL

export default function App() {
  const [paused, setPaused] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [wireframe, setWireframe] = useState(false)
  const [view, setView] = useState<View>('study')
  const [reset, setReset] = useState(0)
  const [light, setLight] = useState(65)
  const [notes, setNotes] = useState(false)
  const [info, setInfo] = useState<SpecimenInfo | null>(null)
  const [focus, setFocus] = useState(false)
  const onReady = useCallback((value: SpecimenInfo) => setInfo(value), [])
  useEffect(() => {
    const escape = (e: KeyboardEvent) => { if (e.key === 'Escape') { setNotes(false); setFocus(false) } }
    window.addEventListener('keydown', escape)
    return () => window.removeEventListener('keydown', escape)
  }, [])
  return <main className={`atlas ${focus ? 'focus-mode' : ''}`}>
    <a className="skip-link" href="#controls">Ir para os controles</a>
    <header className="masthead"><a className="identity" href="#" aria-label="Iridescência, início"><span className="identity-mark">✳</span><span>ARQUIVO NATURAL<br /><b>ESTUDOS DO INVISÍVEL</b></span></a><div className="edition">ATLAS ENTOMOLÓGICO <span>/</span> VOL. 001</div><button className="index-link" onClick={() => { setNotes(v => !v); if (!notes) setTimeout(() => document.getElementById('notes')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50) }} aria-expanded={notes} aria-controls="notes">Notas de campo <span>↗</span></button></header>
    <section className="observation" aria-labelledby="specimen-title">
      <div className="ambient ambient-one" /><div className="ambient ambient-two" />
      <PlateLines />
      <ButterflyScene paused={paused} wireframe={wireframe} view={view} reset={reset} light={light} onReady={onReady} />
      <div className="specimen-heading field-panel"><span className="eyebrow">LEPIDOPTERA / ESPÉCIME 001</span><h1 id="specimen-title">IRIDESCÊNCIA</h1><p className="subtitle">A anatomia da luz.</p><div className="mini-rule" /><p className="micro">ESTUDO DE MORFOLOGIA ESPECULATIVA<br />MEMBRANA ÓPTICA · COR ESTRUTURAL<br />REGISTRO TRIDIMENSIONAL / 001—A</p><div className="registration"><span>CLASSE</span><span>INSECTA</span><span>ORDEM</span><span>LEPIDOPTERA</span><span>MEIO</span><span>DIGITAL</span></div></div>
      <aside className="optical-table field-panel" aria-label="Estudo óptico"><div className="panel-heading"><span>RESPOSTA ESPECTRAL</span><span>FIG. 01</span></div><Graph kind="spectrum" /><div className="graph-axis"><span>380</span><span>λ / nm</span><span>780</span></div><table><caption className="sr-only">Parâmetros visuais da membrana</caption><thead><tr><th>CAMADA</th><th>TIPO</th><th>ESTADO</th></tr></thead><tbody><tr><td>MEMBRANA</td><td>FILME</td><td>TRANSL.</td></tr><tr><td>NERVURA</td><td>REDE</td><td>CONTÍNUA</td></tr><tr><td>REFLEXO</td><td>LUZ</td><td>PRISMÁT.</td></tr></tbody></table><span className="micro table-note">SIMULAÇÃO ÓPTICA / SEM ESCALA FÍSICA</span></aside>
      <div className="vertical-label vertical-left" aria-hidden="true">MORFOLOGIA ALAR — OBSERVAÇÃO NÃO INVASIVA</div>
      <div className="vertical-label vertical-right" aria-hidden="true">PRANCHA 001 / COLEÇÃO DE FORMAS IMPOSSÍVEIS</div>
      <div className="annotation annotation-wing" aria-hidden="true"><span>01 / ASA ANTERIOR</span><p>SUPERFÍCIE DE INTERFERÊNCIA<br />PELÍCULA FINA · REFLEXÃO VARIÁVEL</p><i /></div>
      <div className="annotation annotation-vein" aria-hidden="true"><span>02 / NERVURA ALAR</span><p>RAMIFICAÇÃO ESTRUTURAL</p><i /></div>
      <div className="annotation annotation-body" aria-hidden="true"><i /><span>03 / TÓRAX</span><p>QUITINA · ARTICULAÇÃO CENTRAL</p></div>
      <aside className="interference field-panel" aria-label="Interferência luminosa"><span className="panel-heading">INTERFERÊNCIA / FILME FINO</span><Graph /><p className="formula">δ = 2nd cos θ</p><p className="micro">A SUPERFÍCIE MUDA.<br />A LUZ REVELA OUTRA COR.</p><div className="spectrum" /><div className="graph-axis"><span>VIOLETA</span><span>VERMELHO</span></div></aside>
      <aside className="coordinates field-panel" aria-label="Registro do modelo"><Graph kind="angle" /><div className="registration"><span>GEOMETRIA</span><span>{info ? 'VERIFICADA' : 'CARREGANDO'}</span><span>MALHAS</span><span>{info?.meshes.toString().padStart(2, '0') ?? '—'}</span><span>TRIÂNGULOS</span><span>{info?.triangles.toLocaleString('pt-BR') ?? '—'}</span></div><span className="micro">PROJEÇÃO LIVRE / EIXOS X·Y·Z</span></aside>
      <figure className="morphology field-panel"><figcaption className="panel-heading"><span>PLANO MORFOLÓGICO</span><span>FIG. 02</span></figcaption><WingDiagram /><div className="graph-axis"><span>VISTA DORSAL</span><span>SEM ESCALA</span></div></figure>
      <div className="specimen-poem field-panel"><span className="eyebrow">OBSERVAÇÃO 001</span><p>A cor não está na asa.<br />Está no encontro<br />entre a luz e o olhar.</p></div>
      <div className="field-bottom"><span><i className={`status-dot ${info ? 'ready' : ''}`} />{info ? 'ESPÉCIME EM OBSERVAÇÃO' : 'PREPARANDO ESPÉCIME'}</span><span className="interaction-hint">ARRASTE PARA EXPLORAR <span>↔</span> SCROLL PARA APROXIMAR</span><button onClick={() => setFocus(v => !v)} aria-pressed={focus} aria-label={focus ? 'Sair da vista ampliada' : 'Ampliar observação'}><Icon type="expand" /><span>{focus ? 'RECOLHER' : 'AMPLIAR'}</span></button></div>
    </section>
    <section className="control-bar" id="controls" aria-label="Controles do espécime"><div className="view-controls" role="group" aria-label="Ângulo de observação"><span className="control-label">VISTA</span>{([['study', 'Estudo'], ['dorsal', 'Dorsal'], ['profile', 'Perfil']] as const).map(([key, label]) => <button key={key} className={view === key ? 'selected' : ''} aria-pressed={view === key} onClick={() => setView(key)}>{label}</button>)}</div><div className="playback-controls"><button onClick={() => setPaused(v => !v)} aria-pressed={paused}><Icon type={paused ? 'play' : 'pause'} /><span>{paused ? 'Retomar' : 'Pausar'}</span></button><button title="Inspecionar a malha em repouso. Arraste para girar." onClick={() => setWireframe(v => !v)} aria-pressed={wireframe}><Icon type="mesh" /><span>Estrutura</span><i className={wireframe ? 'toggle on' : 'toggle'} /></button><button onClick={() => { setView('study'); setLight(65); setReset(v => v + 1) }}><Icon type="reset" /><span>Restaurar</span></button></div><label className="light-control"><span>LUZ</span><input type="range" min="15" max="100" value={light} onChange={e => setLight(Number(e.target.value))} aria-label="Intensidade da luz" /><output>{light.toString().padStart(2, '0')}%</output></label></section>
    <footer className="colophon"><div className="ruler" aria-hidden="true">{Array.from({ length: 31 }, (_, i) => <span key={i}>{String(i * 10).padStart(3, '0')}</span>)}</div><div className="editorial"><section><h2>01 / MATÉRIA E LUZ</h2><p>Uma anatomia feita de reflexos. Asas translúcidas, nervuras delicadas e um espectro que se transforma a cada ponto de vista.</p></section><section><h2>02 / COR ESTRUTURAL</h2><p>Na natureza, a microestrutura de uma superfície pode produzir cor pela interação com a luz. Aqui, esse fenômeno inspira uma exploração visual.</p></section><section><h2>03 / ESPÉCIME VIRTUAL</h2><p>Estudo artístico de entomologia especulativa. Uma forma digital para observar de perto, girar e descobrir. Não representa uma espécie real.</p></section><section><h2>04 / ARQUIVO ABERTO</h2><p>Observe por outros ângulos.<br />O detalhe também é paisagem.</p><a href={`${base}models/borboleta_iridescente.glb`} download>Baixar espécime .glb <span>↓</span></a></section></div><div id="notes" className="field-notes" hidden={!notes}><div><h2>NOTAS DE CAMPO / PROTOCOLO DE OBSERVAÇÃO</h2><p>Arraste para girar o espécime e use a roda do mouse ou o gesto de pinça para aproximar. No teclado, use as setas para girar, + e − para alterar a aproximação e Home para restaurar. As vistas Estudo, Dorsal e Perfil oferecem diferentes leituras da forma.</p></div><div><h2>LEITURA DA PRANCHA</h2><p>Os gráficos e as linhas compõem uma interpretação artística de uma prancha científica. Os totais de malhas e triângulos são lidos diretamente do arquivo 3D. A luz ajusta a iluminação da cena; Estrutura revela a triangulação das superfícies e mantém o espécime em repouso para facilitar a inspeção.</p></div><button onClick={() => setNotes(false)} aria-label="Fechar notas de campo">×</button></div><div className="footer-baseline"><span>ARQUIVO NATURAL © {new Date().getFullYear()}</span><span>IRIDESCÊNCIA / PRANCHA 001</span><button onClick={() => setNotes(v => !v)} aria-expanded={notes} aria-controls="notes">{notes ? 'FECHAR NOTAS −' : 'NOTAS DE CAMPO +'}</button></div></footer>
  </main>
}
