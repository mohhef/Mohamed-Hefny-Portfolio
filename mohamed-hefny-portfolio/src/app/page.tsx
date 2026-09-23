import { MapViewer } from "@/components/MapViewer";
import { Calibration, Hero, KeyframeCard, Landmarks, LoopClosure, Publications, TrajectoryIntro } from "@/components/Sections";
import { profile } from "@/content/profile";
import { keyframes } from "@/content/timeline";

const person = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: profile.name,
  url: profile.site,
  jobTitle: "Software Engineer",
  worksFor: { "@type": "Organization", name: "Microsoft" },
  alumniOf: { "@type": "CollegeOrUniversity", name: "Concordia University" },
  affiliation: { "@type": "CollegeOrUniversity", name: "Simon Fraser University" },
  birthPlace: { "@type": "Place", name: "London, Ontario" },
  knowsAbout: ["Visual SLAM", "3D Gaussian splatting", "Cloud infrastructure", "Java", "Kotlin", "Python"],
  sameAs: profile.links.filter((l) => l.enabled !== false).map((l) => l.href),
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(person).replace(/</g, "\\u003c") }}
      />
      <a className="skip-link" href="/cv">
        Skip the 3D: plain-text CV
      </a>
      <MapViewer />
      <main className="content">
        <Hero />
        <Calibration />
        <TrajectoryIntro />
        {keyframes.map((kf, i) => (
          <KeyframeCard key={kf.id} kf={kf} index={i} />
        ))}
        <Landmarks />
        <Publications />
        <LoopClosure />
      </main>
    </>
  );
}
