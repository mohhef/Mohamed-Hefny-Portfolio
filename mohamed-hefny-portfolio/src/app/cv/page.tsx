import type { Metadata } from "next";
import Link from "next/link";
import { contactLinks, profile } from "@/content/profile";
import { formatRange, keyframes, origin } from "@/content/timeline";
import { projects } from "@/content/projects";
import { publications, scholarUrl } from "@/content/publications";
import styles from "./cv.module.css";

export const metadata: Metadata = {
  title: "CV",
  description: `Plain-text CV of ${profile.name}. ${profile.description}`,
  alternates: { canonical: "/cv" },
};

export default function CvPage() {
  const timeline = [...keyframes].reverse();
  return (
    <main className={styles.page}>
      <p className={styles.back}>
        <Link href="/">← Back to the map</Link>
      </p>

      <header className={styles.header}>
        <h1>{profile.name}</h1>
        <p className={styles.headline}>{profile.headline}</p>
        <ul className={styles.links}>
          {contactLinks.map((l) => (
            <li key={l.label}>
              <a href={l.href}>{l.handle}</a>
            </li>
          ))}
        </ul>
      </header>

      <section className={styles.section} aria-labelledby="cv-about">
        <h2 id="cv-about">About</h2>
        {profile.about.map((p) => (
          <p key={p.slice(0, 24)}>{p}</p>
        ))}
        <dl className={styles.facts}>
          {profile.calibration.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={styles.section} aria-labelledby="cv-experience">
        <h2 id="cv-experience">Experience &amp; education</h2>
        <ol className={styles.timeline}>
          {timeline.map((kf) => (
            <li key={kf.id}>
              <p className={styles.when}>
                {formatRange(kf)}
                {kf.place ? ` · ${kf.place}` : ""}
              </p>
              <h3>
                {kf.role}, <span>{kf.org}</span>
              </h3>
              <p>{kf.summary}</p>
              {kf.skills.length > 0 && <p className={styles.skills}>{kf.skills.join(" · ")}</p>}
            </li>
          ))}
          <li>
            <p className={styles.when}>Origin</p>
            <h3>
              Born in <span>{origin.place}</span>
            </h3>
          </li>
        </ol>
      </section>

      <section className={styles.section} aria-labelledby="cv-publications">
        <h2 id="cv-publications">Publications</h2>
        <ol className={styles.projects}>
          {publications.map((p) => (
            <li key={p.id}>
              <p className={styles.when}>{p.accepted ? p.venue : `${p.venue} · ${p.year}`}</p>
              <h3>
                <a href={p.links[0].href}>{p.title}</a>
              </h3>
              <p>
                {p.authors.map((a, i) => (
                  <span key={a}>
                    {a === profile.name ? <b>{a}</b> : a}
                    {i < p.authors.length - 1 ? ", " : ""}
                  </span>
                ))}
              </p>
            </li>
          ))}
        </ol>
        <p className={styles.also}>
          <a href={scholarUrl}>Google Scholar profile</a>
        </p>
      </section>

      <section className={styles.section} aria-labelledby="cv-projects">
        <h2 id="cv-projects">Projects</h2>
        <ul className={styles.projects}>
          {projects.map((p) => (
            <li key={p.id}>
              <h3>
                <a href={p.url}>{p.name}</a> <span className={styles.when}>{p.year}</span>
              </h3>
              <p>{p.summary}</p>
              <p className={styles.skills}>
                {p.stack.join(" · ")}
                {p.team ? ` · ${p.team}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
