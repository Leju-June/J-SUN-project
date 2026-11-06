/**
 * render는 테마마다 화면을 그리는 방식이다. typing은 화면 전체를 타이핑하듯 드러내고,
 * scene은 ThemeScene의 장면과 CSS 연출로 화면을 연다.
 */
export const THEMES = [
  { id: "terminal", name: "터미널", render: "typing" },
  { id: "fairytale", name: "밤하늘", render: "scene" },
  { id: "lamp", name: "램프", render: "plain" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME: ThemeId = "terminal";
const STORAGE_KEY = "jeenee-theme";

export const isTheme = (value: unknown): value is ThemeId => THEMES.some((theme) => theme.id === value);
export const themeRender = (id: ThemeId) => THEMES.find((theme) => theme.id === id)?.render;

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
