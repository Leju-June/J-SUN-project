import { notFound } from "next/navigation";
import { Game } from "@/components/Game";
import { DEFAULT_CASE_ID, loadCase } from "@/engine/loader";

// 사건 데이터를 요청 때 읽는다. 진행은 화면이 /api/play로 따로 주고받는다.
export const dynamic = "force-dynamic";

export default function Home() {
  const data = loadCase(DEFAULT_CASE_ID);
  if (!data) notFound();
  // 타이틀 화면에 보일 소개만 넘긴다. 사건 내용은 넘기지 않는다.
  return <Game intro={{ id: data.id, title: data.title, episode: data.episode, badge: data.badge ?? null, station: data.station, blurb: data.blurb }} />;
}
