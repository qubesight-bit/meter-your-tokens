import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import "../styles/tally.css";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Tally: pay for what you draw" },
      { name: "description", content: "One balance, every major AI model. No subscription. The meter only moves when you do." },
      { property: "og:title", content: "Tally: pay for what you draw" },
      { property: "og:description", content: "Top up once and draw on Claude, GPT, or DeepSeek from a single balance, billed by the token as you go." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Index,
});

type Model = { id: string; name: string; inRate: number; outRate: number; label: string };
const MODELS: Model[] = [
  { id: "opus", name: "Claude Opus 4.8", inRate: 5, outRate: 25, label: "$5/$25" },
  { id: "sonnet", name: "Claude Sonnet 4.6", inRate: 3, outRate: 15, label: "$3/$15" },
  { id: "haiku", name: "Claude Haiku 4.5", inRate: 1, outRate: 5, label: "$1/$5" },
  { id: "gpt", name: "GPT-5.2", inRate: 1.75, outRate: 14, label: "$1.75/$14" },
  { id: "ds", name: "DeepSeek", inRate: 0.14, outRate: 0.28, label: "$0.14/$0.28" },
];

function WaitlistForm({ cta, note, done }: { cta: string; note: string; done: string }) {
  const [submitted, setSubmitted] = useState(false);
  return (
    <form
      className={`capture${submitted ? " done" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
    >
      <label htmlFor={cta} className="sr-only">Email address</label>
      <input id={cta} type="email" required placeholder="you@email.com" />
      <button type="submit" className="btn">{cta}</button>
      <small>{note}</small>
      <span className="ok">✓ {done}</span>
    </form>
  );
}

function Meter() {
  const [modelId, setModelId] = useState("sonnet");
  const [tokens, setTokens] = useState(0);
  const [cost, setCost] = useState(0);
  const model = MODELS.find((m) => m.id === modelId)!;
  const ref = useRef<number | null>(null);

  useEffect(() => {
    let last = performance.now();
    const tick = (t: number) => {
      const dt = (t - last) / 1000;
      last = t;
      const tps = 38;
      const add = tps * dt;
      setTokens((x) => x + add);
      setCost((c) => c + (add * 0.7 * model.inRate + add * 0.3 * model.outRate) / 1_000_000);
      ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => {
      if (ref.current) cancelAnimationFrame(ref.current);
    };
  }, [model]);

  return (
    <div className="meter">
      <div className="meter-top">
        <span className="lbl">Session meter</span>
        <span className="live-tag"><span className="blip" />LIVE DEMO</span>
      </div>
      <div className="readout"><span className="cur">$</span>{cost.toFixed(4)}</div>
      <div className="sub-read"><b>{Math.floor(tokens).toLocaleString()}</b> tokens drawn · {model.name}</div>
      <div className="flow"><span /></div>
      <div className="chips">
        {MODELS.map((m) => (
          <button
            key={m.id}
            className="chip"
            aria-pressed={m.id === modelId}
            onClick={() => { setModelId(m.id); setTokens(0); setCost(0); }}
            type="button"
          >
            {m.name} <span className="rate">{m.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Index() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("in")),
      { threshold: 0.12 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="tally-root">
      <nav>
        <div className="wrap nav-in">
          <a href="#" className="brand"><span className="dot" />Tally</a>
          <div className="nav-links">
            <a href="#how">How it works</a>
            <a href="#models">Models</a>
            <a href="#safe">Why it's safe</a>
            <a href="#pricing">Pricing</a>
            <a href="#cta" className="nav-cta">Get early access</a>
          </div>
        </div>
      </nav>

      <header className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">Metered AI access</span>
            <h1>Pay for what <span className="draw">you draw.</span></h1>
            <p className="lead">One balance covers Claude, GPT, and DeepSeek, billed by the token as you go. The meter moves only when you do.</p>
            <WaitlistForm cta="Get early access" note="Top up from $1. We'll email you at launch, nothing else." done="You're on the list. We'll be in touch at launch." />
          </div>
          <Meter />
        </div>
      </header>

      <section className="block" id="why">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow">The subscription math</span>
            <h2>Flat plans bill you for the buffet. You ate a sandwich.</h2>
            <p>Subscriptions are priced for the heaviest users. If you write one report, translate one doc, or fix one bug this week, you paid for a month and used an afternoon.</p>
          </div>
          <div className="contrast reveal">
            <div className="card bad">
              <span className="tag">Subscription</span>
              <h3>$20 every month, used or not</h3>
              <ul>
                <li><b>Unused allowance evaporates:</b>&nbsp;it doesn't roll over</li>
                <li><b>Hit the limit mid-task:</b>&nbsp;wait until tomorrow</li>
                <li><b>Locked to one provider:</b>&nbsp;one login, one model family</li>
                <li><b>Forgot to cancel:</b>&nbsp;billed again anyway</li>
              </ul>
            </div>
            <div className="card good">
              <span className="tag">Tally</span>
              <h3>A balance that only moves when you use it</h3>
              <ul>
                <li><b>Pay per token:</b>&nbsp;billed on actual usage, to 1/100th of a cent</li>
                <li><b>Never expires:</b>&nbsp;top up once, use it whenever</li>
                <li><b>Every model, one balance:</b>&nbsp;switch mid-task</li>
                <li><b>No plan to forget:</b>&nbsp;there's nothing recurring</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="block" id="how">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow">How it works</span>
            <h2>Three steps. No setup.</h2>
            <p>Top up, pick a model, go. The meter does the accounting.</p>
          </div>
          <div className="steps reveal">
            <div className="step">
              <div className="num">💳</div>
              <h3>Top up credit</h3>
              <p>From $1. No monthly fee, no minimum commitment. Your balance is yours until you spend it.</p>
              <div className="meta">balance: $1.00 → ∞ days</div>
            </div>
            <div className="step">
              <div className="num">🔀</div>
              <h3>Pick any model</h3>
              <p>Claude, GPT, or DeepSeek from the same balance. Switch between them mid-task and your context carries over.</p>
              <div className="meta">claude · gpt · deepseek</div>
            </div>
            <div className="step">
              <div className="num">🧾</div>
              <h3>Pay per token</h3>
              <p>You're charged on the tokens you actually send and receive, shown live and settled on real usage, not an estimate.</p>
              <div className="meta">charged: $0.0175</div>
            </div>
          </div>
        </div>
      </section>

      <section className="block" id="safe">
        <div className="wrap">
          <div className="trust reveal">
            <div className="trust-in">
              <div>
                <span className="eyebrow">Why it's safe</span>
                <h2>No borrowed accounts. Nothing to get banned.</h2>
                <p>Some "token marketplaces" route your prompt through a stranger's logged-in AI account. That breaks every provider's terms of service, and it's the seller whose personal account gets suspended when the fraud systems notice.</p>
                <p>Tally doesn't touch anyone's login. We hold the commercial accounts with each provider, and you're our customer. Your usage runs on licensed access, metered and billed cleanly. There's simply nothing on the line to get banned.</p>
              </div>
              <div className="checklist">
                <div>We're the paying customer of each AI provider, not a key reseller</div>
                <div>Your prompts run on licensed commercial access</div>
                <div>No "borrow a stranger's subscription" mechanics</div>
                <div>Clean metering: every token logged, every charge auditable</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="block" id="models">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow">One balance, many models</span>
            <h2>Use the right model for the job, not the one you're locked into.</h2>
            <p>Need top-tier reasoning? Reach for Opus. Bulk drafting on a budget? Drop to Haiku or DeepSeek. Same balance, you choose per task.</p>
          </div>
          <div className="who reveal">
            <div className="card"><div className="ic">🧠</div><h3>Heavy reasoning</h3><p>Claude Opus 4.8 for the hard problems: long-horizon work, tricky code, careful analysis.</p></div>
            <div className="card"><div className="ic">⚖️</div><h3>Everyday work</h3><p>Claude Sonnet 4.6 and GPT for the best balance of speed, quality, and cost.</p></div>
            <div className="card"><div className="ic">⚡</div><h3>High volume, low cost</h3><p>Haiku and DeepSeek when you're processing a lot and every fraction of a cent counts.</p></div>
          </div>
        </div>
      </section>

      <section className="block" id="pricing">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow">Pricing</span>
            <h2>Top up what you want. Spend it however.</h2>
            <p>Credit works the same no matter how much you add. These are just convenient starting amounts.</p>
          </div>
          <div className="prices reveal">
            <div className="price">
              <div className="amt"><span className="c">$</span>1</div>
              <div className="toks">~200K tokens</div>
              <p>A quick one-off: a report, a translation, a handful of questions.</p>
            </div>
            <div className="price feat">
              <span className="pop">Most picked</span>
              <div className="amt"><span className="c">$</span>5</div>
              <div className="toks">~1M tokens</div>
              <p>A real work session: long docs, code review, back-and-forth across models.</p>
            </div>
            <div className="price">
              <div className="amt"><span className="c">$</span>15</div>
              <div className="toks">~4M tokens</div>
              <p>Extended projects. Still far below a monthly subscription you'd half-use.</p>
            </div>
          </div>
          <div className="price-note">⚠ Token estimates are indicative and vary by model and prompt length. Final rates confirmed at launch.</div>
        </div>
      </section>

      <section className="block" id="audience">
        <div className="wrap">
          <div className="sec-head reveal">
            <span className="eyebrow">Who it's for</span>
            <h2>Built for everyone a flat plan overcharges.</h2>
          </div>
          <div className="who reveal">
            <div className="card"><div className="ic">🎯</div><h3>One-time users</h3><p>You need AI for a single task this month. A $20 plan is absurd for that. Start at $1.</p></div>
            <div className="card"><div className="ic">📊</div><h3>Light users</h3><p>You use AI a few times a week. Free tiers cramp you; full plans waste you. Pay for the few times you do.</p></div>
            <div className="card"><div className="ic">🛠️</div><h3>Builders & tinkerers</h3><p>You want one balance across providers and the freedom to route each call to the cheapest model that works.</p></div>
          </div>
        </div>
      </section>

      <section className="final" id="cta">
        <div className="wrap">
          <span className="eyebrow">Early access</span>
          <h2>Stop renting the buffet.</h2>
          <p>Join the waitlist and get 10% bonus credit on your first top-up at launch.</p>
          <WaitlistForm cta="Join the waitlist" note="No spam. One email at launch, that's it." done="You're on the list. See you at launch." />
        </div>
      </section>

      <footer>
        <div className="wrap foot-in">
          <div className="brand"><span className="dot" />Tally</div>
          <div>
            <a href="#how">How it works</a>
            <a href="#safe">Why it's safe</a>
            <a href="#pricing">Pricing</a>
          </div>
        </div>
        <div className="wrap"><p className="disclaimer">Tally is an independent metered access service and is not affiliated with, endorsed by, or sponsored by Anthropic, OpenAI, DeepSeek, or Google. Model names are trademarks of their respective owners. Pricing and token estimates are indicative and subject to change at launch.</p></div>
      </footer>
    </div>
  );
}
