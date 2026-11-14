# 서버 켜는 법 (로컬)

전체 사이트 주소: http://localhost:8080

## 1. Docker 켜기

Docker Desktop이 실행 중이어야 한다.
- 일시정지(Paused) 상태라면 고래 메뉴에서 **Resume**을 누르거나, 터미널에서 `docker desktop restart`.

## 2. DB와 프록시 띄우기 (저장소 루트에서)

```bash
npm run up
```

처음이거나 DB 구조가 바뀌었을 때만:

```bash
npm run db:migrate
npm run db:seed
```

## 3. 앱 세 개 띄우기

개발 모드(코드 고치면 바로 반영):

```bash
npm run dev
```

또는 운영 모드(빌드 후 실행):

```bash
npm run build
npm run start
```

| 앱 | 포트 | 주소 |
| --- | --- | --- |
| gateway (로비·로그인) | 3000 | http://localhost:8080/ |
| jeenee | 3001 | http://localhost:8080/jeenee |
| j-son | 3002 | http://localhost:8080/j-son |

로그인 쿠키를 공유하려면 각 포트가 아니라 **8080**으로 들어간다.

## 끄기

- 앱: `npm run dev`/`npm run start`를 띄운 터미널에서 `Ctrl+C`
- DB·프록시: `npm run down`

## 처음 세팅할 때 한 번만

```bash
npm install
npm run install:all
cp apps/gateway/.env.example apps/gateway/.env.local
cp apps/jeenee/.env.example apps/jeenee/.env.local
cp apps/j-son/.env.example apps/j-son/.env.local
```

## 참고

- J-SON은 창 폭 960px 이상에서만 게임 화면이 나온다.
- 8080이 안 열리면 `docker ps`로 `j-sun-proxy-1`, `j-sun-db-1`이 떠 있는지 확인한다.
