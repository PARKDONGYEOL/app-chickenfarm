import { StyleSheet, Text, View } from 'react-native'

const ControlScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Control</Text>
    </View>
  )
}

export default ControlScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
})
