/** Papers, newest research first. Summaries are paraphrased from the abstracts. */

export interface Publication {
  id: string;
  title: string;
  authors: string[];
  venue: string;
  /** Peer-reviewed venue (rendered as a badge) vs. a preprint. */
  accepted: boolean;
  year: number;
  summary: string;
  links: Array<{ label: string; href: string }>;
}

export const scholarUrl = "https://scholar.google.com/citations?user=1x5bcncAAAAJ&hl=en";

export const publications: Publication[] = [
  {
    id: "slam-adversarial-lab",
    title: "SLAM Adversarial Lab: An Extensible Framework for Visual SLAM Robustness Evaluation under Adverse Conditions",
    authors: ["Mohamed Hefny", "Karthik Dantu", "Steven Y. Ko"],
    venue: "IROS 2026",
    accepted: true,
    year: 2026,
    summary:
      "Turns existing SLAM datasets into adverse ones (fog, rain, camera and video-transport faults) at severities in real-world units, and searches for the severity at which each SLAM system fails.",
    links: [
      { label: "arXiv", href: "https://arxiv.org/abs/2603.17165" },
      { label: "Code", href: "https://github.com/sfu-rsl/SLAMAdversarialLab" },
    ],
  },
  {
    id: "slam-squeeze-bench",
    title: "SLAMSqueezeBench: Comparing SLAM Systems under Resource Constraints",
    authors: ["Mohamed Hefny", "Karthik Dantu", "Steven Y. Ko"],
    venue: "arXiv preprint",
    accepted: false,
    year: 2026,
    summary:
      "Benchmarks SLAM the way it actually runs on edge hardware: capped compute and memory, competing workloads and camera frame drops, across nine classical, learning-based and Gaussian-splatting systems.",
    links: [{ label: "arXiv", href: "https://arxiv.org/abs/2609.19533" }],
  },
  {
    id: "power-law-dp",
    title: "Estimating Power-Law Exponent with Edge Differential Privacy",
    authors: ["Adam Tan", "Mohamed Hefny", "Keval Vora"],
    venue: "SecureDB @ SIGMOD 2026",
    accepted: true,
    year: 2026,
    summary:
      "Estimates a graph's power-law exponent under edge differential privacy by privatizing only the sufficient statistics, in both centralized and local models.",
    links: [{ label: "arXiv", href: "https://arxiv.org/abs/2604.20274" }],
  },
];
