import Link from "next/link";

export default function NotFound() {
  return (
    <main className="title">
      <h1>J-SON</h1>
      <p className="title-tag">찾는 자료가 사건 기록에 없다.</p>
      <Link className="title-button" href="/">
        처음 화면으로
      </Link>
    </main>
  );
}
