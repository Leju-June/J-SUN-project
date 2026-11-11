/** J-SUN 표식: 검은 바탕 위에서 빛나는 흰 동그라미. 아이콘 파일과 같은 모양이다. */
export function SunMark({ size = 32 }: { size?: number }) {
  return (
    <svg className="sun-mark" width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <defs>
        <radialGradient id="sun-halo" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.14" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="48" fill="url(#sun-halo)" />
      <circle cx="50" cy="50" r="19" fill="#fff" />
    </svg>
  );
}
