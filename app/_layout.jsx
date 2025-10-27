import { StyleSheet, Text, View, Platform } from 'react-native'
import React, { useEffect, useRef, useState } from 'react'
import { Stack } from 'expo-router'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import { registerForPushNotificationsAsync } from '../components/management/notificationService'
import { registerPushToken } from '../services/pushTokenService'

// app layout
const RootLayout = () => {
  const [expoPushToken, setExpoPushToken] = useState('')
  const notificationListener = useRef()
  const responseListener = useRef()

  useEffect(() => {
    // 푸시 알림 초기화
    initializePushNotifications()

    // 알림 리스너 설정
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      // 알림 수신 처리
    })

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      // 알림 클릭 시 특정 화면으로 이동하는 로직 추가 가능
    })

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current)
      Notifications.removeNotificationSubscription(responseListener.current)
    }
  }, [])

  const initializePushNotifications = async () => {
    // 실제 디바이스에서만 푸시 토큰 발급
    if (!Device.isDevice) {
      return
    }

    try {
      // 푸시 토큰 발급
      const token = await registerForPushNotificationsAsync()

      if (token) {
        setExpoPushToken(token)

        // 백엔드에 푸시 토큰 등록
        await registerPushToken({
          expoPushToken: token,
          farmNum: 1, // 실제로는 로그인한 사용자의 농장 번호
          deviceId: Device.deviceName || 'unknown',
          platform: Platform.OS,
        })
      }
    } catch (error) {
      // 에러 발생 시 무시
    }
  }

  return (
    <Stack screenOptions={{
      headerShown: false
    }}

    />
  )
}

export default RootLayout

const styles = StyleSheet.create({})