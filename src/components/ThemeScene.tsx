import { Scarf } from "./Scarf";

const SKY_WIDTH = 1600;
const SKY_HEIGHT = 900;
const STAR_COUNT = 110;
const SPARKLE_EVERY = 6;

// 서버와 브라우저에서 같은 하늘이 나오도록 고정된 순서로 뽑는다.
function createStars() {
  let seed = 20;
  const next = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  return Array.from({ length: STAR_COUNT }, (_, index) => ({
    x: Math.round(next() * SKY_WIDTH),
    y: Math.round(next() ** 1.6 * SKY_HEIGHT),
    size: index % SPARKLE_EVERY === 0 ? 7 + Math.round(next() * 6) : 1 + Math.round(next() * 1.5),
  }));
}

const sparkle = (x: number, y: number, r: number) =>
  `M${x} ${y - r}Q${x} ${y} ${x + r} ${y}Q${x} ${y} ${x} ${y + r}Q${x} ${y} ${x - r} ${y}Q${x} ${y} ${x} ${y - r}Z`;

const STARS = createStars();

type Props = { active: boolean; onOpened: () => void };

/** 테마 전용 배경. 지금은 밤하늘 테마에서만 보인다. */
export function ThemeScene({ active, onOpened }: Props) {
  return (
    <div className="scene" aria-hidden>
      <svg className="scene-sky" viewBox={`0 0 ${SKY_WIDTH} ${SKY_HEIGHT}`} preserveAspectRatio="xMidYMin slice">
        {STARS.map((star) =>
          star.size > 3 ? (
            <path key={`${star.x}-${star.y}`} d={sparkle(star.x, star.y, star.size)} />
          ) : (
            <circle key={`${star.x}-${star.y}`} cx={star.x} cy={star.y} r={star.size} />
          ),
        )}
      </svg>
      <div className="scene-moon" />
      <span className="meteor meteor-1" />
      <span className="meteor meteor-2" />
      <span className="meteor meteor-3" />
      <Scarf active={active} onOpened={onOpened} />
    </div>
  );
}
