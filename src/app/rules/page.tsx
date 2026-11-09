import type { Metadata } from "next";
import Link from "next/link";
import { Frame } from "@/components/Frame";
import { WEEKLY_FREE_WISHES } from "@/lib/quota";

export const metadata: Metadata = { title: "지니의 규칙", description: "지니가 소원을 들어주는 방식과 점수, 금기, 공유 규칙." };

export default function Rules() {
  return (
    <Frame title="지니의 규칙">
      <h2 className="section-title">하나. 소원은 적힌 그대로 이루어진다</h2>
      <p>
        지니는 어떤 소원도 거절하지 않는다. 다만 적힌 글자만 지킬 뿐, 적히지 않은 것까지 챙겨주지는 않는다. 빈틈이 있으면 지니는 반드시 찾아낸다.
      </p>

      <h2 className="section-title">둘. 일주일에 {WEEKLY_FREE_WISHES}번</h2>
      <ul className="rule-list">
        <li>소원은 일주일에 {WEEKLY_FREE_WISHES}번 빌 수 있다. 램프는 매주 월요일 0시(한국 시간)에 다시 깨어난다.</li>
        <li>같은 소원을 다시 빌면 그때의 이야기를 다시 보여준다. 이때는 소원이 줄지 않는다.</li>
        <li>지니가 소원을 끝까지 들어주지 못하면 쓴 소원을 돌려받는다.</li>
      </ul>

      <h2 className="section-title">셋. 점수</h2>
      <ul className="rule-list">
        <li>이야기가 끝나면 소원에 점수가 매겨진다. 소원을 얼마나 잘 썼는지, 지니가 얼마나 큰 불행을 남겼는지로 정해진다. 잘 쓴 소원이 훨씬 중요하다.</li>
        <li>잘 쓴 소원은 글자를 낭비하지 않고, 이야기가 될 만큼만 쓴 소원이다. 짧아도 완벽할 수 있다.</li>
        <li>잘 쓴 소원일수록 이야기도 길어진다.</li>
      </ul>

      <h2 className="section-title">넷. 세 가지 금기</h2>
      <p>살인, 사랑의 강요, 죽은 자의 부활. 빌 수는 있다. 그 대가가 훨씬 클 뿐이다.</p>

      <h2 className="section-title">다섯. 공유</h2>
      <ul className="rule-list">
        <li>
          이야기를 공유하면 오른쪽 목록과 <Link href="/hall">이번 주의 소원</Link>에 올라간다.
        </li>
        <li>실존 인물을 특정할 수 있는 이름이 들어가면 공유할 수 없다. &lsquo;A씨&rsquo;나 별명은 괜찮다.</li>
      </ul>

      <h2 className="section-title">여섯. 지니가 기억하는 것</h2>
      <ul className="rule-list">
        <li>접속한 IP 주소: 주간 소원 횟수, 같은 소원 확인, 내 기록과 업적 계산에 쓴다.</li>
        <li>소원과 이야기, 점수: 내 기록에서 다시 보고 공유하는 데 쓴다.</li>
        {process.env.NEXT_PUBLIC_GA_ID && <li>방문 통계: Google Analytics로 어떤 화면이 많이 쓰이는지 본다.</li>}
        <li>로그인 없이 쓸 수 있고, 이름이나 연락처는 받지 않는다.</li>
      </ul>

      <div className="actions">
        <Link className="button" href="/">
          소원 빌러 가기
        </Link>
      </div>
    </Frame>
  );
}
