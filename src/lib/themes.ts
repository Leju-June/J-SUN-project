/**
 * render는 테마마다 화면을 그리는 방식이고, 테마마다 하나씩만 쓴다.
 * typing은 화면 전체를 타이핑하듯 드러내고, scene은 ThemeScene의 장면이 끝난 뒤 화면을 연다.
 * 나머지는 globals.css의 테마 구역에서 --enter 등장 연출과 배경으로 그린다.
 * color는 모바일 브라우저 주소창 색이고, swatch는 테마 선택 버튼에 보이는 [바탕, 강조] 색이다.
 */
export const THEMES = [
  { id: "terminal", name: "터미널", render: "typing", color: "#000000", swatch: ["#000000", "#55ffff"] },
  { id: "fairytale", name: "밤하늘", render: "scene", color: "#101c4f", swatch: ["#101c4f", "#9ad8ff"] },
  { id: "lamp", name: "램프", render: "smoke", color: "#120b24", swatch: ["#2a1650", "#e8bd5f"] },
  { id: "contract", name: "계약서", render: "ink", color: "#24170e", swatch: ["#efe2c4", "#7a1616"] },
  { id: "receipt", name: "영수증", render: "print", color: "#2b2a28", swatch: ["#fbfaf6", "#2d2d2d"] },
  { id: "talisman", name: "부적", render: "brush", color: "#17110d", swatch: ["#f3dc8f", "#b8231a"] },
  { id: "tarot", name: "타로", render: "flip", color: "#14102a", swatch: ["#231a45", "#c9a24d"] },
  { id: "newspaper", name: "호외", render: "press", color: "#ece6d6", swatch: ["#ece6d6", "#1a1a1a"] },
  { id: "vhs", name: "비디오", render: "glitch", color: "#08080f", swatch: ["#08080f", "#ff4fa3"] },
  { id: "well", name: "우물", render: "ripple", color: "#06202a", swatch: ["#0d3a45", "#8fe3d6"] },
  { id: "desktop", name: "데스크톱", render: "popup", color: "#5a5fa8", swatch: ["#c9c9c9", "#1b2a8c"] },
  { id: "casino", name: "카지노", render: "reel", color: "#0b3d2c", swatch: ["#0b3d2c", "#f5c542"] },
  { id: "comic", name: "만화", render: "panel", color: "#fff8e1", swatch: ["#ffe14d", "#e63946"] },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME: ThemeId = "terminal";
const STORAGE_KEY = "jeenee-theme";

export const isTheme = (value: unknown): value is ThemeId => THEMES.some((theme) => theme.id === value);
const findTheme = (id: ThemeId) => THEMES.find((theme) => theme.id === id);
export const themeRender = (id: ThemeId) => findTheme(id)?.render;
export const themeColor = (id: ThemeId) => findTheme(id)?.color;

export function saveTheme(id: ThemeId) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // 저장소를 쓸 수 없으면 이번 방문에만 적용한다.
  }
}

const idsByRender = (render: string) => THEMES.filter((theme) => theme.render === render).map((theme) => theme.id);

// 첫 화면이 다른 테마로 깜빡이지 않도록 그리기 전에 실행한다.
export const THEME_BOOT_SCRIPT = `(function(){var t=${JSON.stringify(DEFAULT_THEME)};try{var s=localStorage.getItem(${JSON.stringify(STORAGE_KEY)});if(${JSON.stringify(THEMES.map((theme) => theme.id))}.indexOf(s)>=0)t=s}catch(e){}var d=document.documentElement.dataset;d.theme=t;if(${JSON.stringify(idsByRender("typing"))}.indexOf(t)>=0)d.booting="";if(${JSON.stringify(idsByRender("scene"))}.indexOf(t)>=0)d.opening=""})()`;
