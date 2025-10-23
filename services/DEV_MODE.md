# 개발 모드 설정 가이드

백엔드 서버 없이도 앱을 테스트할 수 있는 목업 데이터 모드입니다.

## 빠른 설정

### 1. 목업 데이터 모드 활성화 (현재 설정)

[services/api.js](api.js) 파일에서:

```javascript
export const USE_MOCK_DATA = true  // 목업 데이터 사용
```

이 설정으로 **백엔드 서버 없이** 앱을 테스트할 수 있습니다!

### 2. 실제 백엔드 API 사용

백엔드 서버를 실행한 후:

```javascript
export const USE_MOCK_DATA = false  // 실제 API 사용
```

## 목업 데이터 모드 (USE_MOCK_DATA = true)

### 장점
✅ 백엔드 서버 없이 즉시 테스트 가능
✅ 네트워크 문제 걱정 없음
✅ 빠른 개발 및 UI 테스트
✅ 7개 센서의 샘플 알림 데이터 제공

### 단점
❌ 실제 데이터 반영 안 됨
❌ 데이터베이스 연동 테스트 불가
❌ 실시간 센서 데이터 확인 불가

### 제공되는 목업 데이터

```javascript
1. 온도 알림 - "온도가 35도를 초과했습니다"
2. 암모니아 알림 - "NH3 농도가 30ppm을 초과했습니다"
3. 습도 알림 - "습도가 35%로 낮습니다"
4. 일산화탄소 알림 - "일산화탄소가 감지되었습니다"
5. 이산화탄소 알림 - "CO2 농도가 2500ppm을 초과했습니다"
6. 조도 알림 - "조도가 10 lux 이하입니다"
7. 이산화질소 알림 - "NO2가 0.5ppm 감지되었습니다"
```

## 실제 API 모드 (USE_MOCK_DATA = false)

### 장점
✅ 실제 데이터베이스 데이터 확인
✅ 실시간 센서 데이터 반영
✅ 전체 시스템 통합 테스트

### 단점
❌ 백엔드 서버 실행 필요
❌ 네트워크 설정 필요
❌ DB 연결 필요

### 필수 조건

1. **백엔드 서버 실행**
   ```bash
   cd d:/01-STUDY/dev/backend_chickenFarm
   gradlew bootRun
   ```

2. **네트워크 연결**
   - 컴퓨터와 기기가 같은 Wi-Fi에 연결
   - IP 주소 확인 및 설정

3. **데이터베이스 연결**
   - MariaDB 실행 중이어야 함
   - 올바른 DB 정보 설정

## 개발 워크플로우 권장 사항

### 초기 개발 단계
```javascript
USE_MOCK_DATA = true  // 목업 데이터로 UI 개발
```
- UI/UX 개발
- 컴포넌트 테스트
- 레이아웃 확인
- 기능 프로토타이핑

### 통합 테스트 단계
```javascript
USE_MOCK_DATA = false  // 실제 API로 테스트
```
- 백엔드 연동 테스트
- 데이터 흐름 확인
- 에러 처리 검증
- 성능 테스트

### 배포 전 단계
```javascript
USE_MOCK_DATA = false  // 반드시 실제 API 사용
```
- 프로덕션 환경과 동일하게 테스트
- 모든 기능 검증
- 엣지 케이스 테스트

## 모드 전환 방법

### 목업 모드로 전환

1. [services/api.js](api.js) 열기
2. `USE_MOCK_DATA` 를 `true`로 변경
3. 앱 새로고침 (Expo: `r` 키)

```javascript
export const USE_MOCK_DATA = true
```

### 실제 API 모드로 전환

1. 백엔드 서버 실행 확인
2. [services/api.js](api.js) 열기
3. `USE_MOCK_DATA` 를 `false`로 변경
4. 앱 새로고침 (Expo: `r` 키)

```javascript
export const USE_MOCK_DATA = false
```

## 로그 확인

콘솔에서 현재 모드를 확인할 수 있습니다:

### 목업 모드
```
[MOCK MODE] Returning mock danger notices
```

### 실제 API 모드
```
[API Request] GET /danger/list/1
[API Response] /danger/list/1 { success: true, data: [...] }
```

## 커스텀 목업 데이터 추가

[services/dangerNoticeService.js](dangerNoticeService.js)의 `MOCK_NOTICES` 배열을 수정:

```javascript
const MOCK_NOTICES = [
  {
    noticeNum: 8,  // 새 알림 추가
    noticeContent: '커스텀 알림 내용',
    noticeCategory: '온도',
    farmNum: 1,
    recTime: new Date().toISOString(),
  },
  // 기존 데이터...
]
```

## 문제 해결

### "Network Error" 여전히 발생

```javascript
// api.js에서 확인
export const USE_MOCK_DATA = true  // true로 설정되었는지 확인
```

앱을 완전히 재시작하세요.

### 목업 데이터가 표시되지 않음

1. Metro bundler 재시작
   ```bash
   # Ctrl+C로 중지 후
   npm start
   ```

2. 캐시 삭제
   ```bash
   npx expo start -c
   ```

### 실제 API 모드에서 에러

1. `USE_MOCK_DATA = false` 확인
2. 백엔드 서버 실행 확인
3. IP 주소 확인 (`BASE_URL`)

## 요약

| 모드 | USE_MOCK_DATA | 백엔드 필요 | 용도 |
|------|---------------|------------|------|
| 목업 | `true` | ❌ 불필요 | UI 개발, 빠른 테스트 |
| 실제 | `false` | ✅ 필요 | 통합 테스트, 배포 준비 |

**현재 설정**: `USE_MOCK_DATA = true` (목업 모드)

이제 **백엔드 서버 없이** Risk Alerts 화면을 테스트할 수 있습니다!
