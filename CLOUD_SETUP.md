# 모아 플래너 — 개인 클라우드 연동 설정

이 버전은 기존 PWA 목표/일정/일별·주간 몸무게/카테고리/스포츠 기능을 유지하며 Supabase를 통한 **개인 단일 계정 동기화(베타)** 를 추가합니다. 코드는 제작했지만 실제 Supabase 프로젝트 및 두 기기에서의 실동작 검증은 아직 진행되지 않았습니다.

## 1. 먼저 기존 자료 백업
배포된 기존 앱에서 **설정 → 데이터 백업**으로 JSON을 다운로드하세요. 신규 버전 배포 직후에도 로컬 기록은 유지하도록 설계했지만, 만일의 상황에 대비하세요.

## 2. Supabase 설정
1. https://supabase.com 에서 새 프로젝트를 만듭니다.
2. SQL Editor에서 `supabase/schema.sql`을 엽니다.
3. SQL에 있는 `YOUR_GOOGLE_EMAIL@example.com`을 **실제 로그인할 본인의 구글 이메일 주소**로 바꾼 뒤 실행합니다. 다른 사용자의 읽기/쓰기 요청을 RLS 정책으로 거부합니다.
4. Authentication → Providers → Google 활성화. Google Cloud Console에서 OAuth 클라이언트를 만들고, Supabase가 안내하는 OAuth callback URL(`https://<project-ref>.supabase.co/auth/v1/callback`)을 Google 인증된 리디렉션 URI로 등록한 후 Client ID/Secret을 Supabase에 설정합니다.
5. Supabase Authentication → URL Configuration → **Site URL**에 배포 주소(`https://YOUR-APP.vercel.app`)를 설정합니다. **Redirect URLs**에는 `https://YOUR-APP.vercel.app/**`를 등록합니다. 실제 운영에서는 가능한 한 정확한 도메인만 허용하세요.
6. Supabase Settings → API / Project Connect에 표시된 **Project URL**과 **Publishable 또는 anon(public) key**만 준비합니다. **service_role 또는 secret key는 절대 앱/깃허브에 넣지 마세요.**

## 3. 앱 연결
1. Vercel에 파일을 재배포합니다.
2. PC에서 앱 왼쪽의 **클라우드 동기화 → 연결 설정**을 열고 Project URL과 publishable/anon 키를 입력 → 연결 저장.
3. **구글 로그인**을 누르고 위 SQL에 지정한 계정으로 로그인합니다.
4. 기존 로컬 기록이 있으면 **클라우드 업로드 여부**를 묻습니다. 먼저 백업하고 업로드하세요.
5. 모바일에서도 **같은 앱 주소**로 접속해 같은 방식으로 URL/키 설정 후 구글 로그인하세요. 클라우드에 기존 내용이 있다면 **클라우드 기록 가져오기**를 선택하세요.

## 동작 범위 및 한계
- 로그인하지 않았거나 연결 장애가 생겨도 기존 localStorage에는 계속 저장됩니다.
- 로그인 상태에서 수정할 때 약 1.2초 후 클라우드에 저장합니다. 다른 기기 기록은 약 15초 간격, 탭 복귀 시 확인합니다. 두 기기에서 **동시에 편집하면 마지막 저장이 이전 기록을 덮어쓸 수 있습니다**. 현재는 항목별 병합 및 충돌 해결 기능이 없습니다.
- 오프라인일 때는 해당 기기 로컬에 기록이 남습니다. 온라인 재접속 시 클라우드에 업로드를 재시도하므로 같은 시간대 다른 기기 편집은 피하세요.
- PWA 설치 환경마다 localStorage 구분이 달라질 수 있습니다. 첫 연결 시 데이터를 가져오거나 업로드하기 전에 반드시 JSON 백업하세요.
- 다른 사람에게 배포 주소를 알려줘도 앱 자체의 UI는 보일 수 있습니다. SQL에 지정한 이메일 이외의 사용자는 DB에 접근할 수 없습니다. 앱 UI까지 완전히 비공개로 하려면 별도의 접근 제어가 필요합니다.
- 환경 설정의 **publishable/anon 키는 브라우저에 저장되는 공개 키**이고 비밀 키가 아닙니다. RLS가 필수입니다. 구글 계정 자체의 보안은 2단계 인증을 권장합니다.
- 실시간 푸시 알림, 서버 알람, 완전 자동 오프라인 충돌 병합은 아직 포함되지 않습니다.