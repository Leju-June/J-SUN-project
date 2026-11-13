const RAY_COUNT = 16;
const INNER = 17;
const LONG = 44;
const SHORT = 32;

/** 고리에서 곧게 뻗는 빛살. 긴 것과 짧은 것이 번갈아 나온다. 아이콘 파일(icon.svg)과 같은 좌표다. */
const RAYS = Array.from({ length: RAY_COUNT }, (_, i) => {
  const angle = ((i * 360) / RAY_COUNT - 90) * (Math.PI / 180);
  const outer = i % 2 === 0 ? LONG : SHORT;
  return {
    x1: 50 + INNER * Math.cos(angle),
    y1: 50 + INNER * Math.sin(angle),
    x2: 50 + outer * Math.cos(angle),
    y2: 50 + outer * Math.sin(angle),
  };
});

type Props = { size?: number; animated?: boolean };

/** J-SUN 표식: 가운데가 빈 고리가 곧은 빛을 내뿜는다. animated면 회전·맥동·빛 방출이 함께 돈다. */
export function SunMark({ size = 32, animated = false }: Props) {
  return (
    <svg className={animated ? "sun-mark sun-animated" : "sun-mark"} width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      {animated && (
        <>
          <defs>
            <radialGradient id="sun-halo" cx="50%" cy="50%" r="50%">
              <stop offset="0" stopColor="#fff" stopOpacity="0.4" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.1" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle className="sun-glow" cx="50" cy="50" r="50" fill="url(#sun-halo)" />
          <circle className="sun-wave" cx="50" cy="50" r="46" fill="none" stroke="#fff" strokeWidth="1.5" />
          <circle className="sun-wave sun-wave-late" cx="50" cy="50" r="46" fill="none" stroke="#fff" strokeWidth="1.5" />
        </>
      )}
      <g className="sun-body" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round">
        <circle className="sun-core" cx="50" cy="50" r="9" />
        <g className="sun-rays">
          {RAYS.map((ray, i) => (
            <line key={i} x1={ray.x1} y1={ray.y1} x2={ray.x2} y2={ray.y2} />
          ))}
        </g>
      </g>
    </svg>
  );
}
