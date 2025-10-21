import { StyleSheet, Text, View } from 'react-native'

const ManagementScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Management</Text>
    </View>
  )
}

export default ManagementScreen

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
