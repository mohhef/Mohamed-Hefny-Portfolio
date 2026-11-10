"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { isExploring, setExploring, subscribeExplore } from "./explore";
import { subscribeTelemetry } from "./telemetry";

/** The way into explore mode. It unlocks when the loop closes, since that is when the map is finished. */
export function ExploreButton() {
  const exploring = useSyncExternalStore(subscribeExplore, isExploring, () => false);
  const [closed, setClosed] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const wasExploring = useRef(false);

  useEffect(
    () =>
      subscribeTelemetry((t) => {
        if (t.state === "LOOP CLOSED") setClosed(true);
      }),
    [],
  );

  // Coming back from the map, the keyboard picks up where it left off.
  useEffect(() => {
    if (wasExploring.current && !exploring) button.current?.focus({ preventScroll: true });
    wasExploring.current = exploring;
  }, [exploring]);

  return (
    <p className="map-actions">
      <button ref={button} type="button" className="explore-enter" disabled={!closed} onClick={() => setExploring(true)}>
        Explore the map
        <span aria-hidden="true">→</span>
      </button>
      <span className="map-actions-note">{closed ? "Take the camera, and save a picture of what you mapped." : "Unlocks once the loop has closed."}</span>
    </p>
  );
}
