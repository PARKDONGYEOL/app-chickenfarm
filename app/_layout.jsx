import { StyleSheet, Text, View } from 'react-native'
import React from 'react'
import { Stack } from 'expo-router'

// app layout
const RootLayout = () => {
  return (
    <Stack screenOptions={{
      headerShown: false
    }}

    />
  )
}

export default RootLayout

const styles = StyleSheet.create({})