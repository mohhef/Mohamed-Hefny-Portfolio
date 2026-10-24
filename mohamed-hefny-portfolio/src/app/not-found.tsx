import Link from "next/link";

export default function NotFound() {
  return (
    <main className="lost">
      <p className="state" data-state="LOST">
        <i aria-hidden="true" />
        TRACKING LOST
      </p>
      <h1>This frame isn&apos;t in the map.</h1>
      <p>No features matched anything the camera has seen. Head back to a known place and it will relocalize.</p>
      <p>
        <Link href="/" className="lost-link">
          Relocalize at the origin →
        </Link>
      </p>
    </main>
  );
}
