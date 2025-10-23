import { StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import Button from '../../../components/Button'

const ManagementScreen = () => {
  const router = useRouter()

  const handleAlertPress = () => {
    router.push('/management/alerts')
  }

  const handleCCTVPress = () => {
    router.push('/management/cctv')
  }

  return (
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
  )
}

export default ManagementScreen

const styles = StyleSheet.create({
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
