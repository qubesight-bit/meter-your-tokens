import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import "../styles/tally.css";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tally — Pay-as-you-draw access to every AI" },
      { name: "description", content: "One balance, every major model. No subscription. The meter only moves when you do." },
      { property: "og:title", content: "Tally — Pay-as-you-draw access to every AI" },
      { property: "og:description", content: "Top up once. Draw on Claude, GPT, DeepSeek and Gemini from a single balance, billed by the token." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

type Model = { id: string; name: string; provider: string; inRate: number; outRate: number; color: string };
const MODELS: Model[] = [
  { id: "opus", name: "Claude Opus 4.8", provider: "Anthropic", inRate: 5, outRate: 25, color: "#A78BFA" },
  { id: "gpt", name: "GPT-5.2", provider: "OpenAI", inRate: 1.75, outRate: 14, color: "#4ADE80" },
  { id: "sonnet", name: "Claude Sonnet 4.6", provider: "Anthropic", inRate: 3, outRate: 15, color: "#67E8F9" },
  { id: "gemini", name: "Gemini 2.5 Ultra", provider: "Google", inRate: 1.25, outRate: 10, color: "#F472B6" },
  { id: "ds", name: "DeepSeek V3.2", provider: "DeepSeek", inRate: 0.14, outRate: 0.28, color: "#FBBF24" },
];

/* ============== 3D PARTICLE TOKEN STREAM ============== */
function TokenStream() {
  const COUNT = 1800;
  const pointsRef = useRef<THREE.Points>(null!);
  const ringRef = useRef<THREE.Mesh>(null!);
  const gateRef = useRef<THREE.Mesh>(null!);

  const { positions, speeds, offsets, colors } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const speeds = new Float32Array(COUNT);
    const offsets = new Float32Array(COUNT);
    const colors = new Float32Array(COUNT * 3);
    const palette = [
      new THREE.Color("#4ADE80"),
      new THREE.Color("#67E8F9"),
      new THREE.Color("#A78BFA"),
      new THREE.Color("#F472B6"),
    ];
    for (let i = 0; i < COUNT; i++) {
      const t = Math.random();
      const radius = 0.15 + Math.random() * 1.6;
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 0.4;
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      speeds[i] = 0.15 + Math.random() * 0.5;
      offsets[i] = t * Math.PI * 2;
      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    return { positions, speeds, offsets, colors };
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const geo = pointsRef.current.geometry as THREE.BufferGeometry;
    const pos = geo.attributes.position.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      const a = offsets[i] + t * speeds[i] * 0.6;
      // spiral inward toward gate at y=0 then expand outward
      const phase = (t * speeds[i] * 0.25 + i * 0.0007) % 2;
      let radius: number;
      let y: number;
      if (phase < 1) {
        // inflow
        radius = 1.8 * (1 - phase) + 0.2;
        y = (0.5 - phase * 0.5);
      } else {
        const p = phase - 1;
        radius = 0.2 + p * 1.8;
        y = -p * 0.5;
      }
      pos[i * 3] = Math.cos(a) * radius;
      pos[i * 3 + 1] = y + Math.sin(t * 1.4 + i) * 0.04;
      pos[i * 3 + 2] = Math.sin(a) * radius;
    }
    geo.attributes.position.needsUpdate = true;

    if (ringRef.current) ringRef.current.rotation.z = t * 0.3;
    if (gateRef.current) {
      gateRef.current.rotation.y = t * 0.4;
      gateRef.current.rotation.x = Math.sin(t * 0.5) * 0.2;
    }
    if (pointsRef.current) pointsRef.current.rotation.y = t * 0.05;
  });

  return (
    <group>
      {/* Central gate */}
      <mesh ref={gateRef}>
        <torusGeometry args={[0.32, 0.012, 24, 96]} />
        <meshStandardMaterial
          color="#A78BFA"
          emissive="#A78BFA"
          emissiveIntensity={2}
          metalness={1}
          roughness={0.1}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.18, 32, 32]} />
        <meshPhysicalMaterial
          color="#070B1F"
          metalness={0.9}
          roughness={0.05}
          clearcoat={1}
          transmission={0.6}
          thickness={0.5}
          emissive="#4ADE80"
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Outer ring */}
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[2.0, 0.004, 16, 128]} />
        <meshBasicMaterial color="#A78BFA" transparent opacity={0.5} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.6, 0.003, 16, 128]} />
        <meshBasicMaterial color="#67E8F9" transparent opacity={0.3} />
      </mesh>

      {/* Particle tokens */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
            count={COUNT}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
            count={COUNT}
          />
        </bufferGeometry>
        <pointsMaterial
          size={0.018}
          vertexColors
          transparent
          opacity={0.95}
          sizeAttenuation
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}

function HeroCanvas() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return (
    <Canvas
      camera={{ position: [0, 1.4, 3.2], fov: 50 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
    >
      <color attach="background" args={["#070B1F"]} />
      <fog attach="fog" args={["#070B1F", 3, 8]} />
      <ambientLight intensity={0.4} />
      <pointLight position={[3, 3, 3]} intensity={2.5} color="#A78BFA" />
      <pointLight position={[-3, -2, 2]} intensity={1.8} color="#4ADE80" />
      <pointLight position={[0, 0, 0]} intensity={3} color="#67E8F9" distance={2} />
      <Suspense fallback={null}>
        <TokenStream />
      </Suspense>
    </Canvas>
  );
}

/* ============== LIVE METER ============== */
function LiveMeter() {
  const [modelId, setModelId] = useState("sonnet");
  const [tokens, setTokens] = useState(0);
  const [cost, setCost] = useState(0);
  const model = MODELS.find((m) => m.id === modelId)!;

  useEffect(() => {
    setTokens(0);
    setCost(0);
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTokens((t) => t + dt * 380);
      setCost((c) => c + dt * 380 * ((model.inRate * 0.6 + model.outRate * 0.4) / 1_000_000));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [modelId]);

  return (
    <div className="t-glass">
      <div className="t-model-tabs">
        {MODELS.slice(0, 4).map((m) => (
          <button
            key={m.id}
            className={`t-model-tab ${m.id === modelId ? "active" : ""}`}
            onClick={() => setModelId(m.id)}
          >
            {m.name}
          </button>
        ))}
      </div>

      <div className="t-meter-grid" style={{ marginTop: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <span className="t-pill">● Live</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--t-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Session draw
            </span>
          </div>
          <div className="t-meter-display">
            ${cost.toFixed(4)}
          </div>
          <div className="mono" style={{ marginTop: 12, color: "var(--t-muted)", fontSize: 13 }}>
            {Math.floor(tokens).toLocaleString()} tokens streamed
          </div>
        </div>

        <div>
          <div className="t-meter-row"><span>Model</span><strong>{model.name}</strong></div>
          <div className="t-meter-row"><span>Input rate</span><strong>${model.inRate}/M</strong></div>
          <div className="t-meter-row"><span>Output rate</span><strong>${model.outRate}/M</strong></div>
          <div className="t-meter-row"><span>Balance</span><strong>$24.81</strong></div>
          <div className="t-meter-row"><span>Spent today</span><strong>${(cost + 0.42).toFixed(4)}</strong></div>
        </div>
      </div>
    </div>
  );
}

/* ============== GLASS HOVER TRACK ============== */
function useGlassHover() {
  return (e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - r.left}px`);
    el.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
}

/* ============== REVEAL ============== */
function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".t-reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => en.isIntersecting && en.target.classList.add("in"));
      },
      { threshold: 0.12 }
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);
}

/* ============== INDEX ============== */
function Index() {
  useReveal();
  const onMove = useGlassHover();
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="tally-root t-grain">
      <div className="t-orb a" />
      <div className="t-orb b" />
      <div className="t-orb c" />

      {/* NAV */}
      <nav className="t-nav">
        <div className="t-nav-inner">
          <div className="t-logo">
            <div className="t-logo-mark" />
            <span>Tally</span>
          </div>
          <div className="t-nav-links">
            <a href="#how">How it works</a>
            <a href="#models">Models</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </div>
          <a href="#waitlist" className="t-btn t-btn-ghost">Get early access</a>
        </div>
      </nav>

      {/* HERO */}
      <section className="t-hero">
        <div className="t-hero-inner">
          <div className="t-hero-grid">
            <div>
              <span className="t-eyebrow"><span className="dot" />Metered intelligence · v0.9 preview</span>
              <h1 className="t-h1">
                Pay only for<br />
                the tokens<br />
                <span className="grad">you actually draw.</span>
              </h1>
              <p className="t-lede">
                One balance, every major model — Claude, GPT, Gemini, DeepSeek.
                No subscription. No seat math. The meter only moves when you do.
              </p>
              <div className="t-cta-row">
                <a href="#waitlist" className="t-btn t-btn-primary">
                  Top up from $1 →
                </a>
                <a href="#how" className="t-btn t-btn-ghost">See the meter</a>
              </div>
              <div className="t-trust">
                <span>No card on file</span>
                <span>No expiry on credit</span>
                <span>Refunds, always</span>
              </div>
            </div>

            <div className="t-canvas-wrap">
              <div className="t-canvas-meta tl">
                <strong>TKN-STREAM</strong> · 1,800 particles
              </div>
              <div className="t-canvas-meta br">
                aurora.gate<br /><strong>v0.9.2</strong>
              </div>
              <HeroCanvas />
            </div>
          </div>
        </div>
      </section>

      {/* LIVE METER */}
      <section className="t-section" id="how">
        <div className="t-section-inner t-reveal">
          <div className="t-section-head">
            <div className="t-kicker">// 01 · The Meter</div>
            <h2 className="t-h2">A balance that breathes in real time.</h2>
            <p className="t-sub">
              Switch models on the fly. Tokens stream, cost ticks, balance updates —
              all from a single deposit. No bundles, no overages, no surprises.
            </p>
          </div>
          <div onMouseMove={onMove}>
            <LiveMeter />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="t-section">
        <div className="t-section-inner">
          <div className="t-section-head t-reveal">
            <div className="t-kicker">// 02 · How it works</div>
            <h2 className="t-h2">Three moves. Then it's just drawing.</h2>
          </div>
          <div className="t-feat-grid">
            {[
              { n: "STEP / 01", h: "Top up once", p: "From $1 to whatever you want. Stripe, Apple Pay, crypto. Credit never expires." },
              { n: "STEP / 02", h: "Pick a model", p: "Claude, GPT, Gemini, DeepSeek — all behind one API key, one dashboard, one balance." },
              { n: "STEP / 03", h: "Draw freely", p: "We meter every token at provider rates plus a flat 5% to keep the lights on. That's it." },
            ].map((f, i) => (
              <div key={i} className="t-glass t-feat t-reveal" onMouseMove={onMove}>
                <div className="t-feat-num">{f.n}</div>
                <h3>{f.h}</h3>
                <p>{f.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MODELS */}
      <section className="t-section" id="models">
        <div className="t-section-inner">
          <div className="t-section-head t-reveal">
            <div className="t-kicker">// 03 · Models</div>
            <h2 className="t-h2">Every major frontier model, one balance.</h2>
            <p className="t-sub">
              Provider rates passed through transparently. Switch mid-conversation. We handle the routing.
            </p>
          </div>
          <div className="t-models-strip">
            {MODELS.map((m, i) => (
              <div key={m.id} className="t-glass t-model-card t-reveal" style={{ transitionDelay: `${i * 60}ms` }} onMouseMove={onMove}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: m.color, marginBottom: 14, boxShadow: `0 0 20px ${m.color}80` }} />
                <div className="name">{m.name}</div>
                <div className="rate">{m.provider}</div>
                <div className="rate" style={{ marginTop: 12, color: "var(--t-text)" }}>
                  ${m.inRate} / ${m.outRate}<span style={{ color: "var(--t-muted)" }}> /M</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="t-section" id="pricing">
        <div className="t-section-inner">
          <div className="t-section-head t-reveal">
            <div className="t-kicker">// 04 · Pricing</div>
            <h2 className="t-h2">No tiers. No seats. Just credit.</h2>
            <p className="t-sub">Top up what you want. Use what you draw. Refunds — always.</p>
          </div>
          <div className="t-price-grid">
            {[
              { t: "Starter", a: "$5", note: "Try every model", li: ["~3M tokens on Sonnet", "All models unlocked", "Web + API access"] },
              { t: "Studio", a: "$50", featured: true, note: "Most popular", li: ["~33M tokens on Sonnet", "Priority routing", "Team workspace (3 seats)", "Usage analytics"] },
              { t: "Atelier", a: "$500+", note: "For heavy draw", li: ["Volume discount tiers", "Dedicated capacity", "SLA + invoicing", "Private routing rules"] },
            ].map((p, i) => (
              <div key={i} className={`t-glass t-price ${p.featured ? "featured" : ""} t-reveal`} onMouseMove={onMove}>
                {p.featured && <span className="t-pill">{p.note}</span>}
                <div style={{ marginTop: p.featured ? 14 : 0 }}>
                  <div style={{ fontFamily: "JetBrains Mono", fontSize: 12, color: "var(--t-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>{p.t}</div>
                  <div className="amount"><span className="grad">{p.a}</span></div>
                  <div style={{ color: "var(--t-muted)", fontSize: 13 }}>{p.featured ? "starting credit" : p.note}</div>
                </div>
                <ul>{p.li.map((l) => <li key={l}>{l}</li>)}</ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="t-section" id="faq">
        <div className="t-section-inner">
          <div className="t-section-head t-reveal">
            <div className="t-kicker">// 05 · FAQ</div>
            <h2 className="t-h2">Things people ask before they top up.</h2>
          </div>
          <div className="t-faq">
            {[
              { q: "Is this just a reseller markup?", a: "We pass provider rates through and add a flat 5% to cover infra and support. No hidden bundles, no inflated tiers. The meter shows you provider rate + our cut, separately." },
              { q: "What happens to unused credit?", a: "Nothing. It never expires. Withdraw it back to your card any time, minus the payment processor fee. Truly your money sitting with us." },
              { q: "Can I switch models in the same session?", a: "Yes. Same API key, same context window if the model supports it. Switch from Sonnet to Opus to GPT mid-conversation. We route, you draw." },
              { q: "What about rate limits?", a: "We pool capacity across providers. If one is throttled, we surface that in the dashboard and let you fall back to an alternative model with one click." },
              { q: "Do you train on my data?", a: "No. We don't store prompts beyond the active request, we don't train on anything, and we offer zero-retention routes for sensitive workloads." },
              { q: "Is there an SDK?", a: "OpenAI-compatible API on day one. Drop-in replacement for openai-node, anthropic-sdk, and most LangChain integrations." },
            ].map((f, i) => (
              <details key={i} className="t-glass">
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* WAITLIST */}
      <section className="t-section" id="waitlist">
        <div className="t-section-inner t-reveal">
          <div className="t-cta-box">
            <span className="t-eyebrow"><span className="dot" />Launching Q3 · 2026</span>
            <h2 className="t-h2" style={{ marginTop: 20 }}>
              The meter goes live<br />
              <span style={{ background: "var(--t-aurora)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                when you do.
              </span>
            </h2>
            <p className="t-sub" style={{ margin: "20px auto 0" }}>
              Join the early access list. First 1,000 get $10 of credit on the house.
            </p>
            <form
              className="t-form"
              onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
            >
              <input type="email" required placeholder="you@studio.com" disabled={submitted} />
              <button type="submit" className="t-btn t-btn-primary" disabled={submitted}>
                {submitted ? "On the list" : "Get early access"}
              </button>
            </form>
            {submitted && <span className="ok" style={{ color: "var(--t-mint)", display: "block", marginTop: 16, fontSize: 14 }}>✓ See you at launch.</span>}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="t-footer">
        <div className="t-footer-inner">
          <div className="t-logo">
            <div className="t-logo-mark" />
            <span>Tally</span>
          </div>
          <p className="disclaimer">
            Tally is an independent metered access service and is not affiliated with, endorsed by, or sponsored by
            Anthropic, OpenAI, DeepSeek, or Google. Model names are trademarks of their respective owners.
            Pricing is indicative and subject to change at launch.
          </p>
          <span className="mono">© 2026</span>
        </div>
      </footer>
    </div>
  );
}