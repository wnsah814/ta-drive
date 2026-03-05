# TA Drive

조교용 강의자료 파일 공유 웹앱.

## 기능

- 비밀번호 기반 로그인 (JWT)
- 파일 업로드/다운로드/삭제 (최대 50MB, 다중 업로드 지원)
- 폴더 생성/탐색/삭제 + 브레드크럼 네비게이션
- 파일 검색 (현재 폴더 내 이름 필터)
- 정렬 (이름/날짜, 오름차순/내림차순)
- 파일 타입별 아이콘 (PDF, PPT, DOC, 이미지 등)
- 드래그 앤 드롭으로 파일을 폴더로 이동

## 기술 스택

- **Next.js 16** (App Router, Turbopack)
- **React 19**
- **Tailwind CSS 4**
- **Supabase Storage** (파일 저장)
- **jose** (JWT 인증)

## 설정

### 1. Supabase

1. [Supabase](https://supabase.com)에서 프로젝트 생성
2. Storage에서 `files` 버킷 생성

### 2. 환경 변수

`.env.local` 파일 생성:

```env
NEXT_PUBLIC_SITE_NAME=TA Drive
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ACCESS_PASSWORD=your-password
JWT_SECRET=your-jwt-secret
```

`JWT_SECRET` 생성:

```bash
openssl rand -base64 32
```

### 3. 실행

```bash
npm install
npm run dev
```

## 배포

Vercel에 배포 시 위 환경 변수를 프로젝트 설정에 추가.

```bash
vercel
```
