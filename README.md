# Mohamed Hefny · mapping in progress

My portfolio, drawn as a live visual-SLAM session. The page reconstructs itself in the browser as you scroll:

- **Hero**: my photo is fitted as 3D Gaussian splats (coarse to fine, like a 3DGS optimiser) with depth inflated from the silhouette.
- **Calibration**: the About section, next to a chessboard with OpenCV-style corner detections.
- **Trajectory**: the camera drives a loop through my career. Each job is a keyframe; its name is triangulated as a point cloud and turns red while tracked. Keyframes that share a skill are joined by covisibility edges (hover a skill to light them up).
- **Landmarks**: projects as point-cloud sculptures inside the loop, with an overview of the whole map.
- **Loop closure**: odometry drift builds up along the way and is corrected when the trajectory returns to the origin, where the contact links are.

The HUD shows tracking state, keyframes, map points, pose and drift. Scroll too fast and tracking is lost; switch the conditions to rain or snow and it degrades. Day/night follows the OS setting and can be toggled.

A plain, printable version of the same content lives at `/cv`.

## Stack

Next.js 16 (App Router, static export friendly), React 19, TypeScript and three.js. No database and no backend: all content is hardcoded in `mohamed-hefny-portfolio/src/content/`.

## Editing content

| File | What it holds |
| --- | --- |
| `src/content/timeline.ts` | Education and jobs, in chronological order. Fields listed in `approx` are estimates and render as years only. |
| `src/content/projects.ts` | Projects shown as landmarks, plus the smaller list. `shape` picks the sculpture, `anchor` the keyframe it sits near. |
| `src/content/profile.ts` | Headline, About paragraphs, the calibration facts, contact links. |

Everything else (camera path, keyframe spacing, covisibility edges, minimap) is derived from these files.

### Replacing the photo

Point the prep script at any photo. It crops it square, saves it as `public/images/self.jpg` and cuts you out of the background (MediaPipe person segmentation) into `public/images/portrait-matte.png`, which the splat renderer uses:

```bash
cd mohamed-hefny-portfolio
pip install pillow numpy opencv-python mediapipe
python scripts/prepare-portrait.py path/to/photo.jpg
```

Photos under 440 px are upscaled, so a larger original gives a sharper portrait.

## Development

```bash
cd mohamed-hefny-portfolio
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run typecheck
npm run build
```

## Deployment

Deployed on Vercel with **Root Directory** set to `mohamed-hefny-portfolio`. The old environment variables (`AUTH0_*`, `GITHUB_ACCESS_TOKEN`, `TIMELINE_API_URL`, `BASE_URL`) are no longer used and can be removed. Old routes (`/about`, `/timeline`, `/portfolio`) redirect to the matching sections.
