import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'

// 알림 설정
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

// 알림 권한 요청
export const registerForPushNotificationsAsync = async () => {
  let token

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    })
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    alert('Failed to get push token for push notification!')
    return
  }

  return finalStatus
}

// 센서 알림 전송
export const sendSensorAlert = async (sensorData) => {
  const { sensorType, title, description, severity } = sensorData

  // 심각도에 따른 우선순위 설정
  const priority = severity === 'Critical'
    ? Notifications.AndroidNotificationPriority.MAX
    : Notifications.AndroidNotificationPriority.HIGH

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `${getSensorEmoji(sensorType)} ${title}`,
      body: description,
      data: {
        sensorType,
        severity,
        timestamp: new Date().toISOString()
      },
      priority: priority,
      sound: severity === 'Critical' ? 'default' : null,
      vibrate: severity === 'Critical' ? [0, 250, 250, 250] : [0, 100],
    },
    trigger: null, // 즉시 전송
  })
}

// 센서 타입별 이모지
const getSensorEmoji = (sensorType) => {
  switch (sensorType) {
    case 'temperature':
      return '🌡️'
    case 'humidity':
      return '💧'
    case 'light':
      return '💡'
    case 'ammonia':
      return '⚠️'
    case 'co2':
      return '☁️'
    case 'co':
      return '🔴'
    case 'no2':
      return '⚡'
    default:
      return '🔔'
  }
}

// 센서 타입별 임계값 체크
export const checkSensorThresholds = (sensorType, value) => {
  const thresholds = {
    temperature: { critical: 35, warning: 32 }, // °C
    humidity: { critical: 80, warning: 70 }, // %
    light: { critical: 5, warning: 10 }, // lux
    ammonia: { critical: 25, warning: 20 }, // ppm
    co2: { critical: 3000, warning: 2500 }, // ppm
    co: { critical: 50, warning: 35 }, // ppm
    no2: { critical: 1.0, warning: 0.5 }, // ppm
  }

  const threshold = thresholds[sensorType]

  if (!threshold) return null

  if (value >= threshold.critical) {
    return 'Critical'
  } else if (value >= threshold.warning) {
    return 'Warning'
  }

  return null
}

// 센서 데이터 모니터링 및 알림
export const monitorSensorData = async (sensorType, value, location) => {
  const severity = checkSensorThresholds(sensorType, value)

  if (!severity) return // 정상 범위

  const alertData = {
    sensorType,
    title: getSensorAlertTitle(sensorType, severity),
    description: getSensorAlertDescription(sensorType, value, location),
    severity,
  }

  await sendSensorAlert(alertData)

  return alertData
}

// 센서별 알림 제목 생성
const getSensorAlertTitle = (sensorType, severity) => {
  const titles = {
    temperature: 'Temperature Anomaly',
    humidity: 'Humidity Alert',
    light: 'Light Intensity Alert',
    ammonia: 'Ammonia Level High',
    co2: 'CO2 Level Warning',
    co: 'CO Detection',
    no2: 'NO2 Detection',
  }
  return titles[sensorType] || 'Sensor Alert'
}

// 센서별 알림 설명 생성
const getSensorAlertDescription = (sensorType, value, location) => {
  const descriptions = {
    temperature: `Temperature ${value}°C in ${location}`,
    humidity: `Humidity ${value}% in ${location}`,
    light: `Illumination ${value} lux in ${location}`,
    ammonia: `NH3 concentration at ${value}ppm in ${location}`,
    co2: `CO2 concentration at ${value}ppm in ${location}`,
    co: `Carbon monoxide detected at ${value}ppm in ${location}`,
    no2: `Nitrogen dioxide detected at ${value}ppm in ${location}`,
  }
  return descriptions[sensorType] || `Alert in ${location}`
}

// 알림 리스너 설정
export const setupNotificationListeners = (responseHandler) => {
  // 알림 클릭 시 처리
  const subscription = Notifications.addNotificationResponseReceivedListener(responseHandler)

  return subscription
}
