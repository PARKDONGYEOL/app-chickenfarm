import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import ManualControl from './ManualControl'


const ControlScreen = () => {
  const router = useRouter()

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("loginInfo")
    router.replace("/authorization/signin")
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>제어</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.container}>
        <ManualControl />
      </View>
    </View>
  )
}

export default ControlScreen

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    fontFamily: 'System',
  },
  logoutText: {
    color: '#007AFF',
    fontSize: 16,
  },
  container: {
    flex: 1
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
})
