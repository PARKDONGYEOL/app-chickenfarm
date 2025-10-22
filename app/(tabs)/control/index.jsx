import { StyleSheet, Text, TouchableWithoutFeedback, View } from 'react-native'
import ManualControl from './ManualControl'
import { SafeAreaView } from 'react-native-safe-area-context'


const ControlScreen = () => {


  return (
    <TouchableWithoutFeedback style={styles.container}>
        <ManualControl />
    </TouchableWithoutFeedback>
  )
}

export default ControlScreen

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
})
