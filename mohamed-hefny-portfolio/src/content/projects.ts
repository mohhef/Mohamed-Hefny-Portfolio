/**
 * Projects, shown as landmarks inside the map. `shape` picks the point-cloud
 * sculpture drawn for it (see src/scene/landmarks.ts); `anchor` is the keyframe
 * it sits closest to on the trajectory.
 */

export type LandmarkShape =
  | "network"
  | "tesseract"
  | "gridpath"
  | "clusters"
  | "board"
  | "floors"
  | "storm"
  | "miniloop";

export interface Project {
  id: string;
  name: string;
  year: string;
  stack: string[];
  summary: string;
  url: string;
  team?: string;
  shape: LandmarkShape;
  anchor: string;
}

export const projects: Project[] = [
  {
    id: "slam-adversarial-lab",
    name: "SLAM Adversarial Lab",
    year: "2026",
    stack: ["Python", "Podman / Docker", "CUDA"],
    summary:
      "Stress-tests visual SLAM two ways: degrade what the camera sees (fog, rain, night, a cracked lens) or the machine it runs on (CPU, memory and GPU caps, frame deadlines), across fourteen SLAM backends. IROS 2026.",
    url: "https://github.com/sfu-rsl/SLAMAdversarialLab",
    shape: "storm",
    anchor: "sfu",
  },
  {
    id: "switchboard",
    name: "Switchboard",
    year: "2020–21",
    stack: ["Java", "Spring Boot", "React", "MySQL"],
    summary:
      "Web service for peer-to-peer video streaming between senders and receivers. Concordia capstone project.",
    url: "https://github.com/mohhef/switchboard",
    team: "team of 9",
    shape: "network",
    anchor: "concordia",
  },
  {
    id: "superhypercube",
    name: "SuperHypercube",
    year: "2021",
    stack: ["C++", "OpenGL"],
    summary:
      "OpenGL remake of Super Hypercube: rotate a shape so it fits through the hole in an oncoming wall. Shadows, textures and a soundtrack.",
    url: "https://github.com/mohhef/SuperHypercube-Game",
    team: "team of 6",
    shape: "tesseract",
    anchor: "intact-lab",
  },
  {
    id: "montreal-crime",
    name: "Montreal Crime Analytics",
    year: "2020",
    stack: ["Python", "GeoPandas", "A*"],
    summary:
      "A* search for the safest walk across Montreal, over a grid built from the city's crime data, with an admissible diagonal heuristic.",
    url: "https://github.com/mohhef/MontrealCrimeAnalytics",
    shape: "gridpath",
    anchor: "matrox",
  },
  {
    id: "post-classifier",
    name: "Post Classifier",
    year: "2020",
    stack: ["Python", "pandas", "NLTK"],
    summary:
      "Naive Bayes classifier that sorts Hacker News posts into story, ask_hn, show_hn and poll, at over 80% accuracy on 5,000 test posts.",
    url: "https://github.com/mohhef/Machine-learning-post-classification",
    shape: "clusters",
    anchor: "intact",
  },
  {
    id: "eight-minute-legends",
    name: "Eight-Minute Legends",
    year: "2021",
    stack: ["C++"],
    summary: "A complete C++ implementation of the board game Eight-Minute Empire: Legends.",
    url: "https://github.com/mohhef/Eight-Minute-Legends",
    team: "team of 5",
    shape: "board",
    anchor: "intact-lab",
  },
  {
    id: "conpass",
    name: "CONPASS",
    year: "2020",
    stack: ["React Native", "JavaScript"],
    summary:
      "Campus map app with indoor directions through Concordia's buildings. Mini-capstone project.",
    url: "https://github.com/mohhef/CONPASS",
    shape: "floors",
    anchor: "matrox",
  },
  {
    id: "this-site",
    name: "This map",
    year: "2021–26",
    stack: ["TypeScript", "Next.js", "three.js", "WebGL"],
    summary:
      "The page you're on: Gaussian splats, point clouds and a pose graph, rendered in your browser.",
    url: "https://github.com/mohhef/Mohamed-Hefny-Portfolio",
    shape: "miniloop",
    anchor: "sfu",
  },
];
