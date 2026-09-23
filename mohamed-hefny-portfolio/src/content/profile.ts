export const profile = {
  name: "Mohamed Hefny",
  headline: "Software engineer at Microsoft. Graduate student at SFU, researching visual SLAM.",
  intro:
    "This page is a map of how I got here, reconstructed live in your browser. Scroll to move the camera.",
  description:
    "Mohamed Hefny is a software engineer at Microsoft and a graduate student at Simon Fraser University researching visual SLAM and 3D Gaussian splatting, previously at AWS (CloudFormation) and Morgan Stanley.",
  about: [
    "Most of my career has been on the layer other engineers build on: web services and APIs at Intact and Morgan Stanley, then AWS CloudFormation, the service teams use to define their infrastructure as code. Since February 2025 I've been at Microsoft.",
    "Alongside work I'm a graduate student at Simon Fraser University, graduating in fall 2026. My research is in visual SLAM and 3D Gaussian splatting: getting a single moving camera to work out where it is and what the world around it looks like. I'm especially interested in what happens when conditions turn bad, which is why this page has weather controls.",
    "I studied software engineering at Concordia University in Montreal and later completed Stanford's Machine Learning Specialization. I'm also a large-language-model enthusiast.",
  ],
  /** Rendered as an OpenCV-style calibration file. */
  calibration: [
    ["origin", "London, Ontario"],
    ["trained", "B.Eng. Software Engineering, Concordia"],
    ["studying", "Graduate student, SFU (fall 2025 – fall 2026)"],
    ["current", "Microsoft, since Feb 2025"],
    ["previous", "AWS CloudFormation · Morgan Stanley · Intact"],
    ["research", "visual SLAM · 3D Gaussian splatting"],
  ] as const,
  email: "mohhef@gmail.com",
  links: [
    { label: "GitHub", handle: "github.com/mohhef", href: "https://github.com/mohhef" },
    { label: "Scholar", handle: "Google Scholar", href: "https://scholar.google.com/citations?user=1x5bcncAAAAJ&hl=en" },
    // LinkedIn is hibernated for now; set `enabled: false` to hide it until it's back.
    { label: "LinkedIn", handle: "in/mohhef", href: "https://www.linkedin.com/in/mohhef", enabled: true },
  ],
  site: "https://www.mohhef.com",
  repo: "https://github.com/mohhef/Mohamed-Hefny-Portfolio",
};

export const contactLinks = [
  { label: "Email", handle: profile.email, href: `mailto:${profile.email}` },
  ...profile.links.filter((l) => l.enabled !== false),
];
