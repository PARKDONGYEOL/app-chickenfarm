import { Tabs, useRouter } from 'expo-router'
import * as SecureStore from "expo-secure-store"
import { useEffect, useState } from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'

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
          headerStyle: {
            height: 90,
          },
          headerTitleStyle: {
            paddingBottom: 10
          },
          headerRight: () => (
            <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
              <Text style={{ color: '#007AFF', fontSize: 16 }}>로그아웃</Text>
            </TouchableOpacity>
          )
        }}
      />
      <Tabs.Screen
        name="control"
        options={{
          title: "control",
          headerStyle: {
            height: 90
          },
          headerTitleStyle: {
            paddingBottom: 10
          },
          headerRight: () => (
            <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
              <Text style={{ color: '#007AFF', fontSize: 16 }}>로그아웃</Text>
            </TouchableOpacity>
          )
        }}
      />
      <Tabs.Screen
        name="management"
        options={{
          title: "management",
          headerStyle: {
            height: 90
          },
          headerTitleStyle: {
            paddingBottom: 10
          },
          headerRight: () => (
            <TouchableOpacity onPress={handleLogout} style={{ marginRight: 15 }}>
              <Text style={{ color: '#007AFF', fontSize: 16 }}>로그아웃</Text>
            </TouchableOpacity>
          )
        }}
      />
    </Tabs>
  )
}

export default TabLayout

const styles = StyleSheet.create({})
