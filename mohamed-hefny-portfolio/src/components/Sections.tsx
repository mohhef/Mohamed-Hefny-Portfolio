import { contactLinks, profile } from "@/content/profile";
import { formatRange, keyframes, type Keyframe } from "@/content/timeline";
import { projects } from "@/content/projects";
import { publications, scholarUrl } from "@/content/publications";
import { MapStats, TrainingReadout } from "./LiveReadouts";

const NUMBER_WORDS = ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"];

const pad = (n: number) => String(n).padStart(2, "0");

export function Hero() {
  return (
    <section className="shot shot--hero" id="top" data-shot="hero" data-nav="top">
      <div className="hero">
        <h1 className="hero-name">
          Mohamed <span>Hefny</span>
        </h1>
        <p className="hero-headline">{profile.headline}</p>
        <p className="hero-intro">{profile.intro}</p>
        <TrainingReadout />
        <a className="scroll-cue" href="#calibration">
          <span className="scroll-cue-line" aria-hidden="true" />
          Start tracking
        </a>
      </div>
    </section>
  );
}

export function Calibration() {
  return (
    <section className="shot" id="calibration" data-shot="calibration" data-nav="calibration" aria-labelledby="calibration-title">
      <div className="panel panel--wide">
        <p className="eyebrow">
          <span className="eyebrow-index">01</span> Calibration
        </p>
        <h2 id="calibration-title">About the camera.</h2>
        <p className="lead">Before a SLAM system trusts anything it sees, it calibrates the camera. These are my intrinsics.</p>
        {profile.about.map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
        <figure className="calib">
          <figcaption>calib/mohamed-hefny.yaml</figcaption>
          <pre>
            <code>
              <span className="calib-comment">%YAML:1.0</span>
              {"\n"}
              {profile.calibration.map(([k, v]) => (
                <span key={k} className="calib-row">
                  <span className="calib-key">{k}:</span> <span className="calib-value">{v}</span>
                  {"\n"}
                </span>
              ))}
              <span className="calib-comment"># rms reprojection error: 0.21 px</span>
            </code>
          </pre>
        </figure>
      </div>
    </section>
  );
}

function Legend() {
  return (
    <ul className="legend" aria-label="How to read the map">
      <li>
        <svg viewBox="0 0 24 16" aria-hidden="true" className="legend-kf">
          <path d="M2 8 20 2v12Z M20 2v12" />
        </svg>
        Keyframe: a place I stopped
      </li>
      <li>
        <svg viewBox="0 0 24 16" aria-hidden="true" className="legend-cam">
          <path d="M2 8 20 2v12Z M20 2v12" />
        </svg>
        The camera: where you are now
      </li>
      <li>
        <svg viewBox="0 0 24 16" aria-hidden="true" className="legend-track">
          <circle cx="6" cy="6" r="1.6" />
          <circle cx="12" cy="10" r="1.6" />
          <circle cx="18" cy="5" r="1.6" />
        </svg>
        Tracked points: what the camera sees
      </li>
      <li>
        <svg viewBox="0 0 24 16" aria-hidden="true" className="legend-covis">
          <path d="M3 12 12 4l9 8" />
        </svg>
        Covisibility: keyframes sharing a skill
      </li>
    </ul>
  );
}

export function TrajectoryIntro() {
  const count = keyframes.length;
  return (
    <section className="shot" id="trajectory" data-shot="trajectory" data-nav="trajectory" aria-labelledby="trajectory-title">
      <div className="panel">
        <p className="eyebrow">
          <span className="eyebrow-index">02</span> Trajectory
        </p>
        <h2 id="trajectory-title">{NUMBER_WORDS[count] ?? count} keyframes, one trajectory.</h2>
        <p className="lead">
          Each keyframe is somewhere I stayed long enough to build something. As you scroll, the camera drives the loop,
          inserts keyframes and triangulates what it sees.
        </p>
        <p>
          Green edges link keyframes that share a skill, the way a SLAM system links frames that observe the same landmarks.
          Hover a skill to light up its edges.
        </p>
        <Legend />
      </div>
    </section>
  );
}

export function KeyframeCard({ kf, index }: { kf: Keyframe; index: number }) {
  return (
    <article className="shot shot--kf" id={`kf-${kf.id}`} data-shot={`kf:${kf.id}`} data-nav="trajectory" aria-labelledby={`kf-${kf.id}-title`}>
      <div className="panel">
        <p className="kf-meta">
          <span className="kf-badge" data-kind={kf.kind}>
            KF {pad(index + 1)}
          </span>
          <span>{formatRange(kf)}</span>
          {kf.place && <span>{kf.place}</span>}
        </p>
        <h3 id={`kf-${kf.id}-title`}>{kf.role}</h3>
        <p className="kf-org">
          {kf.url ? (
            <a href={kf.url} target="_blank" rel="noreferrer">
              {kf.org}
              <span className="ext" aria-hidden="true">
                ↗
              </span>
            </a>
          ) : (
            kf.org
          )}
        </p>
        <p className="kf-summary">{kf.summary}</p>
        {kf.skills.length > 0 && (
          <ul className="skills" aria-label="Skills">
            {kf.skills.map((s) => (
              <li key={s} className="skill" data-skill={s} tabIndex={0}>
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}

export function Landmarks() {
  return (
    <section className="shot shot--landmarks" id="landmarks" data-shot="landmarks" data-nav="landmarks" aria-labelledby="landmarks-title">
      <div className="panel panel--wide">
        <p className="eyebrow">
          <span className="eyebrow-index">03</span> Landmarks
        </p>
        <h2 id="landmarks-title">Things I built along the way.</h2>
        <p className="lead">
          Every map needs landmarks. These are projects from my own repositories, each reconstructed as a small sculpture
          inside the loop, next to the keyframe it belongs to.
        </p>
        <ul className="projects">
          {projects.map((p) => (
            <li key={p.id}>
              <a className="project" href={p.url} target="_blank" rel="noreferrer" data-landmark={p.id}>
                <span className="project-head">
                  <span className="project-name">{p.name}</span>
                  <span className="project-year">{p.year}</span>
                </span>
                <span className="project-summary">{p.summary}</span>
                <span className="project-stack">
                  {p.stack.join(" · ")}
                  {p.team ? ` · ${p.team}` : ""}
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Publications() {
  return (
    <section className="shot" id="publications" data-shot="publications" data-nav="publications" aria-labelledby="publications-title">
      <div className="panel panel--wide">
        <p className="eyebrow">
          <span className="eyebrow-index">04</span> Publications
        </p>
        <h2 id="publications-title">Published maps.</h2>
        <p className="lead">
          A map is only useful once someone else can build on it. These come out of my graduate research at SFU.
        </p>
        <ol className="pubs">
          {publications.map((p) => (
            <li key={p.id} className="pub">
              <p className="pub-meta">
                <span className={p.accepted ? "pub-venue is-accepted" : "pub-venue"}>{p.venue}</span>
                {!p.accepted && <span>{p.year}</span>}
              </p>
              <h3 className="pub-title">{p.title}</h3>
              <p className="pub-authors">
                {p.authors.map((a, i) => (
                  <span key={a}>
                    {a === profile.name ? <b>{a}</b> : a}
                    {i < p.authors.length - 1 ? ", " : ""}
                  </span>
                ))}
              </p>
              <p className="pub-summary">{p.summary}</p>
              <p className="pub-links">
                {p.links.map((l) => (
                  <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
                    {l.label}
                    <span className="ext" aria-hidden="true">
                      ↗
                    </span>
                  </a>
                ))}
              </p>
            </li>
          ))}
        </ol>
        <p className="pub-scholar">
          <a href={scholarUrl} target="_blank" rel="noreferrer">
            All publications on Google Scholar
            <span className="ext" aria-hidden="true">
              ↗
            </span>
          </a>
        </p>
      </div>
    </section>
  );
}

export function LoopClosure() {
  return (
    <section className="shot shot--loop" id="contact" data-shot="loop" data-nav="contact" aria-labelledby="contact-title">
      <div className="panel">
        <p className="eyebrow">
          <span className="eyebrow-index">05</span> Loop closure · Contact
        </p>
        <h2 id="contact-title">Close the loop.</h2>
        <p className="lead">
          Every trajectory drifts until it recognises somewhere it has been before. This one ends where it started, so
          this is the place to say hello.
        </p>
        <ul className="contact">
          {contactLinks.map((l) => (
            <li key={l.label}>
              <a href={l.href} {...(l.href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}>
                <span className="contact-label">{l.label}</span>
                <span className="contact-handle">{l.handle}</span>
                <span className="contact-arrow" aria-hidden="true">
                  →
                </span>
              </a>
            </li>
          ))}
        </ul>
        <MapStats />
        <p className="colophon">
          Built with Next.js and three.js: Gaussian splats, point clouds and a pose graph, all rendered in your browser.
        </p>
      </div>
    </section>
  );
}
