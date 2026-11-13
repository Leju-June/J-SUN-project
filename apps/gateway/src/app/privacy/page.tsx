import type { Metadata } from "next";
import { CONTACT_EMAIL } from "@/lib/services";

export const metadata: Metadata = { title: "개인정보처리방침" };

/** 초안. 수집 항목이 바뀌면(소셜 로그인, 결제 등) 반드시 갱신한다. */
export default function Privacy() {
  return (
    <article className="doc">
      <h1>개인정보처리방침</h1>
      <p className="doc-meta">시행일 2026-11-11</p>

      <h2>1. 수집하는 정보</h2>
      <ul>
        <li>
          <strong>계정을 만들 때</strong>: 이메일 주소, 표시 이름, 비밀번호(복원할 수 없는 해시 형태로만 저장)
        </li>
        <li>
          <strong>서비스를 이용할 때</strong>: 입력한 내용(예: 소원 문장)과 그 결과, 이용 시각, 접속 IP 주소
        </li>
        <li>
          <strong>브라우저에 저장되는 것</strong>: 로그인 상태를 유지하는 세션 쿠키, 테마 같은 화면 설정
        </li>
      </ul>

      <h2>2. 이용 목적</h2>
      <ul>
        <li>로그인과 계정 식별, 여러 기기에서 기록 이어 보기</li>
        <li>서비스 제공과 이용 제한(횟수 제한, 남용 방지)</li>
        <li>오류 분석과 서비스 개선</li>
      </ul>

      <h2>3. 보관 기간</h2>
      <p>
        계정 정보는 계정을 삭제할 때까지 보관합니다. 세션은 마지막 로그인으로부터 30일이 지나면 만료됩니다. 접속 IP와 이용 기록은 남용 방지를
        위해 필요한 기간 동안만 보관합니다.
      </p>

      <h2>4. 제3자 제공과 처리 위탁</h2>
      <p>
        개인정보를 외부에 팔거나 제공하지 않습니다. 다만 일부 서비스는 이용자가 입력한 문장을 인공지능 모델 제공사(Anthropic)의 API로 보내
        결과를 만듭니다. 이때 계정 정보는 함께 보내지 않습니다. 사이트 방문 통계를 위해 Google Analytics를 사용할 수 있습니다.
      </p>

      <h2>5. 이용자의 권리</h2>
      <p>
        이용자는 자신의 정보를 확인하고 고치거나, 계정과 기록의 삭제를 요청할 수 있습니다. 아래 문의처로 요청하면 지체 없이 처리합니다.
      </p>

      <h2>6. 안전 조치</h2>
      <p>비밀번호는 해시로만 저장하고, 통신은 HTTPS로 암호화하며, 데이터베이스는 외부에서 직접 접근할 수 없게 둡니다.</p>

      <h2>7. 문의</h2>
      <p>
        개인정보 관련 문의는 <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>로 보내 주세요.
      </p>
    </article>
  );
}
