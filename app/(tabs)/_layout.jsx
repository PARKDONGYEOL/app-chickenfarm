import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Tabs } from 'expo-router'

const TabLayout = () => {
  return (
    <Tabs>
      <Tabs.Screen
        name="(home)"
        options={{
          title: "home"
        }}
      />
      <Tabs.Screen
        name="control"
        options={{
          title: "control"
        }}
      />
      <Tabs.Screen
        name="management"
        options={{
          headerShown: false
        }}
      />
    </Tabs>
  )
}

export default TabLayout

const styles = StyleSheet.create({})