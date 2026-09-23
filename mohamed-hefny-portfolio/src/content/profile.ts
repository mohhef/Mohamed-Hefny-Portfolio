export const profile = {
  name: "Mohamed Hefny",
  headline: "Software engineer at Microsoft. Graduate student at SFU, researching visual SLAM.",
  intro:
    "This page is a map of how I got here, reconstructed live in your browser. Scroll to move the camera.",
  description:
    "Mohamed Hefny is a software engineer at Microsoft and a graduate student at Simon Fraser University researching visual SLAM and 3D Gaussian splatting, previously at AWS (CloudFormation) and Morgan Stanley.",
  about: [
    "I'm a software engineer at Microsoft and a graduate student at Simon Fraser University, finishing in fall 2026. At SFU I research visual SLAM and 3D Gaussian splatting: helping a single moving camera work out where it is while it rebuilds the world around it in 3D.",
    "Before Microsoft I built backend services and APIs at Intact and Morgan Stanley, then worked on AWS CloudFormation, Amazon's infrastructure-as-code service. I studied software engineering at Concordia University in Montreal.",
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
    // Set `enabled: false` to hide LinkedIn.
    {
      label: "LinkedIn",
      handle: "in/mohamed-hefny",
      href: "https://www.linkedin.com/in/mohamed-hefny-5617b994/",
      enabled: true,
    },
  ],
  site: "https://www.mohhef.com",
  repo: "https://github.com/mohhef/Mohamed-Hefny-Portfolio",
};

export const contactLinks = [
  { label: "Email", handle: profile.email, href: `mailto:${profile.email}` },
  ...profile.links.filter((l) => l.enabled !== false),
];
