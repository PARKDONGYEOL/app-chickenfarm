import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

// WebSocket 설정
const WS_CONFIG = {
  HOST: '192.168.30.76',
  PORT: 9001,
}

const Kiosk = () => {
  const router = useRouter()
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState([])
  const wsRef = useRef(null)
  const messageIdCounter = useRef(0)
  
  // 통신로그 모달 상태
  const [logModalVisible, setLogModalVisible] = useState(false)

  // 릴레이 상태
  const [heaterOn, setHeaterOn] = useState(false)
  const [fans, setFans] = useState([false, false, false, false])
  const [windows, setWindows] = useState([false, false, false, false])
  const [currentTemp, setCurrentTemp] = useState(0)
  const [targetTemp, setTargetTemp] = useState(25)
  const [humidity, setHumidity] = useState(0)
  const [mode, setMode] = useState('자동')
  const [bleConnected, setBleConnected] = useState(false)

  useEffect(() => {
    return () => {
      if (wsRef.current) {
        disconnectWS()
      }
    }
  }, [])

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString('ko-KR')
    messageIdCounter.current += 1
    const uniqueId = `msg_${messageIdCounter.current}_${Math.random().toString(36).substring(2, 15)}`
    setMessages((prev) => [
      ...prev,
      { timestamp, message, type, id: uniqueId },
    ])
  }

  const connectWS = async () => {
    try {
      addLog('WebSocket 연결 시도 중...', 'info')
      const wsUrl = `ws://${WS_CONFIG.HOST}:${WS_CONFIG.PORT}`
      addLog(`서버: ${wsUrl}`, 'info')
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        addLog('✅ WebSocket 연결 성공', 'success')
        setIsConnected(true)
        const connectMsg = {
          type: 'connect',
          clientId: `android_expo_${Math.random().toString(16).substring(2, 10)}`,
          timestamp: new Date().toISOString(),
        }
        ws.send(JSON.stringify(connectMsg))
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          addLog(`📩 수신: ${data.type}`, 'receive')

          if (data.type === 'welcome') {
            addLog(`✅ ${data.message}`, 'success')
          } else if (data.type === 'status') {
            const status = data.data
            setHeaterOn(status.heater)
            setFans(status.fans)
            setWindows(status.windows)
            setCurrentTemp(status.current_temp)
            setTargetTemp(status.target_temp)
            setHumidity(status.humidity)
            setMode(status.mode)
            setBleConnected(status.ble_connected)
            addLog(`🔄 상태 업데이트: 온도 ${status.current_temp}°C, 습도 ${status.humidity}%`, 'info')
          } else if (data.type === 'control_response') {
            if (data.success) {
              addLog(`✅ 제어 성공: ${data.device}`, 'success')
            } else {
              const errorMsg = data.error || '제어 실패'
              addLog(`❌ ${errorMsg}`, 'error')
              if (data.error) {
                Alert.alert('제어 불가', data.error)
              }
            }
          } else if (data.type === 'mode_change_response') {
            if (data.success) {
              addLog(`✅ 모드 변경: ${data.mode}`, 'success')
            } else {
              addLog(`❌ 모드 변경 실패: ${data.error}`, 'error')
              Alert.alert('모드 변경 실패', data.error)
            }
          } else if (data.type === 'target_temp_response') {
            if (data.success) {
              addLog(`✅ 목표 온도 변경: ${data.temperature}°C`, 'success')
            } else {
              addLog(`❌ 온도 변경 실패: ${data.error}`, 'error')
              Alert.alert('온도 변경 실패', data.error)
            }
          }
        } catch (e) {
          addLog(`텍스트: ${event.data}`, 'info')
        }
      }

      ws.onerror = (error) => {
        addLog(`❌ WebSocket 오류: ${error.message || '연결 실패'}`, 'error')
        setIsConnected(false)
      }

      ws.onclose = (event) => {
        addLog(`🔌 연결 종료 (코드: ${event.code})`, 'info')
        setIsConnected(false)
      }

      wsRef.current = ws
    } catch (error) {
      addLog(`❌ 연결 예외: ${error.message}`, 'error')
      Alert.alert('연결 실패', error.message)
    }
  }

  const disconnectWS = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
      setIsConnected(false)
      addLog('연결 해제됨', 'info')
    }
  }

  const sendMessage = (message) => {
    if (!wsRef.current || !isConnected) {
      Alert.alert('오류', 'WebSocket에 연결되지 않았습니다')
      return
    }

    try {
      const payload = typeof message === 'object' ? JSON.stringify(message) : message
      wsRef.current.send(payload)
      addLog(`📤 전송: ${payload}`, 'send')
    } catch (error) {
      addLog(`전송 오류: ${error.message}`, 'error')
    }
  }

  const controlRelay = (device, index, state) => {
    const command = {
      type: 'control',
      device: device,
      index: index,
      state: state,
    }
    sendMessage(command)
  }

  const toggleHeater = () => {
    controlRelay('heater', 0, !heaterOn)
  }

  const toggleFan = (index) => {
    const newFans = [...fans]
    newFans[index] = !newFans[index]
    controlRelay('fan', index, newFans[index])
  }

  const toggleWindow = (index) => {
    const newWindows = [...windows]
    newWindows[index] = !newWindows[index]
    controlRelay('window', index, newWindows[index])
  }

  const requestStatus = () => {
    sendMessage({ type: 'get_status' })
  }

  const changeMode = (newMode) => {
    sendMessage({
      type: 'set_mode',
      mode: newMode
    })
  }

  const changeTargetTemp = (delta) => {
    const newTemp = targetTemp + delta
    if (newTemp >= 15 && newTemp <= 35) {
      sendMessage({
        type: 'set_target_temp',
        temperature: newTemp
      })
    } else {
      Alert.alert('온도 범위 초과', '목표 온도는 15°C ~ 35°C 범위 내에서 설정 가능합니다.')
    }
  }

  const clearLogs = () => {
    setMessages([])
  }

  const onRefresh = async () => {
    if (isConnected) {
      disconnectWS()
    }
    clearLogs()
  }

  const getMessageColor = (type) => {
    switch (type) {
      case 'success':
        return '#4CAF50'
      case 'error':
        return '#F44336'
      case 'warning':
        return '#FF9800'
      case 'send':
        return '#2196F3'
      case 'receive':
        return '#9C27B0'
      default:
        return '#616161'
    }
  }

  return (
    <View style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>키오스크 제어</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#212121" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* 연결 상태 */}
        <View style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={[styles.statusIndicator, isConnected ? styles.statusConnected : styles.statusDisconnected]} />
            <Text style={styles.statusText}>{isConnected ? '연결됨' : '연결 안됨'}</Text>
            <TouchableOpacity 
              style={styles.logButton}
              onPress={() => setLogModalVisible(true)}
            >
              <Text style={styles.logButtonText}>통신로그</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.statusInfo}>서버: {WS_CONFIG.HOST}:{WS_CONFIG.PORT}</Text>

          {/* 연결 버튼 */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.connectButton, isConnected && styles.buttonDisabled]}
              onPress={connectWS}
              disabled={isConnected}
            >
              <Text style={styles.buttonText}>연결</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.disconnectButton, !isConnected && styles.buttonDisabled]}
              onPress={disconnectWS}
              disabled={!isConnected}
            >
              <Text style={styles.buttonText}>연결 해제</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* 키오스크 상태 및 릴레이 제어 */}
        {isConnected && (
          <View style={styles.controlCard}>
            <Text style={styles.cardTitle}>키오스크 제어</Text>

            {/* 모드 선택 버튼 (상단) */}
            <View style={styles.modeSection}>
              <Text style={styles.modeLabel}>제어 모드:</Text>
              <View style={styles.modeButtonRow}>
                <TouchableOpacity
                  style={[styles.modeButton, mode === '자동' && styles.modeButtonActive]}
                  onPress={() => changeMode('자동')}
                >
                  <Text style={[styles.modeButtonText, mode === '자동' && styles.modeButtonTextActive]}>자동</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeButton, mode === '수동' && styles.modeButtonActive]}
                  onPress={() => changeMode('수동')}
                >
                  <Text style={[styles.modeButtonText, mode === '수동' && styles.modeButtonTextActive]}>수동</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeButton, mode === '반자동' && styles.modeButtonActive]}
                  onPress={() => changeMode('반자동')}
                >
                  <Text style={[styles.modeButtonText, mode === '반자동' && styles.modeButtonTextActive]}>반자동</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* 온도 표시 - 자동/반자동일 때만 표시 */}
            {(mode === '자동' || mode === '반자동') && (
              <View style={styles.temperatureSection}>
                <View style={styles.currentTempContainer}>
                  <Text style={styles.currentTempLabel}>현재 온도</Text>
                  <Text style={styles.currentTempValue}>{currentTemp.toFixed(1)}°C</Text>
                </View>
                
                <View style={styles.targetTempContainer}>
                  <Text style={styles.targetTempLabel}>목표 온도</Text>
                  <Text style={styles.targetTempValue}>{targetTemp.toFixed(1)}°C</Text>
                  
                  {/* +/- 버튼을 숫자 바로 아래에 배치 */}
                  <View style={styles.targetTempButtonRow}>
                    <TouchableOpacity 
                      style={styles.tempButtonNew}
                      onPress={() => changeTargetTemp(-1)}
                    >
                      <Text style={styles.tempButtonText}>-</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.tempButtonNew}
                      onPress={() => changeTargetTemp(1)}
                    >
                      <Text style={styles.tempButtonText}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}

            {/* 습도 및 기타 상태 */}
            <View style={styles.infoSection}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>습도</Text>
                <Text style={styles.infoValue}>{humidity}%</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>현재 온도</Text>
                <Text style={styles.infoValue}>{currentTemp.toFixed(1)}°C</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>BLE</Text>
                <Text style={[styles.infoValue, { color: bleConnected ? '#4CAF50' : '#F44336' }]}>
                  {bleConnected ? '연결' : '끊김'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.sendButton]}
              onPress={requestStatus}
            >
              <Text style={styles.buttonText}>상태 새로고침</Text>
            </TouchableOpacity>

            {/* 히터 제어 - 한 줄 텍스트 */}
            <View style={styles.deviceSection}>
              <TouchableOpacity
                style={[styles.deviceButton, styles.heaterButton, heaterOn ? styles.deviceOn : styles.deviceOff, mode === '자동' && styles.deviceDisabled]}
                onPress={toggleHeater}
                disabled={mode === '자동'}
              >
                <Text style={styles.heaterButtonText}>
                  히터 <Text style={styles.heaterStatusText}>{heaterOn ? 'ON' : 'OFF'}</Text>
                </Text>
              </TouchableOpacity>
            </View>

            {/* 팬 제어 */}
            <View style={styles.deviceSection}>
              <View style={styles.deviceRow}>
                {fans.map((fanOn, index) => (
                  <TouchableOpacity
                    key={`fan-${index}`}
                    style={[styles.deviceButton, styles.smallButton, fanOn ? styles.deviceOn : styles.deviceOff, mode === '자동' && styles.deviceDisabled]}
                    onPress={() => toggleFan(index)}
                    disabled={mode === '자동'}
                  >
                    <Text style={styles.deviceButtonText}>팬{index + 1}</Text>
                    <Text style={styles.deviceButtonSubText}>{fanOn ? 'ON' : 'OFF'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* 창문 제어 */}
            <View style={styles.deviceSection}>
              <View style={styles.deviceRow}>
                {windows.map((windowOn, index) => (
                  <TouchableOpacity
                    key={`window-${index}`}
                    style={[styles.deviceButton, styles.smallButton, windowOn ? styles.deviceOn : styles.deviceOff, mode === '자동' && styles.deviceDisabled]}
                    onPress={() => toggleWindow(index)}
                    disabled={mode === '자동'}
                  >
                    <Text style={styles.deviceButtonText}>창{index + 1}</Text>
                    <Text style={styles.deviceButtonSubText}>{windowOn ? 'ON' : 'OFF'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* 통신로그 모달 */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={logModalVisible}
        onRequestClose={() => setLogModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>통신 로그</Text>
              <TouchableOpacity onPress={() => setLogModalVisible(false)}>
                <Ionicons name="close" size={24} color="#212121" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.clearButtonContainer}
              onPress={clearLogs}
            >
              <Text style={styles.clearButton}>지우기</Text>
            </TouchableOpacity>

            <ScrollView style={styles.logContainer}>
              {messages.length === 0 ? (
                <Text style={styles.emptyLog}>로그가 없습니다</Text>
              ) : (
                messages.map((msg) => (
                  <View key={msg.id} style={styles.logItem}>
                    <Text style={styles.logTimestamp}>{msg.timestamp}</Text>
                    <Text style={[styles.logMessage, { color: getMessageColor(msg.type) }]}>
                      {msg.message}
                    </Text>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  )
}

export default Kiosk

const styles = StyleSheet.create({
  container: {
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
  },
  refreshButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusConnected: {
    backgroundColor: '#4CAF50',
  },
  statusDisconnected: {
    backgroundColor: '#9E9E9E',
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  logButton: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2196F3',
    borderRadius: 6,
  },
  logButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statusInfo: {
    fontSize: 12,
    color: '#616161',
    marginLeft: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectButton: {
    backgroundColor: '#4CAF50',
  },
  disconnectButton: {
    backgroundColor: '#F44336',
  },
  sendButton: {
    backgroundColor: '#2196F3',
    marginTop: 16,
    marginBottom: 16,

  },
  buttonDisabled: {
    backgroundColor: '#E0E0E0',
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  controlCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 16,
  },
  // 온도 섹션 스타일
  temperatureSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
  },
  currentTempContainer: {
    alignItems: 'center',
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#E0E0E0',
  },
  currentTempLabel: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 8,
    fontWeight: '500',
  },
  currentTempValue: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FF5722',
  },
  targetTempContainer: {
    alignItems: 'center',
    flex: 1,
  },
  targetTempLabel: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 8,
    fontWeight: '500',
  },
  targetTempValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2196F3',
    marginBottom: 12,
  },
  targetTempButtonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tempButtonNew: {
    width: 60,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#2196F3',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  tempButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  infoSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  infoItem: {
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: '#9E9E9E',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  modeSection: {
    marginBottom: 12,
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  modeButtonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  modeButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#616161',
  },
  modeButtonTextActive: {
    color: '#1976D2',
  },
  deviceSection: {
    marginBottom: 16,
    marginTop: 8,
  },
  deviceRow: {
    flexDirection: 'row',
    gap: 8,
  },
  deviceButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  heaterButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    height: 50,
    justifyContent: 'center',
    marginTop: 0,
  },
  heaterButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    color: '#212121',
  },
  heaterStatusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  smallButton: {
    flex: 1,
    minWidth: 0,
    padding: 12,
  },
  deviceOn: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  deviceOff: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  deviceButtonText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    color: '#212121',
  },
  deviceButtonSubText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#212121',
    marginTop: 2,
  },
  deviceDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#BDBDBD',
    opacity: 0.5,
  },
  // 모달 스타일
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxHeight: '70%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
  },
  clearButtonContainer: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  clearButton: {
    fontSize: 14,
    color: '#F44336',
    fontWeight: '600',
  },
  logContainer: {
    maxHeight: 400,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
  },
  logItem: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  logTimestamp: {
    fontSize: 10,
    color: '#9E9E9E',
    marginBottom: 4,
  },
  logMessage: {
    fontSize: 12,
    lineHeight: 18,
  },
  emptyLog: {
    fontSize: 12,
    color: '#9E9E9E',
    textAlign: 'center',
    paddingVertical: 20,
  },
})
