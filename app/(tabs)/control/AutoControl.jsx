import { StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native'
import React from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import Button from '../../../components/Button'
import { useRouter } from 'expo-router'

const AutoControl = () => {
  const router = useRouter();

  return (
    <TouchableWithoutFeedback>
      <View>
        <Text>뭐지이거</Text>
        <Button title='완료' onPress={() => router.back()}/>
      </View>
    </TouchableWithoutFeedback>
  )
}

export default AutoControl

const styles = StyleSheet.create({
})