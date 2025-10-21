import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Tabs } from 'expo-router'

const TabLayout = () => {
  return (
    <Tabs>
      <Tabs.Screen
        name="(home)"
        options={{
          title: "환경정보",
          headerStyle: {
            height: 90, // 원하는 
          },
          headerTitleStyle: {
            paddingBottom: 10
          }
        }}
      />
      <Tabs.Screen
        name="control"
        options={{
          title: "control",
          headerStyle: {
            height: 90  // 원하는 높이
          },
          headerTitleStyle: {
            paddingBottom: 10
          }
        }}
      />
      <Tabs.Screen
        name="management"
        options={{
          title: "management",
          headerStyle: {
            height: 90  // 원하는 높이
          },
          headerTitleStyle: {
            paddingBottom: 10
          }
        }}
      />
    </Tabs>
  )
}

export default TabLayout

const styles = StyleSheet.create({})