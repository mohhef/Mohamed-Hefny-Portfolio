/**
 * Results shown next to the controls on the publication cards. Every line
 * restates something the paper says in its text (the arXiv versions linked in
 * publications.ts): the map's reaction is a simulation, these are not.
 * Check any edit against the paper.
 */

/** SLAM Adversarial Lab (arXiv:2603.17165), by the condition picked on this page. */
export const conditionFindings = {
  clear:
    "SAL turns a clean dataset into an adverse one at a severity set in real units, such as millimetres of rain per hour or metres of fog visibility, then searches for the level at which a SLAM system fails.",
  rain: "ORB features tracked stably through heavy rain (50 mm/h) and failed completely at severe intensity (200 mm/h), with no gradual decline in between.",
  fog: "Fog is set as a visibility distance in metres and applied with depth, so what is further away fades first. Turn on night as well for the paper's sharpest failure.",
  snow: "Snow is this page's own addition. The paper's weather perturbations are rain and fog, alongside camera faults such as lens soiling and cracks, and video-transport faults such as frame drops.",
  night:
    "Conditions compound: night combined with fog degraded tracking significantly more than either did alone. Add fog to see it here.",
  nightFog:
    "At night with fog, ORB-SLAM3 on KITTI broke between 24 m and 21 m of visibility: its trajectory error jumped from 0.304 m to 28.255 m.",
};

/** SLAMSqueezeBench (arXiv:2609.19533), by processor cap. The caps are the ones the paper's first experiment applies. */
export const capFindings: Record<string, string> = {
  uncapped:
    "Even with nothing capped, delivering frames in real time costs some systems frames: ORB-SLAM3 without an IMU lost 15% of them on EuRoC at 20 Hz.",
  "4": "A cap above a system's average use can still hurt. DROID-SLAM averages under two cores, yet a four-core cap raised its frame loss from 34% to 50%.",
  "2": "ORB-SLAM3 failed at two cores, with and without an IMU: runs lost tracking and never relocalised, or reset and discarded their map.",
  "1": "A one-core cap and thirty competing workers left ORB-SLAM3 with IMU at the same average use, about one core. The capped runs failed; the runs beside the workload succeeded.",
  "0.5": "At half a core OKVIS2-X still reported poses, but 95 of them instead of 498, as its frame loss rose from 0% to 81%.",
};
