"use client";

import { useEffect, useRef } from "react";

const STEP = 16;
const RIB_GAP = 15;
const TASSEL_GAP = 11;
const END_MARGIN = 20;
const TASSEL_LENGTH = 44;

const SLIDE = 1000;
const SAG = 550;
const SAG_AFTER = 750;
const DELAYS = [700, 350, 0]; // 뒤에서 앞 순서. 아래 겹부터 한 줄씩 지나간다.
const OPEN_AT = 1950;

type Edge = (x: number, sag: number) => number;
type Band = { top: Edge; bottom: (x: number) => number; ribs: number };

const clamp = (value: number) => Math.min(1, Math.max(0, value));

function smooth(from: number, to: number, value: number) {
  const t = clamp((value - from) / (to - from));
  return t * t * (3 - 2 * t);
}

/** sag가 0이면 일자, 1이면 가운데가 쳐진 -_- 모양이다. */
function createBands(width: number, height: number): Band[] {
  const center = width / 2;
  const half = Math.min(430, width * 0.46);
  const bank = Math.min(140, width * 0.18);
  const dip = (x: number) => 1 - smooth(half - bank, half, Math.abs(x - center));
  const wobble = (x: number, phase: number) => Math.sin(x / 170 + phase) * 3 + Math.sin(x / 61 + phase * 2) * 2;
  const edge = (base: number, depth: number, phase: number): Edge => (x, sag) => base + sag * (depth * dip(x) + wobble(x, phase));

  const upper = edge(64, 64, 0);
  const middle = edge(height * 0.36, 46, 1.4);
  const lower = edge(height * 0.68, 40, 2.6);
  const under = (next: Edge) => (x: number) => next(x, 1) + 40;
  const screenBottom = () => height + 20;
  const ribs = (top: Edge, bottom: (x: number) => number) => Math.max(2, Math.floor((bottom(0) - top(0, 1)) / RIB_GAP) - 1);

  return [
    { top: upper, bottom: under(middle), ribs: ribs(upper, under(middle)) },
    { top: middle, bottom: under(lower), ribs: ribs(middle, under(lower)) },
    { top: lower, bottom: screenBottom, ribs: ribs(lower, screenBottom) },
  ];
}

const line = (points: [number, number][]) => points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join("");

function bandPaths(band: Band, width: number, sag: number) {
  const columns: { x: number; top: number; bottom: number }[] = [];
  for (let x = -END_MARGIN; x < width + STEP * 2; x += STEP) columns.push({ x, top: band.top(x, sag), bottom: band.bottom(x) });

  const top = columns.map(({ x, top: y }): [number, number] => [x, y]);
  const bottom = columns.map(({ x, bottom: y }): [number, number] => [x, y]).reverse();

  let ribs = "";
  for (let rib = 1; rib <= band.ribs; rib++) {
    const share = rib / (band.ribs + 1);
    ribs += line(columns.map(({ x, top: y, bottom: end }) => [x, y + (end - y) * share]));
  }
  return { cloth: `${line([...top, ...bottom])}Z`, ribs, edge: line(top) };
}

function tasselPath(band: Band) {
  const first = band.top(-END_MARGIN, 0);
  const last = band.bottom(-END_MARGIN);
  let path = "";
  for (let y = first + 4, i = 0; y < last; y += TASSEL_GAP, i++) {
    const bend = (i % 3) * 4 - 4;
    path += `M${-END_MARGIN} ${y.toFixed(1)}q-20 ${bend} -${TASSEL_LENGTH} ${bend * 2 + 4}`;
  }
  return path;
}

type Props = { active: boolean; onOpened: () => void };

/**
 * 밤하늘 테마의 목도리. 겹마다 일자로 지나간 뒤 가운데가 쳐진다.
 * 이동은 transform으로만 처리해 뜨개 무늬를 다시 그리는 구간을 줄인다.
 */
export function Scarf({ active, onOpened }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const opened = useRef(onOpened);

  useEffect(() => {
    opened.current = onOpened;
  });

  useEffect(() => {
    const element = root.current;
    if (!active || !element) return;

    const layers = [...element.querySelectorAll<SVGSVGElement>("svg")].map((svg) => ({
      svg,
      shade: svg.querySelector<SVGPathElement>(".scarf-shade"),
      cloth: svg.querySelector<SVGPathElement>(".scarf-cloth"),
      ribs: svg.querySelector<SVGPathElement>(".scarf-ribs"),
      tassels: svg.querySelector<SVGPathElement>(".scarf-tassels"),
    }));

    let width = 0;
    let bands: Band[] = [];
    const drawBand = (index: number, sag: number) => {
      const layer = layers[index];
      const paths = bandPaths(bands[index], width, sag);
      layer.shade?.setAttribute("d", paths.edge);
      layer.cloth?.setAttribute("d", paths.cloth);
      layer.ribs?.setAttribute("d", paths.ribs);
    };
    const measure = () => {
      width = window.innerWidth;
      const height = window.innerHeight;
      bands = createBands(width, height);
      layers.forEach((layer, index) => {
        layer.svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
        layer.tassels?.setAttribute("d", tasselPath(bands[index]));
      });
    };

    measure();
    const onResize = () => {
      measure();
      bands.forEach((_, index) => drawBand(index, 1));
    };
    window.addEventListener("resize", onResize);

    let frame = 0;
    let announce: ReturnType<typeof setTimeout> | undefined;
    const slides: Animation[] = [];

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onResize();
      opened.current();
    } else {
      bands.forEach((_, index) => drawBand(index, 0));
      layers.forEach(({ svg }, index) => {
        const from = `translateX(${width + END_MARGIN + TASSEL_LENGTH}px)`;
        slides.push(
          svg.animate([{ transform: from }, { transform: "none" }], {
            duration: SLIDE,
            delay: DELAYS[index],
            easing: "cubic-bezier(0.3, 0.2, 0.2, 1)",
            fill: "both",
          }),
        );
      });

      const start = performance.now();
      const settled = new Set<number>();
      const tick = (now: number) => {
        const elapsed = now - start;
        bands.forEach((_, index) => {
          if (settled.has(index)) return;
          const begin = DELAYS[index] + SAG_AFTER;
          if (elapsed < begin) return;
          const sag = smooth(0, 1, (elapsed - begin) / SAG);
          drawBand(index, sag);
          if (sag === 1) settled.add(index);
        });
        if (settled.size < bands.length) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      announce = setTimeout(() => opened.current(), OPEN_AT);
    }

    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(announce);
      slides.forEach((slide) => slide.cancel());
      window.removeEventListener("resize", onResize);
    };
  }, [active]);

  return (
    <div ref={root}>
      {[0, 1, 2].map((band) => (
        <svg key={band} className={band === 0 ? "scarf scarf-back" : "scarf"}>
          <path className="scarf-tassels" />
          <path className="scarf-shade" />
          <path className="scarf-cloth" />
          <path className="scarf-ribs" />
        </svg>
      ))}
    </div>
  );
}
