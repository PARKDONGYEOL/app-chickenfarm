import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'
import {
  registerForPushNotificationsAsync,
  monitorSensorData,
  setupNotificationListeners,
} from './notificationService'

/**
 * SensorMonitor Component
 *
 * 7개 센서 데이터를 모니터링하고 임계값 초과 시 알림을 전송합니다.
 *
 * 사용 예시:
 * <SensorMonitor
 *   sensorData={sensorData}
 *   onAlertGenerated={(alert) => console.log('Alert:', alert)}
 * />
 */
const SensorMonitor = ({ sensorData, onAlertGenerated }) => {
  const appState = useRef(AppState.currentState)
  const previousValues = useRef({})

  useEffect(() => {
    // 알림 권한 요청
    registerForPushNotificationsAsync()

    // 알림 클릭 리스너 설정
    const subscription = setupNotificationListeners((response) => {
      const { sensorType, severity, timestamp } = response.notification.request.content.data
      console.log('Notification clicked:', { sensorType, severity, timestamp })

      // 알림 클릭 시 처리 (예: 상세 화면으로 이동)
      if (onAlertGenerated) {
        onAlertGenerated({
          sensorType,
          severity,
          timestamp,
        })
      }
    })

    // AppState 변경 감지
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        console.log('App has come to the foreground!')
      }
      appState.current = nextAppState
    })

    return () => {
      subscription.remove()
      appStateSubscription.remove()
    }
  }, [])

  useEffect(() => {
    if (!sensorData) return

    // 센서 데이터 모니터링
    Object.keys(sensorData).forEach(async (sensorType) => {
      const currentValue = sensorData[sensorType].value
      const location = sensorData[sensorType].location || 'Unknown Location'
      const previousValue = previousValues.current[sensorType]

      // 값이 변경되었을 때만 체크
      if (previousValue !== currentValue) {
        const alert = await monitorSensorData(sensorType, currentValue, location)

        if (alert && onAlertGenerated) {
          onAlertGenerated(alert)
        }

        previousValues.current[sensorType] = currentValue
      }
    })
  }, [sensorData, onAlertGenerated])

  return null // UI 없는 컴포넌트
}

export default SensorMonitor

/**
 * 사용 예시:
 *
 * const [sensorData, setSensorData] = useState({
 *   temperature: { value: 28, location: 'Zone A' },
 *   humidity: { value: 65, location: 'Zone B' },
 *   light: { value: 150, location: 'Building 1' },
 *   ammonia: { value: 15, location: 'Building 2' },
 *   co2: { value: 1200, location: 'Zone C' },
 *   co: { value: 10, location: 'Ventilation System' },
 *   no2: { value: 0.2, location: 'Zone D' },
 * })
 *
 * const handleAlertGenerated = (alert) => {
 *   console.log('New alert generated:', alert)
 *   // 알림 목록에 추가하거나 다른 처리
 * }
 *
 * return (
 *   <View>
 *     <SensorMonitor
 *       sensorData={sensorData}
 *       onAlertGenerated={handleAlertGenerated}
 *     />
 *     {/* 다른 컴포넌트들 */}
 *   </View>
 * )
 */
