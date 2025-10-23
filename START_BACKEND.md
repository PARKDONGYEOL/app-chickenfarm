# 백엔드 서버 실행 가이드

React Native 앱을 테스트하기 전에 **반드시** 백엔드 서버를 실행해야 합니다.

## 빠른 시작

### 1. 백엔드 서버 실행

새 터미널을 열고:

```bash
cd d:/01-STUDY/dev/backend_chickenFarm
gradlew bootRun
```

**Windows에서:**
```bash
cd d:\01-STUDY\dev\backend_chickenFarm
gradlew.bat bootRun
```

### 2. 서버 실행 확인

콘솔에 다음 메시지가 나타나면 성공:

```
  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::

...
Tomcat started on port(s): 8080 (http)
Started ChickenFarmApplication in X.XXX seconds
```

### 3. 브라우저에서 테스트

```
http://192.168.30.95:8080/danger/list/1
```

정상 응답:
```json
{
  "success": true,
  "data": [...]
}
```

### 4. React Native 앱 실행

다른 터미널에서:

```bash
cd d:\01-STUDY\dev\app-chickenfarm
npm start
```

## 문제 해결

### "Address already in use" 오류

포트 8080이 이미 사용 중입니다.

**Windows에서 프로세스 종료:**
```bash
# 8080 포트 사용 프로세스 찾기
netstat -ano | findstr :8080

# PID 확인 후 종료
taskkill /PID [PID번호] /F
```

### "Could not resolve com.mysql.jdbc.Driver" 오류

데이터베이스 연결 문제입니다. `application.properties` 확인:

```properties
spring.datasource.url=jdbc:log4jdbc:mariadb://192.168.30.152:3306/team_db
spring.datasource.username=psh
spring.datasource.password=mariadb
```

### 서버가 느리게 시작됨

첫 실행 시 Gradle이 의존성을 다운로드하므로 시간이 걸립니다.

## 개발 워크플로우

### 터미널 1: 백엔드 서버
```bash
cd d:/01-STUDY/dev/backend_chickenFarm
gradlew bootRun
```

### 터미널 2: React Native 앱
```bash
cd d:/01-STUDY/dev/app-chickenfarm
npm start
```

### 터미널 3: 테스트/명령어
```bash
# API 테스트
curl http://192.168.30.95:8080/danger/list/1

# 로그 확인 등
```

## 중요 사항

1. ✅ **백엔드 먼저 실행** - 앱 실행 전 백엔드가 켜져있어야 함
2. ✅ **같은 Wi-Fi** - 컴퓨터와 휴대폰이 같은 네트워크에 연결
3. ✅ **방화벽 확인** - Windows 방화벽이 8080 포트 차단하지 않도록
4. ✅ **IP 주소 확인** - 컴퓨터 IP가 변경되면 `services/api.js` 수정

## 현재 설정

- **백엔드 서버**: `http://192.168.30.95:8080`
- **API 엔드포인트**: `/danger/list/{farmNum}`
- **데이터베이스**: MariaDB @ 192.168.30.152:3306

## 서버 종료

백엔드 서버 터미널에서:
- Windows: `Ctrl + C`
- Mac/Linux: `Ctrl + C`

## 자동 재시작 (선택사항)

코드 변경 시 자동 재시작을 원하면:

`build.gradle`에 추가:
```gradle
dependencies {
    developmentOnly 'org.springframework.boot:spring-boot-devtools'
}
```

그 다음:
```bash
gradlew bootRun
```

파일 변경 시 자동으로 재시작됩니다.

## 다음 단계

1. ✅ 백엔드 서버 실행 완료
2. ➡️ React Native 앱에서 "Retry" 버튼 클릭
3. ✅ 알림 데이터 확인

문제가 계속되면 [TROUBLESHOOTING.md](TROUBLESHOOTING.md)를 참고하세요.
