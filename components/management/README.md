# Risk Alerts Management System

닭농장 관리를 위한 7개 센서 기반 위험 알림 시스템입니다.

## 센서 타입

1. **Temperature (온도)** - °C 단위
   - Warning: 32°C 이상
   - Critical: 35°C 이상

2. **Humidity (습도)** - % 단위
   - Warning: 70% 이상
   - Critical: 80% 이상

3. **Light (조도)** - lux 단위
   - Warning: 10 lux 이하
   - Critical: 5 lux 이하

4. **Ammonia (암모니아)** - ppm 단위
   - Warning: 20ppm 이상
   - Critical: 25ppm 이상

5. **CO2 (이산화탄소)** - ppm 단위
   - Warning: 2500ppm 이상
   - Critical: 3000ppm 이상

6. **CO (일산화탄소)** - ppm 단위
   - Warning: 35ppm 이상
   - Critical: 50ppm 이상

7. **NO2 (이산화질소)** - ppm 단위
   - Warning: 0.5ppm 이상
   - Critical: 1.0ppm 이상

## 컴포넌트 구조

```
components/management/
├── AlertCard.jsx              # 개별 알림 카드 컴포넌트
├── notificationService.js     # 알림 서비스 유틸리티
├── SensorMonitor.jsx          # 센서 모니터링 컴포넌트
└── README.md                  # 문서

app/(tabs)/management/
├── index.jsx                  # Risk Alerts 메인 화면
└── _layout.jsx                # 레이아웃 설정
```

## 사용 방법

### 1. Risk Alerts 화면

메인 화면에서 7개 센서의 알림을 확인할 수 있습니다.

```jsx
import ManagementScreen from './app/(tabs)/management'

// 자동으로 Today/This Week/This Month/Custom 필터 제공
<ManagementScreen />
```

### 2. 센서 모니터링 및 알림

센서 데이터를 실시간으로 모니터링하고 임계값 초과 시 자동으로 알림을 전송합니다.

```jsx
import SensorMonitor from './components/management/SensorMonitor'
import { useState } from 'react'

const App = () => {
  const [sensorData, setSensorData] = useState({
    temperature: { value: 28, location: 'Zone A' },
    humidity: { value: 65, location: 'Zone B' },
    light: { value: 150, location: 'Building 1' },
    ammonia: { value: 15, location: 'Building 2' },
    co2: { value: 1200, location: 'Zone C' },
    co: { value: 10, location: 'Ventilation System' },
    no2: { value: 0.2, location: 'Zone D' },
  })

  const handleAlertGenerated = (alert) => {
    console.log('New alert:', alert)
    // 알림 목록에 추가하거나 데이터베이스에 저장
  }

  return (
    <View>
      <SensorMonitor
        sensorData={sensorData}
        onAlertGenerated={handleAlertGenerated}
      />
      {/* 나머지 UI */}
    </View>
  )
}
```

### 3. 수동 알림 전송

필요한 경우 직접 알림을 전송할 수도 있습니다.

```jsx
import { sendSensorAlert } from './components/management/notificationService'

const sendCustomAlert = async () => {
  await sendSensorAlert({
    sensorType: 'temperature',
    title: 'Temperature Alert',
    description: 'Temperature is too high!',
    severity: 'Critical'
  })
}
```

## 주요 기능

### 1. 탭 필터
- **Today**: 오늘의 알림만 표시
- **This Week**: 최근 7일 알림 표시
- **This Month**: 최근 30일 알림 표시
- **Custom**: 모든 알림 표시

### 2. 알림 요약
- 전체 알림 개수
- Critical 알림 개수 (빨간색)
- Warning 알림 개수 (주황색)

### 3. 새로고침
- Pull-to-refresh 지원
- 헤더의 새로고침 버튼

### 4. 모바일 푸시 알림
- 앱이 백그라운드에 있어도 알림 수신
- Critical 알림은 소리 + 진동
- Warning 알림은 진동만

## API 참조

### notificationService.js

#### `registerForPushNotificationsAsync()`
알림 권한을 요청합니다.

```javascript
await registerForPushNotificationsAsync()
```

#### `sendSensorAlert(sensorData)`
센서 알림을 전송합니다.

```javascript
await sendSensorAlert({
  sensorType: 'temperature',
  title: 'Temperature Alert',
  description: 'Temperature is too high!',
  severity: 'Critical'
})
```

#### `monitorSensorData(sensorType, value, location)`
센서 데이터를 모니터링하고 임계값 초과 시 알림을 전송합니다.

```javascript
const alert = await monitorSensorData('temperature', 36, 'Zone A')
```

#### `checkSensorThresholds(sensorType, value)`
센서 값이 임계값을 초과했는지 확인합니다.

```javascript
const severity = checkSensorThresholds('temperature', 36)
// 'Critical', 'Warning', or null
```

## 설정

### app.json

알림 기능을 사용하려면 `app.json`에 다음을 추가하세요:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ]
  }
}
```

### Android 권한

Android에서는 알림 채널이 자동으로 생성됩니다.

### iOS 권한

iOS에서는 첫 실행 시 알림 권한을 요청합니다.

## 커스터마이징

### 임계값 변경

`notificationService.js`의 `checkSensorThresholds` 함수에서 임계값을 수정할 수 있습니다:

```javascript
const thresholds = {
  temperature: { critical: 35, warning: 32 }, // 여기서 변경
  // ...
}
```

### 알림 스타일 변경

`AlertCard.jsx`에서 색상과 스타일을 커스터마이징할 수 있습니다:

```javascript
const getSeverityColor = (severity) => {
  switch (severity) {
    case 'Critical':
      return '#FF4444' // 빨간색
    case 'Warning':
      return '#FFA726' // 주황색
    // ...
  }
}
```

## 향후 개발 계획

- [ ] 실시간 센서 데이터 연동 (WebSocket/MQTT)
- [ ] 알림 히스토리 데이터베이스 저장
- [ ] 알림 설정 화면 (임계값 조정)
- [ ] 센서별 그래프 및 통계
- [ ] 다국어 지원
- [ ] 알림 필터링 및 검색
