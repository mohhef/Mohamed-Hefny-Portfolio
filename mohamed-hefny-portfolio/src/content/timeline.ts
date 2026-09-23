/**
 * The career trajectory. This file replaces the old MongoDB timeline: edit it
 * and redeploy. Entries are rendered in array order as keyframes along the
 * camera path, so keep them chronological by start date.
 *
 * Anything listed in `approx` is an estimate that still needs confirming.
 * Estimated dates are shown as years only, so a wrong month never ships.
 */

export type KeyframeKind = "education" | "work" | "research";

export interface Keyframe {
  id: string;
  kind: KeyframeKind;
  role: string;
  org: string;
  place?: string;
  url?: string;
  /** "YYYY-MM" */
  start: string;
  /** "YYYY-MM"; omit while ongoing. */
  end?: string;
  /** For an ongoing entry with a known finish, shown instead of "present", e.g. "Fall 2026". */
  expected?: string;
  approx?: Array<"start" | "end" | "role">;
  summary: string;
  /** Keyframes sharing a skill are joined by a covisibility edge. */
  skills: string[];
  /** Short word reconstructed as a point cloud next to the keyframe. */
  landmark: string;
}

export const origin = {
  place: "London, Ontario",
  note: "World frame initialized.",
};

export const keyframes: Keyframe[] = [
  {
    id: "concordia",
    kind: "education",
    role: "B.Eng. Software Engineering",
    org: "Concordia University",
    place: "Montreal, QC",
    url: "https://www.concordia.ca",
    start: "2017-09",
    end: "2021-12",
    approx: ["start", "end"],
    summary:
      "Software engineering degree, with internships in between. Along the way: an OpenGL game, a peer-to-peer video streaming capstone, a React Native campus map and a C++ board-game engine.",
    skills: ["Java", "C++", "Python", "OpenGL", "Web"],
    landmark: "CONCORDIA",
  },
  {
    id: "matrox",
    kind: "work",
    role: "Full Stack Developer",
    org: "Matrox Electronic Systems",
    place: "Montreal, QC",
    url: "https://www.matrox.com",
    start: "2019-05",
    end: "2019-08",
    summary: "Built the web app the QA team used to manage its inventory.",
    skills: ["Web"],
    landmark: "MATROX",
  },
  {
    id: "intact",
    kind: "work",
    role: "Java Software Developer",
    org: "Intact Financial Corporation",
    place: "Montreal, QC",
    url: "https://www.intactfc.com",
    start: "2020-09",
    end: "2020-12",
    summary: "Designed and built RESTful web services in Spring and Quarkus.",
    skills: ["Java", "Spring", "Quarkus", "APIs", "Financial services"],
    landmark: "INTACT",
  },
  {
    id: "intact-lab",
    kind: "work",
    role: "AI Software Developer",
    org: "Intact Lab",
    place: "Montreal, QC",
    url: "https://intactlab.ca",
    start: "2021-05",
    end: "2021-08",
    approx: ["end"],
    summary:
      "Built a Spring microservice that monitors Kafka messages, plus Python tooling on top of MongoDB and AWS S3.",
    skills: ["Java", "Spring", "Kafka", "Python", "MongoDB", "AWS", "APIs", "Financial services"],
    landmark: "INTACT LAB",
  },
  {
    id: "morgan-stanley",
    kind: "work",
    role: "Software Developer",
    org: "Morgan Stanley",
    url: "https://www.morganstanley.com",
    start: "2022-01",
    end: "2023-06",
    approx: ["start", "end", "role"],
    summary:
      "Developed APIs and worked with cross-functional teams to build solutions for financial clients.",
    skills: ["APIs", "Financial services"],
    landmark: "MORGAN STANLEY",
  },
  {
    id: "aws",
    kind: "work",
    role: "Software Developer II",
    org: "Amazon Web Services",
    url: "https://aws.amazon.com/cloudformation/",
    start: "2023-07",
    end: "2025-01",
    approx: ["start", "end"],
    summary:
      "Worked on AWS CloudFormation, improving the service and the experience of the customers who define their infrastructure as code with it.",
    skills: ["Java", "Kotlin", "AWS", "Infrastructure as code"],
    landmark: "AWS",
  },
  {
    id: "microsoft",
    kind: "work",
    role: "Software Engineer",
    org: "Microsoft",
    url: "https://www.microsoft.com",
    start: "2025-02",
    approx: ["role"],
    // TODO(mohamed): add a line about the team and what you build there, plus skills.
    summary: "Software engineering at Microsoft since February 2025.",
    skills: [],
    landmark: "MICROSOFT",
  },
  {
    id: "sfu",
    kind: "research",
    role: "Graduate student",
    org: "Simon Fraser University",
    url: "https://www.sfu.ca",
    start: "2025-09",
    expected: "Fall 2026",
    summary: "Research in visual SLAM and 3D Gaussian splatting.",
    skills: ["Python", "C++", "Visual SLAM", "Gaussian splatting"],
    landmark: "SFU",
  },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatPoint(value: string, estimated: boolean): string {
  const [year, month] = value.split("-");
  return estimated ? year : `${MONTHS[Number(month) - 1]} ${year}`;
}

/** Human date range; estimated ends of the range collapse to the year. */
export function formatRange(kf: Keyframe): string {
  const start = formatPoint(kf.start, kf.approx?.includes("start") ?? false);
  const end = kf.end
    ? formatPoint(kf.end, kf.approx?.includes("end") ?? false)
    : kf.expected
      ? `${kf.expected} (expected)`
      : "present";
  return `${start} – ${end}`;
}

/** Decimal year, used to space keyframes along the trajectory. */
export function decimalYear(value: string): number {
  const [year, month] = value.split("-").map(Number);
  return year + (month - 1) / 12;
}

export interface CovisibilityEdge {
  a: number;
  b: number;
  shared: string[];
}

/** Pairs of keyframes that share at least one skill. */
export function covisibility(list: Keyframe[] = keyframes): CovisibilityEdge[] {
  const edges: CovisibilityEdge[] = [];
  for (let a = 0; a < list.length; a++) {
    for (let b = a + 1; b < list.length; b++) {
      const shared = list[a].skills.filter((s) => list[b].skills.includes(s));
      if (shared.length) edges.push({ a, b, shared });
    }
  }
  return edges;
}
