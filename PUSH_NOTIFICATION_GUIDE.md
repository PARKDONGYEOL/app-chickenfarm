# React Native Expo 푸시 알림(원격 알림) 구현 가이드

## 📋 목차
1. [개요](#개요)
2. [프론트엔드 설정](#프론트엔드-설정)
3. [백엔드 설정](#백엔드-설정)
4. [데이터베이스 설정](#데이터베이스-설정)
5. [테스트 방법](#테스트-방법)
6. [문제 해결](#문제-해결)

---

## 개요

이 프로젝트는 **Expo Push Notification**을 사용하여 양계장 IoT 센서 위험 알림을 실시간으로 모바일 디바이스에 전송합니다.

### 주요 기능
- ✅ 앱 실행 시 자동으로 푸시 토큰 발급 및 백엔드 등록
- ✅ 센서 위험 알림 발생 시 자동으로 모든 등록된 디바이스에 푸시 알림 전송
- ✅ 농장별 다중 디바이스 지원
- ✅ 플랫폼별 (iOS/Android) 알림 최적화

### 아키텍처 흐름
```
센서 데이터 → 백엔드 위험 감지 → DB 저장 → 푸시 토큰 조회 → Expo Push API 호출 → 모바일 디바이스
```

---

## 프론트엔드 설정

### 1. 필요한 패키지 설치 확인
```bash
cd d:/01-STUDY/dev/app-chickenfarm
npx expo install expo-notifications expo-device
```

### 2. app.json 설정 확인
[app.json](./app.json) 파일에 푸시 알림 플러그인이 추가되어 있습니다:

```json
{
  "expo": {
    "plugins": [
      ["expo-notifications", {
        "icon": "./assets/images/notification-icon.png",
        "color": "#2196F3"
      }]
    ]
  }
}
```

### 3. Expo 프로젝트 ID 확인 및 설정

#### Expo 프로젝트 ID 가져오기
```bash
# 방법 1: eas.json 파일 확인
cat eas.json

# 방법 2: Expo 대시보드에서 확인
# https://expo.dev → 프로젝트 선택 → Settings → Project ID

# 방법 3: 명령어로 확인
npx expo whoami
npx eas project:info
```

#### notificationService.js에서 프로젝트 ID 수정
[components/management/notificationService.js:41](./components/management/notificationService.js#L41) 파일에서:

```javascript
const projectId = '11d2c073-83a5-4a04-b664-bebb16c58411' // 실제 프로젝트 ID로 변경
```

**⚠️ 중요:** 이 ID는 반드시 실제 Expo 프로젝트 ID로 변경해야 합니다!

### 4. 앱 초기화 로직 확인
[app/_layout.jsx](./app/_layout.jsx)에서 앱 시작 시 자동으로 푸시 토큰을 발급하고 백엔드에 등록합니다.

### 5. 실제 디바이스 테스트 필수
**푸시 알림은 에뮬레이터/시뮬레이터에서 작동하지 않습니다!**

```bash
# Expo Go 앱 설치 (iOS/Android 스토어에서)
# 또는 개발 빌드 실행
npx expo run:android
npx expo run:ios
```

---

## 백엔드 설정

### 1. 데이터베이스 테이블 생성

#### MySQL 테이블 생성
[src/main/resources/sql/create_push_token_table.sql](../backend_chickenFarm/src/main/resources/sql/create_push_token_table.sql)

```sql
CREATE TABLE IF NOT EXISTS PUSH_TOKEN (
    TOKEN_ID INT AUTO_INCREMENT PRIMARY KEY,
    EXPO_PUSH_TOKEN VARCHAR(255) NOT NULL UNIQUE,
    FARM_NUM INT NOT NULL,
    DEVICE_ID VARCHAR(255),
    PLATFORM VARCHAR(20),
    CREATED_AT DATETIME DEFAULT CURRENT_TIMESTAMP,
    UPDATED_AT DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_farm_num (FARM_NUM)
);
```

실행 방법:
```bash
# MySQL 접속
mysql -u root -p

# 데이터베이스 선택
USE chicken_farm;

# SQL 파일 실행
source D:/01-STUDY/dev/backend_chickenFarm/src/main/resources/sql/create_push_token_table.sql;
```

### 2. 백엔드 파일 구조
```
backend_chickenFarm/
├── src/main/java/com/backend/chickenFarm/
│   ├── push_token/
│   │   ├── controller/
│   │   │   └── PushTokenController.java       # API 엔드포인트
│   │   ├── service/
│   │   │   ├── PushTokenService.java          # 토큰 관리
│   │   │   └── ExpoPushNotificationService.java # Expo API 호출
│   │   ├── dto/
│   │   │   └── PushTokenDTO.java
│   │   └── mapper/
│   │       └── PushTokenMapper.java
│   └── danger_notice/
│       └── service/
│           └── DangerNoticeService.java        # 푸시 알림 자동 전송 추가
└── src/main/resources/
    └── mapper/
        └── push-token-mapper.xml
```

### 3. Spring Boot 서버 재시작
```bash
cd d:/01-STUDY/dev/backend_chickenFarm
./gradlew bootRun
```

---

## API 엔드포인트

### 1. 푸시 토큰 등록
**POST** `/push-token/register`

**Request Body:**
```json
{
  "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "farmNum": 1,
  "deviceId": "iPhone 15 Pro",
  "platform": "ios"
}
```

**Response:**
```json
{
  "success": true,
  "message": "푸시 토큰이 등록되었습니다."
}
```

### 2. 테스트 푸시 알림 전송
**POST** `/push-token/test`

**Request Body:**
```json
{
  "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
  "title": "테스트 알림",
  "body": "푸시 알림이 정상적으로 작동합니다!",
  "data": {
    "type": "test"
  }
}
```

### 3. 농장의 모든 디바이스에 푸시 알림 전송
**POST** `/push-token/send-to-farm/{farmNum}`

**Request Body:**
```json
{
  "title": "온도 경고",
  "body": "온도가 35도를 초과했습니다",
  "data": {
    "sensorType": "temperature",
    "severity": "Critical"
  }
}
```

### 4. 위험 알림 자동 푸시 (자동 실행)
**POST** `/danger/insert`

위험 알림을 DB에 저장하면 **자동으로** 해당 농장의 모든 디바이스에 푸시 알림이 전송됩니다.

**Request Body:**
```json
{
  "noticeContent": "온도가 35도를 초과했습니다",
  "noticeCategory": "온도",
  "farmNum": 1
}
```

---

## 테스트 방법

### 1. 실제 디바이스에서 앱 실행
```bash
# 1. 백엔드 서버 실행
cd d:/01-STUDY/dev/backend_chickenFarm
./gradlew bootRun

# 2. 프론트엔드 실행
cd d:/01-STUDY/dev/app-chickenfarm
npx expo start

# 3. 스마트폰에서 Expo Go 앱으로 QR 코드 스캔
```

### 2. 콘솔에서 푸시 토큰 확인
앱이 실행되면 다음과 같은 로그가 출력됩니다:

```
[API Request] POST /push-token/register
Expo Push Token: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
Push token registered to backend successfully
```

### 3. 테스트 푸시 알림 전송 (Postman 사용)

#### 방법 1: Postman으로 테스트 API 호출
```
POST http://192.168.30.95:8080/push-token/test
Content-Type: application/json

{
  "expoPushToken": "ExponentPushToken[앱에서_출력된_토큰]",
  "title": "테스트 알림",
  "body": "푸시 알림이 정상 작동합니다!"
}
```

#### 방법 2: 위험 알림 생성으로 자동 푸시
```
POST http://192.168.30.95:8080/danger/insert
Content-Type: application/json

{
  "noticeContent": "온도가 35도를 초과했습니다",
  "noticeCategory": "온도",
  "farmNum": 1
}
```

### 4. 푸시 알림 수신 확인
- 스마트폰 화면 상단에 알림이 표시됩니다
- 앱이 백그라운드/종료 상태에서도 알림을 받을 수 있습니다

---

## 문제 해결

### 1. "Must use physical device for Push Notifications" 오류
**원인:** 에뮬레이터/시뮬레이터에서 실행 중
**해결:** 실제 스마트폰에서 Expo Go 앱으로 실행하세요

### 2. 푸시 토큰이 발급되지 않음
**해결 방법:**
```javascript
// notificationService.js에서 프로젝트 ID 확인
const projectId = 'YOUR_EXPO_PROJECT_ID' // 올바른 ID인지 확인
```

### 3. 푸시 알림이 전송되지 않음
**체크리스트:**
- [ ] 백엔드 서버가 실행 중인가?
- [ ] PUSH_TOKEN 테이블이 생성되었는가?
- [ ] 푸시 토큰이 DB에 정상 등록되었는가?
- [ ] 앱이 실제 디바이스에서 실행 중인가?
- [ ] 알림 권한이 허용되었는가?

**DB 확인:**
```sql
-- 등록된 푸시 토큰 확인
SELECT * FROM PUSH_TOKEN;

-- 특정 농장의 토큰 확인
SELECT * FROM PUSH_TOKEN WHERE FARM_NUM = 1;
```

### 4. "Invalid push token" 오류
**원인:** Expo 프로젝트 ID가 잘못되었거나 토큰 형식이 올바르지 않음
**해결:**
1. `npx eas project:info`로 올바른 프로젝트 ID 확인
2. notificationService.js의 `projectId` 값 수정
3. 앱 재시작

### 5. 백엔드에서 "RestTemplate" 오류
**원인:** Spring의 RestTemplate Bean이 없음
**해결:** ExpoPushNotificationService.java에서 이미 내부적으로 생성하므로 문제없음

---

## 알림 흐름도

```
┌─────────────────┐
│  모바일 앱 실행  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ 푸시 토큰 발급           │
│ (Expo Push Token)       │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 백엔드에 토큰 등록       │
│ POST /push-token/register│
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ PUSH_TOKEN 테이블에 저장 │
└─────────────────────────┘

... 시간 경과 ...

┌─────────────────────────┐
│ 센서 위험 감지           │
│ (온도 35도 초과)         │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 위험 알림 생성           │
│ POST /danger/insert      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ DANGER_NOTICE 테이블 저장│
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 농장의 푸시 토큰 조회    │
│ (PUSH_TOKEN 테이블)      │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ Expo Push API 호출       │
│ https://exp.host/.../send│
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│ 모바일 디바이스에       │
│ 푸시 알림 수신           │
└─────────────────────────┘
```

---

## 다음 단계

### 추가 구현 가능 기능
1. **알림 클릭 시 특정 화면 이동**
   - `app/_layout.jsx`의 `responseListener`에서 라우팅 추가

2. **알림 우선순위 설정**
   - Critical: 소리 + 진동
   - Warning: 진동만

3. **알림 히스토리 관리**
   - 읽음/안읽음 상태 관리
   - 알림 설정 ON/OFF

4. **예약 알림**
   - 특정 시간에 알림 전송
   - 반복 알림 (매일, 매주)

---

## 참고 자료
- [Expo Notifications 공식 문서](https://docs.expo.dev/push-notifications/overview/)
- [Expo Push Notifications 가이드](https://docs.expo.dev/push-notifications/sending-notifications/)
- [Expo Push API 레퍼런스](https://docs.expo.dev/push-notifications/sending-notifications-custom/)

---

## 작성자
- 날짜: 2024-10-23
- 프로젝트: app-chickenfarm (양계장 IoT 모니터링 시스템)