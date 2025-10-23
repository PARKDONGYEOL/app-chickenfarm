import { useState, useEffect } from 'react'
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import AlertCard from '../../../components/management/AlertCard'
import { getAlertsByPeriod, deleteDangerNotices } from '../../../services/dangerNoticeService'

const AlertsScreen = () => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('오늘')
  const [refreshing, setRefreshing] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedAlerts, setSelectedAlerts] = useState([])
  const [sensorFilter, setSensorFilter] = useState('전체')

  // 농장 번호 (실제로는 로그인 정보나 설정에서 가져와야 함)
  const FARM_NUM = 1

  // activeTab이 변경될 때마다 API 호출
  useEffect(() => {
    loadAlertsFromAPI()
  }, [activeTab])

  const loadAlertsFromAPI = async () => {
    setLoading(true)
    setError(null)
    try {
      // 탭에 따라 period 파라미터 결정
      let period = 'all'
      switch (activeTab) {
        case '오늘':
          period = 'day'
          break
        case '주간':
          period = 'week'
          break
        case '월간':
          period = 'month'
          break
        case '전체':
          period = 'all'
          break
      }

      // 백엔드 API에서 기간별 알림 데이터 가져오기
      const alertsFromAPI = await getAlertsByPeriod(FARM_NUM, period)
      setAlerts(alertsFromAPI)
      setError(null)
    } catch (err) {
      console.error('Failed to load alerts from API:', err)
      // 에러 메시지 설정
      if (err.message === 'Network Error') {
        setError('서버에 연결할 수 없습니다.\n백엔드 서버가 실행 중인지 확인하세요.')
      } else {
        setError('알림을 불러오는 중 오류가 발생했습니다.')
      }
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadAlertsFromAPI()
    setRefreshing(false)
  }

  const handleAlertPress = (alert) => {
    if (selectionMode) {
      // 선택 모드일 때는 선택/선택 해제
      toggleAlertSelection(alert.id)
    } else {
      console.log('Alert pressed:', alert)
      // 상세 화면으로 이동하거나 추가 액션 수행
    }
  }

  const handleAlertLongPress = (alert) => {
    // 롱프레스로 선택 모드 시작
    if (!selectionMode) {
      setSelectionMode(true)
      setSelectedAlerts([alert.id])
    }
  }

  const toggleAlertSelection = (alertId) => {
    setSelectedAlerts(prev => {
      if (prev.includes(alertId)) {
        const newSelection = prev.filter(id => id !== alertId)
        // 선택된 항목이 없으면 선택 모드 종료
        if (newSelection.length === 0) {
          setSelectionMode(false)
        }
        return newSelection
      } else {
        return [...prev, alertId]
      }
    })
  }

  const handleCancelSelection = () => {
    setSelectionMode(false)
    setSelectedAlerts([])
  }

  const handleDeleteSelected = async () => {
    if (selectedAlerts.length === 0) return

    try {
      // 백엔드 API 호출하여 삭제
      await deleteDangerNotices(selectedAlerts)
      console.log('Successfully deleted alerts:', selectedAlerts)

      // 삭제 후 UI에서 제거
      setAlerts(prev => prev.filter(alert => !selectedAlerts.includes(alert.id)))
      setSelectionMode(false)
      setSelectedAlerts([])
    } catch (error) {
      console.error('Failed to delete alerts:', error)
      // 에러 발생 시 사용자에게 알림 (필요시 Toast나 Alert 추가)
      alert('알림 삭제에 실패했습니다.')
    }
  }

  // 센서 필터링된 알림 목록
  const filteredAlerts = sensorFilter === '전체'
    ? alerts
    : alerts.filter(alert => alert.title === sensorFilter)

  const criticalCount = filteredAlerts.filter((a) => a.severity === 'Critical').length
  const warningCount = filteredAlerts.filter((a) => a.severity === 'Warning').length

  const tabs = ['오늘', '주간', '월간', '전체']
  const sensorTypes = ['전체', '온도', '습도', '조도', '암모니아', '이산화탄소', '일산화탄소', '이산화질소']

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          {selectionMode ? (
            <>
              <TouchableOpacity style={styles.backButton} onPress={handleCancelSelection}>
                <Ionicons name="close" size={24} color="#212121" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>{selectedAlerts.length}개 선택됨</Text>
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={handleDeleteSelected}
                disabled={selectedAlerts.length === 0}
              >
                <Ionicons name="trash" size={24} color={selectedAlerts.length > 0 ? "#FF4444" : "#BDBDBD"} />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={24} color="#212121" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>위험 알람</Text>
              <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
                <Ionicons name="refresh" size={24} color="#212121" />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Tab Filters - Period */}
        <View style={styles.tabContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScrollContent}
          >
            {tabs.map((tab) => (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  activeTab === tab && styles.activeTab,
                ]}
                onPress={() => setActiveTab(tab)}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.activeTabText,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Sensor Type Filters */}
        <View style={styles.sensorFilterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabScrollContent}
          >
            {sensorTypes.map((sensor) => (
              <TouchableOpacity
                key={sensor}
                style={[
                  styles.sensorTab,
                  sensorFilter === sensor && styles.activeSensorTab,
                ]}
                onPress={() => setSensorFilter(sensor)}
              >
                <Text
                  style={[
                    styles.sensorTabText,
                    sensorFilter === sensor && styles.activeSensorTabText,
                  ]}
                >
                  {sensor}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Alert Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>
              {filteredAlerts.length} alerts
            </Text>
            <View style={styles.summaryBadges}>
              {criticalCount > 0 && (
                <View style={styles.summaryBadge}>
                  <View style={[styles.badgeDot, { backgroundColor: '#FF4444' }]} />
                  <Text style={styles.badgeText}>{criticalCount} Critical</Text>
                </View>
              )}
              {warningCount > 0 && (
                <View style={styles.summaryBadge}>
                  <View style={[styles.badgeDot, { backgroundColor: '#FFA726' }]} />
                  <Text style={styles.badgeText}>{warningCount} Warning</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Alerts List */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>Loading alerts...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={64} color="#FF4444" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
                <Ionicons name="refresh" size={20} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : filteredAlerts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={64} color="#9E9E9E" />
              <Text style={styles.emptyText}>No alerts for this period</Text>
            </View>
          ) : (
            filteredAlerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onPress={() => handleAlertPress(alert)}
                onLongPress={() => handleAlertLongPress(alert)}
                isSelected={selectedAlerts.includes(alert.id)}
              />
            ))
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

export default AlertsScreen

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#212121',
  },
  refreshButton: {
    padding: 4,
  },
  deleteButton: {
    padding: 4,
  },
  tabContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  activeTab: {
    backgroundColor: '#2196F3',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#616161',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  sensorFilterContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sensorTab: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginRight: 8,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: '#81C784',
  },
  activeSensorTab: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  sensorTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#2E7D32',
  },
  activeSensorTabText: {
    color: '#FFFFFF',
  },
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  summaryBadges: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  badgeText: {
    fontSize: 14,
    color: '#616161',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 8,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  loadingText: {
    fontSize: 16,
    color: '#2196F3',
    marginTop: 16,
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 16,
    color: '#FF4444',
    marginTop: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#9E9E9E',
    marginTop: 16,
  },
})
