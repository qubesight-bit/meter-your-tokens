import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { supabase } from "@/integrations/supabase/client";
import toknLogo from "@/assets/tokn-logo.png";
import "../styles/tokn.css";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tokn.lat — Pay-as-you-draw access to every AI" },
      { name: "description", content: "One balance, every major model. No subscription. The meter only moves when you do." },
      { property: "og:title", content: "Tokn.lat — Pay-as-you-draw access to every AI" },
      { property: "og:description", content: "Top up once. Draw on Claude, GPT, DeepSeek and Gemini from a single balance, billed by the token." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

type Model = {
  id: string;
  name: string;
  provider: string;
  color: string;
  kind: "text" | "voice";
  // text models
  inRate?: number;
  outRate?: number;
  // voice models: $ per 1,000 characters synthesised
  charRate?: number;
};
const MODELS: Model[] = [
  { id: "opus", name: "Claude Opus 4.8", provider: "Anthropic", inRate: 5, outRate: 25, color: "#A78BFA", kind: "text" },
  { id: "gpt", name: "GPT-5.2", provider: "OpenAI", inRate: 1.75, outRate: 14, color: "#4ADE80", kind: "text" },
  { id: "sonnet", name: "Claude Sonnet 4.6", provider: "Anthropic", inRate: 3, outRate: 15, color: "#67E8F9", kind: "text" },
  { id: "gemini", name: "Gemini 2.5 Ultra", provider: "Google", inRate: 1.25, outRate: 10, color: "#F472B6", kind: "text" },
  { id: "ds", name: "DeepSeek V3.2", provider: "DeepSeek", inRate: 0.14, outRate: 0.28, color: "#FBBF24", kind: "text" },
  { id: "11labs", name: "ElevenLabs Multilingual v2", provider: "ElevenLabs · Voice", color: "#F0ABFC", kind: "voice", charRate: 0.18 },
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
      if (model.kind === "voice") {
        // characters streamed at ~220 chars/sec (typical TTS pace)
        const cps = 220;
        setTokens((t) => t + dt * cps);
        setCost((c) => c + (dt * cps * (model.charRate ?? 0)) / 1000);
      } else {
        setTokens((t) => t + dt * 380);
        setCost((c) => c + dt * 380 * (((model.inRate ?? 0) * 0.6 + (model.outRate ?? 0) * 0.4) / 1_000_000));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [modelId]);

  const isVoice = model.kind === "voice";
  const unitLabel = isVoice ? "characters spoken" : "tokens streamed";

  return (
    <div className="t-glass">
      <div className="t-model-tabs">
        {[...MODELS.slice(0, 3), MODELS.find((m) => m.id === "11labs")!].map((m) => (
          <button
            key={m.id}
            className={`t-model-tab ${m.id === modelId ? "active" : ""}`}
            onClick={() => setModelId(m.id)}
          >
            {m.kind === "voice" ? `🔊 ${m.name}` : m.name}
          </button>
        ))}
      </div>

      <div className="t-meter-grid" style={{ marginTop: 8 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <span className="t-pill">● Live</span>
            <span className="mono" style={{ fontSize: 11, color: "var(--t-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {isVoice ? "Voice draw" : "Session draw"}
            </span>
          </div>
          <div className="t-meter-display">
            ${cost.toFixed(4)}
          </div>
          <div className="mono" style={{ marginTop: 12, color: "var(--t-muted)", fontSize: 13 }}>
            {Math.floor(tokens).toLocaleString()} {unitLabel}
          </div>
        </div>

        <div>
          <div className="t-meter-row"><span>Model</span><strong>{model.name}</strong></div>
          {isVoice ? (
            <>
              <div className="t-meter-row"><span>Rate</span><strong>${model.charRate}/1k chars</strong></div>
              <div className="t-meter-row"><span>~ per minute</span><strong>${(((model.charRate ?? 0) * 220 * 60) / 1000).toFixed(3)}</strong></div>
            </>
          ) : (
            <>
              <div className="t-meter-row"><span>Input rate</span><strong>${model.inRate}/M</strong></div>
              <div className="t-meter-row"><span>Output rate</span><strong>${model.outRate}/M</strong></div>
            </>
          )}
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
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [preference, setPreference] = useState<"text" | "voice" | "both">("both");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const { error: err } = await supabase
      .from("waitlist_signups")
      .insert({
        email: email.trim().toLowerCase(),
        whatsapp: whatsapp.trim() || null,
        preference,
      });
    setSubmitting(false);
    if (err) {
      if (err.code === "23505" || err.message.toLowerCase().includes("duplicate")) {
        setError("That email is already on the list.");
      } else {
        setError(err.message || "Couldn't save your signup. Try again in a moment.");
      }
      return;
    }
    setSubmitted(true);
  }

  return (
    <div className="tokn-root t-grain">
      <div className="t-orb a" />
      <div className="t-orb b" />
      <div className="t-orb c" />

      {/* NAV */}
      <nav className="t-nav">
        <div className="t-nav-inner">
          <div className="t-logo">
            <img src={toknLogo} alt="Tokn.lat logo" width={28} height={28} className="t-logo-mark" />
            <span>Tokn.lat</span>
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
              <span className="t-eyebrow"><span className="dot" />Private preview · v0.9.2</span>
              <h1 className="t-h1">
                Pay only for<br />
                the tokens<br />
                <span className="grad">you actually draw.</span>
              </h1>
              <p className="t-lede">
                One balance for text <em>and</em> voice — Claude, GPT, Gemini, DeepSeek and ElevenLabs.
                Not just chatbots. No subscription, no seat math. The meter only moves when you do.
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
              <HeroCanvas />
            </div>
          </div>
        </div>
      </section>

      {/* LIVE METER */}
      <section className="t-section" id="how">
        <div className="t-section-inner t-reveal">
          <div className="t-section-head">
            <div className="t-kicker">The meter</div>
            <h2 className="t-h2">Watch the bill tick, token by token.</h2>
            <p className="t-sub">
              Pick a model. Every input and output token is priced at the provider's published rate and
              subtracted from your balance the moment it streams. Switch models without touching billing.
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
            <div className="t-kicker">How it works</div>
            <h2 className="t-h2">Three steps. Then you're just calling models.</h2>
          </div>
          <div className="t-feat-grid">
            {[
              { n: "Step 1", h: "Top up your balance", p: "Add credit from $1 with Stripe, Apple Pay or USDC. It sits in your account until you spend it — no expiry, withdrawable anytime." },
              { n: "Step 2", h: "Get one API key", p: "An OpenAI-compatible endpoint that routes to Claude, GPT, Gemini and DeepSeek. Point your existing SDK at it; nothing else changes." },
              { n: "Step 3", h: "Call the models", p: "Each request is billed at the provider's published per-token rate plus a flat 5% routing fee. Both numbers show up on the invoice line." },
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
            <div className="t-kicker">Models</div>
            <h2 className="t-h2">Six frontier models — text and voice — on one balance.</h2>
            <p className="t-sub">
              Text models bill per million input / output tokens; voice bills per character spoken.
              Rates below are each provider's own published price — add 5% at checkout.
            </p>
          </div>
          <div className="t-models-strip">
            {MODELS.map((m, i) => (
              <div key={m.id} className="t-glass t-model-card t-reveal" style={{ transitionDelay: `${i * 60}ms` }} onMouseMove={onMove}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: m.color, marginBottom: 14 }} />
                <div className="name">{m.name}</div>
                <div className="rate">{m.provider}</div>
                {m.kind === "voice" ? (
                  <>
                    <div className="rate" style={{ marginTop: 12, color: "var(--t-text)" }}>
                      ${m.charRate} <span style={{ color: "var(--t-muted)" }}>/ 1k characters</span>
                    </div>
                    <div className="rate" style={{ marginTop: 6, color: "var(--t-muted)", fontSize: 12 }}>
                      Text-to-speech for narration, dubbing, product voices.
                    </div>
                  </>
                ) : (
                  <div className="rate" style={{ marginTop: 12, color: "var(--t-text)" }}>
                    ${m.inRate} in · ${m.outRate} out<span style={{ color: "var(--t-muted)" }}> / 1M tok</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="t-section" id="pricing">
        <div className="t-section-inner">
          <div className="t-section-head t-reveal">
            <div className="t-kicker">Pricing</div>
            <h2 className="t-h2">No plans. No seats. Just prepaid credit.</h2>
            <p className="t-sub">Pick a top-up size below — or any custom amount. Withdraw the unused balance whenever.</p>
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
            <div className="t-kicker">FAQ</div>
            <h2 className="t-h2">Questions we get before the first top-up.</h2>
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
            <span className="t-eyebrow"><span className="dot" />Opening to early accounts · Q3 2026</span>
            <h2 className="t-h2" style={{ marginTop: 20 }}>
              The meter goes live<br />
              <span style={{ background: "var(--t-aurora)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
                when you do.
              </span>
            </h2>
            <p className="t-sub" style={{ margin: "20px auto 0" }}>
              Leave your email and we'll let you know the day the meter goes live — no spam. The first 1,000 accounts start with $10 of credit pre-loaded.
            </p>
            <form className="t-form" onSubmit={handleSubmit} style={{ flexDirection: "column", gap: 12, alignItems: "stretch", maxWidth: 520 }}>
              <input
                type="email"
                required
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitted || submitting}
                style={{ width: "100%" }}
              />
              <input
                type="tel"
                placeholder="+52 55 1234 5678"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                disabled={submitted || submitting}
                aria-label="WhatsApp (optional)"
                style={{ width: "100%", fontSize: 13, padding: "10px 14px", opacity: 0.85 }}
              />
              <div style={{ fontSize: 11, color: "var(--t-muted)", textAlign: "left", marginTop: -4, letterSpacing: "0.02em" }}>
                WhatsApp (optional) — we'll ping you first if early access opens.
              </div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 4, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: "var(--t-muted)", alignSelf: "center", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  I'd use it for
                </span>
                {([
                  { v: "text", l: "Text" },
                  { v: "voice", l: "Voice" },
                  { v: "both", l: "Both" },
                ] as const).map((opt) => (
                  <button
                    key={opt.v}
                    type="button"
                    className={`t-model-tab ${preference === opt.v ? "active" : ""}`}
                    onClick={() => setPreference(opt.v)}
                    disabled={submitted || submitting}
                    style={{ fontSize: 12, padding: "6px 12px" }}
                  >
                    {opt.l}
                  </button>
                ))}
              </div>
              <button type="submit" className="t-btn t-btn-primary" disabled={submitted || submitting} style={{ marginTop: 6 }}>
                {submitted ? "You're on the list" : submitting ? "Saving…" : "Get early access"}
              </button>
            </form>
            {submitted && (
              <span className="ok" style={{ color: "var(--t-mint)", display: "block", marginTop: 16, fontSize: 14 }}>
                Done — we'll let you know at launch.
              </span>
            )}
            {error && (
              <span style={{ color: "#F87171", display: "block", marginTop: 16, fontSize: 14 }}>
                {error}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="t-footer">
        <div className="t-footer-inner">
          <div className="t-logo">
            <img src={toknLogo} alt="Tokn.lat logo" width={28} height={28} className="t-logo-mark" />
            <span>Tokn.lat</span>
          </div>
          <p className="disclaimer">
            Tokn.lat is an independent metered access service and is not affiliated with, endorsed by, or sponsored by
            Anthropic, OpenAI, DeepSeek, or Google. Model names are trademarks of their respective owners.
            Pricing is indicative and subject to change at launch.
          </p>
          <span className="mono">© 2026</span>
        </div>
      </footer>
    </div>
  );
}