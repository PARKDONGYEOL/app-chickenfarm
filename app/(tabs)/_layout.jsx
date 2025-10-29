import { Ionicons } from '@expo/vector-icons'
import { Tabs, useRouter } from 'expo-router'
import * as SecureStore from "expo-secure-store"
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

const TabLayout = () => {
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkLogin = async () => {
      const loginInfo = await SecureStore.getItemAsync("loginInfo")

      if (!loginInfo) {
        router.replace("/authorization/signin")
      } else {
        setIsLoading(false)
      }
    }
    checkLogin()
  }, [])

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("loginInfo")
    router.replace("/authorization/signin")
  }

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>로그인 확인중...</Text>
      </View>
    )
  }

  return (
    <Tabs>
      <Tabs.Screen
        name="(home)"
        options={{
          title: "환경정보",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="control"
        options={{
          title: "제어",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="management"
        options={{
          title: "관리",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="folder" size={size} color={color} />
          )
        }}
      />
    </Tabs>
  )
}

export default TabLayout

const styles = StyleSheet.create({})
