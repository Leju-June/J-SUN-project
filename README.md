# J-SUN

여러 서비스를 한 주소 아래 모으는 사이트. 서비스마다 포트를 따로 열고, 앞단 Caddy가 경로로 나눈다.

| 경로        | 앱               | 로컬 포트 | 역할                                   |
| ----------- | ---------------- | --------- | -------------------------------------- |
| `/`         | `apps/gateway`   | 3000      | 로비, 로그인·회원가입, 공통 세션, 앱 아이콘 |
| `/jeenee`   | `apps/jeenee`    | 3001      | 소원 서비스 Jeenee                     |
| `/j-son`    | `apps/j-son`    | 3002      | 데스크톱 추리 게임 J-SON (첫 사건 J-SON I) |
| (다음 칸)   | —                | —         | 로비에 빈 자리만 잡아 두었다            |

Postgres는 하나를 같이 쓴다. 게이트웨이는 `auth` 스키마(`auth.users`, `auth.sessions`)를 맡고, 각 서비스는 자기 표만 만든다(J-SON은 `j_son` 스키마). 마이그레이션 기록 표도 앱마다 따로 둔다.

## 로컬 실행

Docker Desktop이 켜져 있어야 한다.

```bash
npm install
npm run install:all
cp apps/gateway/.env.example apps/gateway/.env.local
cp apps/jeenee/.env.example apps/jeenee/.env.local
cp apps/j-son/.env.example apps/j-son/.env.local
npm run up
npm run db:migrate
npm run db:seed
npm run dev
```

`npm run up`은 DB와 개발용 프록시를 띄운다. 앱들이 뜨면 <http://localhost:8080> 에서 전체 사이트를 볼 수 있다. 앱 하나만 따로 볼 때는 각 포트로 직접 들어가도 된다(로그인 쿠키는 같은 주소에서만 공유되므로 프록시를 거쳐야 한다).

## 로그인

게이트웨이의 `/login`, `/signup`에서 이메일과 비밀번호로 가입한다. 비밀번호는 scrypt로 저장하고, 세션 토큰은 `jsun_session` 쿠키(httpOnly)에, 해시만 `auth.sessions`에 둔다. 다른 서비스는 같은 DB에서 그 표를 읽어 로그인 여부를 안다(Jeenee는 `src/lib/session.ts`). 로그아웃은 게이트웨이 `/logout`으로 POST 한다.

## 새 서비스 추가

1. `apps/<이름>`에 앱을 만들고 `basePath`를 `/<이름>`으로 둔다.
2. `apps/gateway/src/lib/services.ts`의 빈 자리를 채운다.
3. `infra/Caddyfile`, `infra/Caddyfile.dev`, `docker-compose.prod.yml`, `.github/workflows`의 matrix에 한 줄씩 추가한다.

## 검사

```bash
npm run typecheck
npm test
```

## 배포

서버 `~/j-sun/.env`에 `DOMAIN`, `POSTGRES_PASSWORD`, `ANTHROPIC_API_KEY`, `ADMIN_SECRET`, `DAILY_SPEND_LIMIT_USD`를 둔다. GitHub 저장소 변수 `DEPLOY_ENABLED=true`와 시크릿 `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`, `DEPLOY_USER`, `DEPLOY_HOST`를 설정하면 `main`에 push 할 때 앱별 이미지를 만들어 배포한다.
