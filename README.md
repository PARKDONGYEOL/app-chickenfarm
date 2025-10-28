# 🐔 Chicken Farm App

양계장 관리를 위한 React Native 모바일 애플리케이션입니다.

## 📱 주요 기능

- 회원가입 및 로그인
- 양계장 데이터 관리
- 실시간 모니터링
- 차트 및 통계 시각화

## 🎬 기능 작동 영상

<!-- 여기에 영상을 추가하세요 -->

### 회원가입 및 로그인
![회원가입 영상](./docs/videos/signup-demo.gif)

### 대시보드
![대시보드 영상](./docs/videos/dashboard-demo.gif)

### 데이터 관리
![데이터 관리 영상](./docs/videos/data-management-demo.gif)

## 🚀 시작하기

### 필수 요구사항

- Node.js
- npm 또는 yarn
- Expo CLI
- Android Studio (Android 개발) 또는 Xcode (iOS 개발)

### 설치 및 실행

1. 의존성 설치

   ```bash
   npm install
   ```

2. 개발 서버 시작

   ```bash
   npm start
   ```

3. 플랫폼별 실행

   ```bash
   # Android
   npm run android

   # iOS
   npm run ios

   # Web
   npm run web
   ```

## 🛠 기술 스택

- React Native 0.81.4
- Expo ~54.0.13
- React Navigation 7.x
- Axios (API 통신)
- React Native SVG (차트)
- Expo Router (파일 기반 라우팅)

## 📁 프로젝트 구조

```
app-chickenfarm/
├── app/                    # 앱 화면 및 라우팅
│   ├── authorization/      # 인증 관련 화면
│   └── ...
├── components/             # 재사용 가능한 컴포넌트
├── assets/                 # 이미지, 폰트 등
└── docs/                   # 문서 및 영상
    └── videos/             # 기능 시연 영상
```

## 🔧 개발 스크립트

```bash
npm start          # Expo 개발 서버 시작
npm run android    # Android 앱 실행
npm run ios        # iOS 앱 실행
npm run web        # 웹 버전 실행
npm run lint       # 코드 린팅
```

## 📝 라이선스

Private
