# Network Error 해결 가이드

"Error getting alerts for farm: [AxiosError: Network Error]" 오류가 발생했을 때 해결 방법입니다.

## 문제 원인

Network Error는 다음과 같은 이유로 발생합니다:
1. 백엔드 서버가 실행되지 않음
2. 잘못된 서버 주소
3. 네트워크 연결 문제
4. 방화벽 차단

## 해결 방법

### 1. 백엔드 서버 실행 확인 ⭐ (가장 흔한 원인)

```bash
# 백엔드 디렉토리로 이동
cd d:/01-STUDY/dev/backend_chickenFarm

# 서버 실행
./gradlew bootRun

# Windows에서
gradlew.bat bootRun
```

**서버가 정상적으로 실행되면 다음 메시지가 나타납니다:**
```
Tomcat started on port(s): 8080 (http)
Started ChickenFarmApplication in X.XXX seconds
```

### 2. 서버 접속 테스트

브라우저에서 다음 URL을 열어보세요:
```
http://192.168.30.152:8080/danger/list/1
```

**정상 응답:**
```json
{
  "success": true,
  "data": [...]
}
```

**에러 응답:** "사이트에 연결할 수 없음" → 서버가 꺼져있거나 주소가 틀림

### 3. 개발 환경에 맞는 서버 주소 설정

[services/api.js](services/api.js)에서 환경에 맞게 설정하세요:

#### 3-1. Android 에뮬레이터 사용 시

```javascript
// api.js
const BASE_URL = 'http://10.0.2.2:8080'
```

Android 에뮬레이터는 `10.0.2.2`가 호스트 컴퓨터의 localhost입니다.

#### 3-2. iOS 시뮬레이터 또는 Expo Go 사용 시

```javascript
// api.js
const BASE_URL = 'http://localhost:8080'
```

#### 3-3. 실제 기기 사용 시

컴퓨터의 IP 주소를 확인하세요:

**Windows:**
```bash
ipconfig
# IPv4 주소 확인 (예: 192.168.30.152)
```

**Mac/Linux:**
```bash
ifconfig
# inet 주소 확인
```

```javascript
// api.js
const BASE_URL = 'http://[컴퓨터IP]:8080'
// 예: http://192.168.30.152:8080
```

**주의:** 컴퓨터와 기기가 **같은 Wi-Fi 네트워크**에 연결되어야 합니다!

### 4. 방화벽 설정 확인

**Windows 방화벽:**
1. Windows 보안 → 방화벽 및 네트워크 보호
2. 고급 설정 → 인바운드 규칙
3. 새 규칙 → 포트 → TCP 8080 → 허용

**Mac 방화벽:**
```bash
# 시스템 환경설정 → 보안 및 개인 정보 보호 → 방화벽
```

### 5. CORS 설정 확인 (웹뷰 사용 시)

백엔드의 CORS 설정을 확인하세요:

```java
// backend_chickenFarm/src/.../CorsConfig.java
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

### 6. Expo/React Native 설정

#### Android - Clear Text Traffic 허용

`android/app/src/main/AndroidManifest.xml`:
```xml
<application
  android:usesCleartextTraffic="true"
  ...>
```

#### iOS - App Transport Security 설정

`ios/[프로젝트명]/Info.plist`:
```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <true/>
</dict>
```

### 7. 앱에서 Retry 버튼 사용

앱에 에러 메시지와 함께 "Retry" 버튼이 표시됩니다:
```
⚠️ 서버에 연결할 수 없습니다.
   백엔드 서버가 실행 중인지 확인하세요.

   [🔄 Retry]
```

서버를 실행한 후 "Retry" 버튼을 눌러보세요.

## 체크리스트

문제 해결을 위해 다음을 순서대로 확인하세요:

- [ ] 백엔드 서버가 실행 중인가? (`gradlew bootRun`)
- [ ] 브라우저에서 API 접속이 되나? (`http://192.168.30.152:8080/danger/list/1`)
- [ ] 컴퓨터와 기기가 같은 Wi-Fi에 연결되어 있나?
- [ ] `services/api.js`의 BASE_URL이 올바른가?
- [ ] 방화벽이 8080 포트를 차단하고 있지 않나?
- [ ] (Android) usesCleartextTraffic 설정이 되어 있나?

## 테스트 명령어

### 1. 서버 상태 확인
```bash
curl http://192.168.30.152:8080/danger/list/1
```

### 2. 포트 사용 확인
```bash
# Windows
netstat -ano | findstr :8080

# Mac/Linux
lsof -i :8080
```

## 여전히 안 된다면?

1. **백엔드 서버 재시작**
   ```bash
   # Ctrl+C로 중지 후
   gradlew bootRun
   ```

2. **앱 재시작**
   - Expo: `r` 키 눌러서 재시작
   - Metro: `r` 키 눌러서 재시작

3. **캐시 삭제**
   ```bash
   # Expo
   npx expo start -c

   # React Native
   npx react-native start --reset-cache
   ```

4. **로그 확인**
   - 백엔드: 콘솔에서 에러 메시지 확인
   - 앱: Metro bundler 콘솔에서 에러 확인

## 성공 시 화면

서버 연결이 성공하면 다음과 같이 표시됩니다:
```
Risk Alerts
[Today] [This Week] [This Month] [Custom]

7 alerts today
🔴 3 Critical  🟠 4 Warning

[알림 카드들...]
```

## 추가 도움말

더 자세한 내용은 다음 문서를 참고하세요:
- [services/README.md](services/README.md) - API 사용 가이드
- [components/management/README.md](components/management/README.md) - Risk Alerts 사용법
