# API Services Documentation

React Native 앱에서 backend_chickenFarm API를 사용하는 방법입니다.

## 파일 구조

```
services/
├── api.js                    # Axios 기본 설정
├── dangerNoticeService.js    # 위험 알림 API
└── README.md                 # 이 문서
```

## 백엔드 API 엔드포인트

### Base URL
- **개발 서버**: `http://192.168.30.152:8080`
- **프로덕션**: 배포 후 URL로 변경 필요

### Danger Notice API

#### 1. 알림 목록 조회
```
GET /danger/list/{farmNum}
```

**파라미터**:
- `farmNum` (number): 농장 번호

**응답**:
```json
{
  "success": true,
  "data": [
    {
      "noticeNum": 1,
      "noticeContent": "온도가 35도를 초과했습니다",
      "noticeCategory": "온도",
      "farmNum": 1,
      "recTime": "2025-10-21T10:30:00"
    }
  ]
}
```

#### 2. 알림 추가
```
POST /danger/insert
```

**요청 본문**:
```json
{
  "noticeContent": "암모니아 농도가 25ppm을 초과했습니다",
  "noticeCategory": "암모니아",
  "farmNum": 1
}
```

**응답**:
```json
{
  "success": true
}
```

## React Native에서 사용하기

### 1. API 서버 주소 변경

[api.js](api.js)에서 `BASE_URL`을 수정하세요:

```javascript
// 로컬 네트워크
const BASE_URL = 'http://192.168.30.152:8080'

// 또는 ngrok 사용 시
const BASE_URL = 'https://your-ngrok-url.ngrok.io'

// 프로덕션
const BASE_URL = 'https://your-production-api.com'
```

### 2. 알림 조회

```javascript
import { getAlertsForFarm } from '../services/dangerNoticeService'

const loadAlerts = async () => {
  try {
    const alerts = await getAlertsForFarm(1) // farmNum = 1
    console.log('Alerts:', alerts)
  } catch (error) {
    console.error('Error:', error)
  }
}
```

### 3. 알림 추가

```javascript
import { insertDangerNotice } from '../services/dangerNoticeService'

const addAlert = async () => {
  try {
    const success = await insertDangerNotice({
      noticeContent: '온도가 35도를 초과했습니다',
      noticeCategory: '온도',
      farmNum: 1
    })
    console.log('Success:', success)
  } catch (error) {
    console.error('Error:', error)
  }
}
```

## 센서 카테고리 매핑

백엔드의 `noticeCategory`와 앱의 `sensorType` 매핑:

| 백엔드 카테고리 | 앱 센서 타입 | 설명 |
|---------------|------------|------|
| 온도 | temperature | 온도 센서 |
| 습도 | humidity | 습도 센서 |
| 조도 | light | 조도 센서 |
| 암모니아, NH3 | ammonia | 암모니아 센서 |
| 이산화탄소, CO2 | co2 | 이산화탄소 센서 |
| 일산화탄소, CO | co | 일산화탄소 센서 |
| 이산화질소, NO2 | no2 | 이산화질소 센서 |

## 데이터 변환

백엔드 데이터는 자동으로 앱 형식으로 변환됩니다:

**백엔드 형식**:
```json
{
  "noticeNum": 1,
  "noticeContent": "온도가 35도를 초과했습니다",
  "noticeCategory": "온도",
  "farmNum": 1,
  "recTime": "2025-10-21T10:30:00"
}
```

**앱 형식** (자동 변환):
```javascript
{
  id: 1,
  sensorType: 'temperature',
  title: '온도 Alert',
  description: '온도가 35도를 초과했습니다',
  severity: 'Critical', // 내용에서 자동 판단
  timeAgo: '2 min ago', // 자동 계산
  timestamp: Date 객체
}
```

## 네트워크 설정

### Android 개발 환경

1. **같은 Wi-Fi 네트워크 사용**
   - 컴퓨터와 안드로이드 기기가 같은 Wi-Fi에 연결되어야 함
   - 백엔드 서버: `192.168.30.152:8080`

2. **Clear Text Traffic 허용**

   `android/app/src/main/AndroidManifest.xml`:
   ```xml
   <application
     android:usesCleartextTraffic="true"
     ...>
   ```

### iOS 개발 환경

1. **같은 Wi-Fi 네트워크 사용**

2. **ATS (App Transport Security) 설정**

   `ios/[프로젝트명]/Info.plist`:
   ```xml
   <key>NSAppTransportSecurity</key>
   <dict>
     <key>NSAllowsArbitraryLoads</key>
     <true/>
   </dict>
   ```

### Expo 사용 시

Expo Go 앱을 사용하면 자동으로 로컬 네트워크 접근이 가능합니다.

## 트러블슈팅

### 1. "Network request failed" 오류

**원인**:
- 백엔드 서버가 실행되지 않음
- 네트워크 연결 문제
- 잘못된 URL

**해결**:
```javascript
// 1. 백엔드 서버 실행 확인
// backend_chickenFarm에서:
./gradlew bootRun

// 2. 브라우저에서 테스트
http://192.168.30.152:8080/danger/list/1

// 3. URL 확인
console.log('API URL:', api.defaults.baseURL)
```

### 2. CORS 오류

백엔드에서 CORS 설정 확인:

```java
// CorsConfig.java
@Configuration
public class CorsConfig {
  @Bean
  public WebMvcConfigurer corsConfigurer() {
    return new WebMvcConfigurer() {
      @Override
      public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**")
          .allowedOrigins("*")
          .allowedMethods("*");
      }
    };
  }
}
```

### 3. 타임아웃 오류

타임아웃 시간 늘리기:

```javascript
// api.js
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000, // 30초로 증가
})
```

## 프로덕션 배포 시 체크리스트

- [ ] BASE_URL을 프로덕션 서버로 변경
- [ ] HTTPS 사용 (HTTP는 보안상 위험)
- [ ] 인증 토큰 추가 (필요시)
- [ ] 에러 처리 강화
- [ ] 로딩 상태 표시
- [ ] 오프라인 모드 지원 (필요시)

## 예제 코드

전체 사용 예제는 [app/(tabs)/management/index.jsx](../app/(tabs)/management/index.jsx)를 참고하세요.
