import { MatrixRain } from "./MatrixRain";

/** Full-bleed matrix-rain, scanlines and vignette behind the auth cards. */
export function AuthBackdrop() {
  return (
    <div
      className="pointer-events-none absolute inset-0 overflow-hidden bg-black"
      aria-hidden
    >
      <MatrixRain className="absolute inset-0 h-full w-full opacity-85" />
      <div className="scanlines absolute inset-0 opacity-25" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,0.45) 100%)",
        }}
      />
    </div>
  );
}
