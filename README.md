# Mohamed Hefny · mapping in progress

My portfolio, drawn as a live visual-SLAM session. The page reconstructs itself in the browser as you scroll:

- **Hero**: my photo is fitted as 3D Gaussian splats (coarse to fine, like a 3DGS optimiser) with depth inflated from the silhouette.
- **Calibration**: the About section, next to a chessboard with OpenCV-style corner detections.
- **Trajectory**: the camera drives a loop through my career. The path is solid where it has been driven and dashed where it is still ahead; the blue frustum pinned to the floor is the live camera. Each job is a keyframe; its name is triangulated as a point cloud and turns red while tracked. Keyframes that share a skill are joined by covisibility edges (hover a skill to light them up).
- **Landmarks**: projects as point-cloud sculptures inside the loop, with an overview of the whole map.
- **Publications**: the papers. Two of them can be tried on the map: SLAM Adversarial Lab's adverse conditions and SLAMSqueezeBench's processor caps, each next to what the paper found.
- **Loop closure**: odometry drift builds up along the way and is corrected when the trajectory returns to the origin, where the contact links are. Once the loop has closed, **Explore the map** hands over the camera (orbit, zoom, pan, click to focus) and can save a picture of the map.

The HUD shows tracking state, keyframes, map points, pose and drift. Scroll too fast and tracking is lost. Conditions (clear, rain, fog, snow, day or night) follow the live weather and daylight at SFU Burnaby until one is picked by hand; **Live** hands them back. Sound is opt-in and synthesized in the browser. On a phone, **Tilt** looks around the map by tilting the device.

A plain, printable version of the same content lives at `/cv`.

## Stack

Next.js 16 (App Router), React 19, TypeScript and three.js. No database: all content is hardcoded in `mohamed-hefny-portfolio/src/content/`. The only server code is `/api/sky`, which returns the current weather at SFU Burnaby from [Open-Meteo](https://open-meteo.com) and is regenerated at most every ten minutes, so visitors never call the weather service themselves. Day and night need no network: they come from the sun's position.

## Editing content

| File | What it holds |
| --- | --- |
| `src/content/timeline.ts` | Education and jobs, newest first. Fields listed in `approx` are estimates and render as years only. |
| `src/content/projects.ts` | Projects shown as landmarks. `shape` picks the sculpture, `anchor` the keyframe it sits near. |
| `src/content/profile.ts` | Headline, About paragraphs, the calibration facts, contact links. |
| `src/content/publications.ts` | Papers. `lab` puts a "try it on this map" control on a paper's card. |
| `src/content/findings.ts` | The results quoted next to those controls. Each line restates the paper's own text: check any edit against the paper. |
| `src/content/place.ts` | Where the live weather and daylight come from. |

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
