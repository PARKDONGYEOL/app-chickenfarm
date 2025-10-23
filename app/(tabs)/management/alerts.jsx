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
import { getAlertsByPeriod } from '../../../services/dangerNoticeService'

const AlertsScreen = () => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('오늘')
  const [refreshing, setRefreshing] = useState(false)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

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
    console.log('Alert pressed:', alert)
    // 상세 화면으로 이동하거나 추가 액션 수행
  }

  const criticalCount = alerts.filter((a) => a.severity === 'Critical').length
  const warningCount = alerts.filter((a) => a.severity === 'Warning').length

  const tabs = ['오늘', '주간', '월간', '전체']

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#212121" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Risk Alerts</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={24} color="#212121" />
          </TouchableOpacity>
        </View>

        {/* Tab Filters */}
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

        {/* Alert Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryText}>
            {alerts.length} alerts
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
          ) : alerts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="checkmark-circle-outline" size={64} color="#9E9E9E" />
              <Text style={styles.emptyText}>No alerts for this period</Text>
            </View>
          ) : (
            alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onPress={() => handleAlertPress(alert)}
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
  summaryContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
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
