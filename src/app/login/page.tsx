export default function Login() {
  return (
    <div className="box">
      <h1>로그인</h1>
      <p className="notice">로그인 없이도 소원을 빌 수 있다. 계정 기능은 준비 중이다.</p>
      <div className="actions">
        <button type="button" className="button" disabled>
          이메일로 로그인 (준비 중)
        </button>
        <button type="button" className="button" disabled>
          카카오로 로그인 (준비 중)
        </button>
      </div>
    </div>
  );
}
