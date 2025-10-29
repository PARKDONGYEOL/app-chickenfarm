import { useRouter } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Button from '../../../components/Button'

const ManagementScreen = () => {
  const router = useRouter()

  const handleAlertPress = () => {
    router.push('/management/alerts')
  }

  const handleCCTVPress = () => {
    router.push('/(tabs)/(home)/management/cctv')
  }

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("loginInfo")
    router.replace("/authorization/signin")
  }

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Management</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>로그아웃</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.container}>
      <Text style={styles.title}>Management</Text>
      <Text style={styles.subtitle}>원하는 메뉴를 선택하세요</Text>

      <View style={styles.buttonContainer}>
        <Button
          title="알림 관리"
          icon="notifications-outline"
          variant="primary"
          onPress={handleAlertPress}
        />

        <Button
          title="CCTV 모니터링"
          icon="videocam-outline"
          variant="secondary"
          onPress={handleCCTVPress}
        />
      </View>
    </View>
    </View>
  )
}

export default ManagementScreen

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 40,
  },
  buttonContainer: {
    gap: 16,
    width: '100%',
    maxWidth: 300,
  },
})
