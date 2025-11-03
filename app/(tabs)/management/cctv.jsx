import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Video } from 'expo-av'
import { useRouter } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { WebView } from 'react-native-webview'
import { connectAlarmStream, deleteAlarm, deleteVideo, getAlarmHistory, getDangerousObjects, getRecordingStatus, getVideoDownloadUrl, getVideos, startRecording, stopRecording } from '../../../services/coralApi'
import recordingTimer from '../../../services/recordingTimer'

const CCTVScreen = () => {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('실시간')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    console.log('=== CCTV Screen Loaded ===')
    console.log('Active Tab:', activeTab)
    console.log('Stream URL: http://192.168.30.71:5000/video_feed')
  }, [activeTab])

  const onRefresh = async () => {
    setRefreshing(true)
    setTimeout(() => {
      setRefreshing(false)
    }, 1000)
  }

  const tabs = ['실시간', '재생', '알람']

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#212121" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CCTV 모니터링</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#212121" />
        </TouchableOpacity>
      </View>

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

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {activeTab === '실시간' && <RealtimeView />}

          {activeTab === '재생' && <RecordingView />}

          {activeTab === '알람' && <AlarmHistoryView />}
        </ScrollView>
    </View>
  )
}

const RealtimeView = () => {
  console.log('[DEBUG] ========== 실시간 뷰 마운트 ==========')
  console.log('[DEBUG] 실시간 알람(SSE)만 사용, DB 알람 사용 안 함')

  const streamUrl = 'http://192.168.30.71:5000/video_feed'
  const [recentAlarms, setRecentAlarms] = useState([])
  const [clearTimestamp, setClearTimestamp] = useState(0) // 삭제 버튼 누른 시간 (초 단위)
  const [isNetworkHealthy, setIsNetworkHealthy] = useState(true) // 네트워크 상태
  const [dangerousObjects, setDangerousObjects] = useState([]) // 위험 객체 목록 (DB)
  const [isRecording, setIsRecording] = useState(false) // 녹화 상태
  const [recordingFile, setRecordingFile] = useState(null) // 녹화 중인 파일명
  const disconnectRef = useRef(null)
  const recordStatusTimerRef = useRef(null) // 녹화 상태 폴링 타이머
  const webViewRef = useRef(null) // WebView 참조
  const userIntentRecordingRef = useRef(false) // 사용자가 의도한 녹화 상태 (UI 우선)
  const recordingStartTimeRef = useRef(null) // 녹화 시작 시간 (탭 전환 시 상태 유지용)
  const recordingRenewalTimerRef = useRef(null) // 5분 갱신 타이머
  const recordingFileRef = useRef(null) // 녹화 파일명 (API 실패 시에도 유지)

  console.log('⭐ recentAlarms state 초기화 완료:', recentAlarms.length)

  // 위험 객체 맵 (label -> 한글 이름)
  const dangerMap = useMemo(() => {
    const map = new Map()
    dangerousObjects.forEach(obj => {
      const code = (obj.OBJECT_CODE || '').toString().trim().toLowerCase()
      map.set(code, obj.OBJECT_NAME_KR)
    })
    return map
  }, [dangerousObjects])

  // 삭제 버튼 핸들러 (현재 시간 이전의 알람 숨김)
  const handleClearAlarms = () => {
    const now = Math.floor(Date.now() / 1000) // 현재 시간 (초 단위)
    setClearTimestamp(now)
    console.log('[ALARM CLEAR] 삭제 시간 설정:', new Date(now * 1000).toLocaleString('ko-KR'))
  }

  // 화면에 표시할 알람 필터링 (clearTimestamp 이후의 알람만)
  const visibleAlarms = recentAlarms.filter(alarm => alarm.time > clearTimestamp)

  // 알람 메시지 포맷 함수 (Web 코드 참조 - DB에서 한글 이름 가져오기)
  const getAlarmMessage = (alarm) => {
    if (!alarm) return ''
    const timeStr = new Date(alarm.time * 1000).toLocaleTimeString('ko-KR')
    const formattedTime = `[${timeStr}]`
    const score = alarm.score != null ? `(${(alarm.score * 100).toFixed(0)}%)` : ''

    const code = (alarm.label || '').toString().trim().toLowerCase()
    const nameKr = dangerMap.get(code)

    if (nameKr) {
      // DB에 등록된 한글 이름 사용
      return `${formattedTime} 🚨 유해동물 ${nameKr}가 침입했습니다!! ${score}`
    } else {
      // DB에 없으면 기본 메시지 (알람 히스토리와 동일하게 처리)
      const label = code === 'dog' ? '개' : code === 'cat' ? '고양이' : alarm.label
      return `${formattedTime} 🚨 유해동물 ${label}가 침입했습니다!! ${score}`
    }
  }

  // 녹화 상태 폴링 (프론트엔드 우선 - 서버는 참고용)
  const pollRecordStatus = async (retryCount = 0) => {
    // ★★★ 녹화 중이 아니면 폴링 스킵 (불필요한 API 호출 방지) ★★★
    if (!userIntentRecordingRef.current) {
      // 녹화 중이 아닐 때는 서버 상태 확인 안 함
      return
    }

    try {
      const statusData = await getRecordingStatus()

      // 응답이 유효한지 확인
      if (statusData && typeof statusData.is_recording !== 'undefined') {
        const serverRecording = statusData.is_recording || false
        const userIntent = userIntentRecordingRef.current

        if (retryCount === 0) {
          console.log(`[POLL] 서버 상태 확인 (참고용) - 프론트: ${userIntent}, 서버: ${serverRecording}, 파일: ${statusData.current_file || 'null'}`)
        }

        // ★★★ 프론트엔드 우선 원칙 ★★★
        // 서버 상태와 무관하게 사용자 의도(프론트)를 따름
        // 서버는 파일명 동기화 용도로만 사용

        if (userIntent) {
          // 프론트: 녹화 중 → 파일명만 서버에서 가져옴 (녹화 상태는 절대 변경 안 함)
          if (serverRecording && statusData.current_file) {
            // 서버도 녹화 중이고 파일명이 있으면 업데이트
            recordingFileRef.current = statusData.current_file
            setRecordingFile(statusData.current_file)
          } else {
            // 서버 응답이 이상해도 ref에 저장된 파일명 유지
            if (recordingFileRef.current) {
              setRecordingFile(recordingFileRef.current)
            }
            if (retryCount === 0 && !serverRecording) {
              console.log(`[POLL] ⚠️ 프론트: 녹화 중, 서버: 중지 - 프론트 우선 유지`)
            }
          }
          // isRecording은 절대 변경하지 않음 (프론트 우선)
        } else {
          // 프론트: 중지 → 상태 유지 (서버 무시)
          // 정지 상태는 이미 프론트에서 설정됨
          // 서버 응답 무시
        }
      } else {
        // 응답 없음 - ref에 저장된 값 유지
        if (userIntentRecordingRef.current && recordingFileRef.current) {
          setRecordingFile(recordingFileRef.current)
        }
        if (retryCount === 0) {
          console.log('[POLL] 서버 응답 없음 - 프론트 상태 유지')
        }
      }
    } catch (error) {
      // 에러 시 - ref에 저장된 값 유지
      if (userIntentRecordingRef.current && recordingFileRef.current) {
        setRecordingFile(recordingFileRef.current)
      }
      if (retryCount === 0) {
        console.log('[POLL] 서버 오류 - 프론트 상태 유지')
      }
    }
  }

  // AsyncStorage에 녹화 상태 저장
  const saveRecordingState = async (isRecording, filename, startTime) => {
    try {
      const data = {
        isRecording,
        filename,
        startTime,
        savedAt: Date.now()
      }
      console.log('[DEBUG] AsyncStorage 저장 시작:', data)
      await AsyncStorage.setItem('recording_state', JSON.stringify(data))
      console.log('[DEBUG] AsyncStorage 저장 완료:', { isRecording, filename })
      return true
    } catch (error) {
      console.log('[ERROR] AsyncStorage 저장 실패:', error.message)
      return false
    }
  }

  // AsyncStorage에서 녹화 상태 복원
  const loadRecordingState = async () => {
    try {
      console.log('[DEBUG] AsyncStorage 로드 시작...')
      const saved = await AsyncStorage.getItem('recording_state')
      if (saved) {
        const state = JSON.parse(saved)
        console.log('[DEBUG] AsyncStorage 로드 완료 - 녹화 상태 발견:', state)
        return state
      }
      console.log('[DEBUG] AsyncStorage 로드 완료 - 저장된 상태 없음')
      return null
    } catch (error) {
      console.log('[ERROR] AsyncStorage 로드 실패:', error.message)
      return null
    }
  }

  // AsyncStorage 녹화 상태 삭제
  const clearRecordingState = async () => {
    try {
      console.log('[DEBUG] AsyncStorage 삭제 시작...')
      await AsyncStorage.removeItem('recording_state')
      console.log('[DEBUG] AsyncStorage 삭제 완료')
      return true
    } catch (error) {
      console.log('[ERROR] AsyncStorage 삭제 실패:', error.message)
      return false
    }
  }

  // 5분 갱신 타이머 시작 (녹화 중일 때만)
  const start5MinRenewalTimer = () => {
    // 녹화 중이 아니면 타이머 시작하지 않음
    if (!userIntentRecordingRef.current) {
      console.log('[DEBUG] 녹화 중 아님 - 5분 갱신 타이머 시작 안 함')
      return
    }

    // 기존 타이머 정리
    if (recordingRenewalTimerRef.current) {
      clearInterval(recordingRenewalTimerRef.current)
    }

    console.log('[DEBUG] 5분 갱신 타이머 시작 (녹화 중)')

    // 5분(300초)마다 녹화 갱신 체크
    recordingRenewalTimerRef.current = setInterval(() => {
      // ★★★ 최우선 체크: 녹화 중이 아니면 즉시 종료 ★★★
      if (!userIntentRecordingRef.current) {
        console.log('[DEBUG] 녹화 중 아님 - 5분 갱신 타이머 자동 중지')
        stop5MinRenewalTimer()
        return
      }

      // 녹화 시작 시간이 없으면 종료 (정지 직후 등)
      if (!recordingStartTimeRef.current) {
        console.log('[DEBUG] 녹화 시작 시간 없음 - 갱신 체크 건너뜀')
        return
      }

      // 5분 경과 체크
      const elapsedTime = Date.now() - recordingStartTimeRef.current
      const fiveMinutes = 5 * 60 * 1000 // 5분 = 300,000ms

      if (elapsedTime >= fiveMinutes) {
        console.log('[DEBUG] 5분 경과, 녹화 갱신 시작')
        renewRecording()
      }
    }, 10000) // 10초마다 체크
  }

  // 5분 갱신 타이머 정지
  const stop5MinRenewalTimer = () => {
    if (recordingRenewalTimerRef.current) {
      clearInterval(recordingRenewalTimerRef.current)
      recordingRenewalTimerRef.current = null
      console.log('[DEBUG] 5분 갱신 타이머 정지')
    }
  }

  // 녹화 갱신 (중지 → 즉시 재시작) - 녹화 중일 때만
  const renewRecording = async () => {
    // 녹화 중이 아니면 갱신하지 않음
    if (!userIntentRecordingRef.current) {
      console.log('[DEBUG] 녹화 중 아님 - 녹화 갱신 건너뜀')
      return
    }

    try {
      console.log('[DEBUG] 녹화 갱신: 중지 시도...')

      // 1. 중지
      await stopRecording()
      await new Promise(resolve => setTimeout(resolve, 1000)) // 1초 대기

      // 다시 한번 확인 - 갱신 도중 사용자가 정지했을 수 있음
      if (!userIntentRecordingRef.current) {
        console.log('[DEBUG] 갱신 중 사용자가 정지함 - 재시작 취소')
        return
      }

      // 2. 즉시 재시작
      console.log('[DEBUG] 녹화 갱신: 재시작 시도...')
      const result = await startRecording()

      if (result && result.status === 'success') {
        // 시작 시간 갱신
        recordingStartTimeRef.current = Date.now()

        // AsyncStorage 업데이트 (새 파일명과 시작 시간)
        const statusData = await getRecordingStatus()
        if (statusData && statusData.is_recording && userIntentRecordingRef.current) {
          const newFilename = statusData.current_file || null
          recordingFileRef.current = newFilename // ref에 저장
          setRecordingFile(newFilename)
          // AsyncStorage에 새 파일명 저장
          await saveRecordingState(true, newFilename, recordingStartTimeRef.current)
          console.log('[DEBUG] 녹화 갱신 성공:', newFilename)
        }
      } else {
        console.log('[REALTIME] 녹화 갱신 실패 (silent)')
      }
    } catch (error) {
      console.log('[REALTIME] 녹화 갱신 에러 (silent):', error.message)
    }
  }

  // 녹화 시작 함수 (타이머 포함 + 예외 처리 강화)
  const handleStartRecording = async () => {
    console.log('[DEBUG] ========== 녹화 시작 함수 실행 ==========')

    // 사용자 의도 저장 (녹화 시작)
    userIntentRecordingRef.current = true
    console.log('[DEBUG] 사용자 의도: 녹화 시작')

    // 예상 파일명 생성 (현재 시간 기반)
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    const seconds = String(now.getSeconds()).padStart(2, '0')
    const estimatedFilename = `cctv_record_${year}${month}${day}-${hours}${minutes}${seconds}.mp4`
    console.log('[DEBUG] 예상 파일명 생성:', estimatedFilename)

    // 녹화 시작 시간 기록
    recordingStartTimeRef.current = Date.now()
    console.log('[DEBUG] 녹화 시작 시간:', new Date(recordingStartTimeRef.current).toISOString())

    // 파일명 ref에 저장 (API 실패 시에도 유지)
    recordingFileRef.current = estimatedFilename

    // UI 즉시 변경 (LIVE → REC, 녹화 버튼 → 정지 버튼)
    setIsRecording(true)
    setRecordingFile(estimatedFilename) // 예상 파일명 즉시 표시
    console.log('[DEBUG] UI 상태 변경 완료')

    // AsyncStorage에 저장 (탭 전환 대응) - 반드시 완료될 때까지 대기
    console.log('[DEBUG] AsyncStorage 저장 대기 중...')
    const saveSuccess = await saveRecordingState(true, estimatedFilename, recordingStartTimeRef.current)
    if (saveSuccess) {
      console.log('[DEBUG] AsyncStorage 저장 성공 - 탭 전환 안전')
    } else {
      console.log('[ERROR] AsyncStorage 저장 실패 - 탭 전환 시 상태 유실 가능')
    }

    // 5분 갱신 타이머 시작
    start5MinRenewalTimer()
    console.log('[DEBUG] 5분 갱신 타이머 시작')

    // 메시지 먼저 표시
    Alert.alert('완료', '녹화를 시작합니다.')
    console.log('[DEBUG] 사용자에게 시작 메시지 표시')

    // 백그라운드에서 처리
    ;(async () => {
      try {
        console.log('[REALTIME] 녹화 시작 요청...')
        const result = await startRecording()

        if (result && result.status === 'success') {
          console.log('[REALTIME] 녹화 시작 성공 (silent)')

          // 상태 확인 (최대 3초 대기)
          let verified = false
          for (let i = 0; i < 6; i++) {
            await new Promise(resolve => setTimeout(resolve, 500))
            const statusData = await getRecordingStatus()
            if (statusData && statusData.is_recording) {
              verified = true
              // 사용자 의도가 여전히 녹화 중일 때만 파일명 업데이트
              if (userIntentRecordingRef.current) {
                const actualFilename = statusData.current_file || null
                recordingFileRef.current = actualFilename // ref에 저장
                setRecordingFile(actualFilename)
              }
              break
            }
          }

          if (verified) {
            console.log('[REALTIME] 녹화 시작 확인 완료 (silent)')
          } else {
            console.log('[REALTIME] 녹화 시작 확인 실패 (silent)')
          }
        } else {
          console.log('[REALTIME] 녹화 시작 실패 (silent):', result?.message)
        }
      } catch (error) {
        console.log('[REALTIME] 녹화 시작 실패 (silent):', error.message)
      } finally {
        // 상태 폴링은 사용자 의도와 무관하게 실행 (하지만 UI는 덮어쓰지 않음)
      }
    })()
  }

  // 녹화 중지 함수 (확실히 정지될 때까지 무한 반복)
  const handleStopRecording = async () => {
    console.log('[DEBUG] ========== 녹화 정지 함수 실행 ==========')

    // 사용자 의도 저장 (녹화 중지) - 최우선!
    userIntentRecordingRef.current = false
    console.log('[DEBUG] 사용자 의도: 녹화 정지 (최우선)')

    // 녹화 시작 시간 초기화
    recordingStartTimeRef.current = null

    // 파일명 ref 초기화
    recordingFileRef.current = null

    // UI 즉시 변경 (REC → LIVE, 정지 버튼 → 녹화 버튼)
    setIsRecording(false)
    setRecordingFile(null)
    console.log('[DEBUG] UI 상태 변경 완료 - 녹화 정지')

    // 모든 타이머 즉시 중지
    recordingTimer.stop()
    stop5MinRenewalTimer()
    console.log('[DEBUG] 타이머 중지 완료')

    // AsyncStorage 삭제 (탭 전환 대응) - 반드시 완료될 때까지 대기
    console.log('[DEBUG] AsyncStorage 삭제 대기 중...')
    const clearSuccess = await clearRecordingState()
    if (clearSuccess) {
      console.log('[DEBUG] AsyncStorage 삭제 성공 - 탭 전환 시 정지 상태 유지')
    } else {
      console.log('[ERROR] AsyncStorage 삭제 실패')
    }

    // 메시지 먼저 표시
    Alert.alert('완료', '녹화를 중지하였습니다.')
    console.log('[DEBUG] 사용자에게 정지 메시지 표시')

    // 백그라운드에서 서버 정지 시도 (0.5초 간격, 최대 10회)
    ;(async () => {
      const MAX_STOP_ATTEMPTS = 10 // 최대 10번 시도

      console.log('[DEBUG] 백그라운드: 서버 녹화 정지 시작 (0.5초 간격, 최대 10회 시도)')

      // 최대 10번 시도, 0.5초 간격
      for (let attempt = 1; attempt <= MAX_STOP_ATTEMPTS; attempt++) {
        try {
          console.log(`[DEBUG] 녹화 중지 시도 ${attempt}/${MAX_STOP_ATTEMPTS}...`)

          // 정지 API 호출
          const result = await stopRecording()

          // API 응답 성공 여부와 무관하게 상태 확인 (서버가 이미 정지됐을 수 있음)
          const statusData = await getRecordingStatus()

          if (statusData && !statusData.is_recording) {
            // 서버가 정지 상태면 성공!
            console.log(`[DEBUG] ✅ 녹화 정지 확인 완료! (시도 ${attempt})`)
            console.log(`[DEBUG] ========== 녹화 정지 완전 성공 (총 ${attempt}번 시도) ==========`)
            return // 즉시 종료
          }

          // 아직 녹화 중이면 로그 출력
          if (result && result.status === 'success') {
            console.log(`[DEBUG] 녹화 중지 API 응답 성공했지만 아직 녹화 중 (시도 ${attempt})`)
          } else {
            console.log(`[WARNING] 녹화 중지 API 실패 (시도 ${attempt})`)
          }

          // 다음 시도 전 0.5초 대기
          if (attempt < MAX_STOP_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }

        } catch (retryError) {
          console.log(`[WARNING] 녹화 중지 시도 ${attempt} 에러:`, retryError.message)

          // 에러가 발생해도 상태 확인 시도 (서버가 이미 정지됐을 수 있음)
          try {
            const statusData = await getRecordingStatus()
            if (statusData && !statusData.is_recording) {
              console.log(`[DEBUG] ✅ 에러 발생했지만 서버는 정지됨! (시도 ${attempt})`)
              console.log(`[DEBUG] ========== 녹화 정지 완전 성공 (총 ${attempt}번 시도) ==========`)
              return // 즉시 종료
            }
          } catch (statusError) {
            // 상태 확인도 실패 - 다음 시도로 진행
          }

          // 다음 시도 전 0.5초 대기
          if (attempt < MAX_STOP_ATTEMPTS) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
      }

      // 10번 모두 실패한 경우 (프론트는 이미 정지 상태 유지)
      console.log('[WARNING] ========== 녹화 중지 10회 모두 실패 - 프론트는 정지 상태 유지 ==========')
    })()
  }

  // 위험 객체 목록 로드
  useEffect(() => {
    const loadDangerousObjects = async () => {
      const objects = await getDangerousObjects()
      setDangerousObjects(objects)
      console.log('[REALTIME] Dangerous objects loaded:', objects.length, 'items')
    }

    loadDangerousObjects()
  }, [])

  // 컴포넌트 마운트 시 녹화 상태 복원 (탭 전환 대응)
  useEffect(() => {
    const restoreRecordingState = async () => {
      console.log('[DEBUG] ========== 컴포넌트 마운트: 녹화 상태 복원 시작 ==========')
      try {
        // 1. 먼저 AsyncStorage에서 저장된 상태 확인 (탭 전환 대응)
        const savedState = await loadRecordingState()

        if (savedState && savedState.isRecording) {
          console.log('[DEBUG] ========== AsyncStorage에 녹화 상태 있음 ==========')
          console.log('[DEBUG] 복원 데이터:', savedState)

          // AsyncStorage에 저장된 상태로 즉시 UI 복원
          userIntentRecordingRef.current = true
          recordingStartTimeRef.current = savedState.startTime
          recordingFileRef.current = savedState.filename
          setIsRecording(true)
          setRecordingFile(savedState.filename)
          console.log('[DEBUG] UI 즉시 복원 완료 - 파일명:', savedState.filename)

          // 5분 갱신 타이머 시작
          start5MinRenewalTimer()
          console.log('[DEBUG] 5분 갱신 타이머 시작')

          // 백그라운드에서 서버 상태 확인 및 동기화 (참고용 - 사용자 의도 우선)
          ;(async () => {
            try {
              console.log('[DEBUG] 백그라운드: 서버 상태 확인 시작... (참고용)')
              const statusData = await getRecordingStatus()
              console.log('[DEBUG] 백그라운드: 서버 응답:', statusData)

              if (statusData && statusData.is_recording) {
                // 서버도 녹화 중이면 실제 파일명으로 업데이트
                const actualFilename = statusData.current_file || savedState.filename
                recordingFileRef.current = actualFilename
                setRecordingFile(actualFilename)
                await saveRecordingState(true, actualFilename, savedState.startTime)
                console.log('[DEBUG] 백그라운드: 서버와 동기화 완료:', actualFilename)
              } else {
                // 서버는 녹화 중이 아니지만 AsyncStorage 기록이 있으면 사용자 의도 우선!
                console.log('[WARNING] 백그라운드: 서버 녹화 중 아님 - 하지만 AsyncStorage 기록 유지 (사용자 의도 우선)')
                // AsyncStorage 상태 유지 - 사용자가 정지 버튼을 누를 때만 삭제
                // UI는 그대로 유지 (녹화 중 상태)
              }
            } catch (error) {
              console.log('[WARNING] 백그라운드: 서버 확인 실패 - AsyncStorage 상태 유지:', error.message)
            }
          })()
        } else {
          // AsyncStorage에 저장된 녹화 상태 없음 - 서버에서 확인
          console.log('[DEBUG] ========== AsyncStorage에 녹화 상태 없음 ==========')
          console.log('[DEBUG] 서버 확인 시작...')
          const statusData = await getRecordingStatus()

          if (statusData && statusData.is_recording) {
            console.log('[DEBUG] 서버에서 녹화 중인 상태 발견:', statusData.current_file)

            // 녹화 중이면 상태 복원
            const restoredFilename = statusData.current_file || '녹화 중...'
            userIntentRecordingRef.current = true
            recordingStartTimeRef.current = Date.now()
            recordingFileRef.current = restoredFilename
            setIsRecording(true)
            setRecordingFile(restoredFilename)
            console.log('[DEBUG] UI 복원 완료 - 파일명:', restoredFilename)

            // AsyncStorage에 저장
            await saveRecordingState(true, restoredFilename, Date.now())

            // 5분 갱신 타이머 시작
            start5MinRenewalTimer()
            console.log('[DEBUG] 5분 갱신 타이머 시작')
          } else {
            console.log('[DEBUG] 서버: 녹화 중 아님')
            userIntentRecordingRef.current = false
            recordingStartTimeRef.current = null
            recordingFileRef.current = null
            setIsRecording(false)
            setRecordingFile(null)
          }
        }
      } catch (error) {
        console.log('[ERROR] 녹화 상태 복원 실패:', error.message)
        // 에러 발생 시에도 AsyncStorage에서 복원 시도
        console.log('[DEBUG] 에러 발생 - AsyncStorage 재시도...')
        const savedState = await loadRecordingState()
        if (savedState && savedState.isRecording) {
          userIntentRecordingRef.current = true
          recordingStartTimeRef.current = savedState.startTime
          recordingFileRef.current = savedState.filename
          setIsRecording(true)
          setRecordingFile(savedState.filename)
          start5MinRenewalTimer()
          console.log('[DEBUG] AsyncStorage 재시도 성공:', savedState.filename)
        }
      }
    }

    restoreRecordingState()
  }, [])

  // 녹화 파일명 오버레이 업데이트
  useEffect(() => {
    try {
      if (webViewRef.current) {
        const filename = recordingFile || ''
        const js = `
          try {
            if (typeof window.updateRecordingOverlay === 'function') {
              window.updateRecordingOverlay('${filename}');
            }
          } catch (e) {
            console.log('[WebView] Recording overlay error (silent):', e.message);
          }
        `
        webViewRef.current.injectJavaScript(js)
        console.log('[REALTIME] Recording overlay updated (silent):', filename || 'hidden')
      }
    } catch (error) {
      // 조용히 처리
      console.log('[REALTIME] Recording overlay inject error (silent):', error.message)
    }
  }, [recordingFile])

  useEffect(() => {
    console.log('========================================')
    console.log('[CCTV] 🚀 Initializing CCTV Realtime View')
    console.log('[CCTV] Starting SSE alarm stream connection...')
    console.log('========================================')

    // ★★★ 우선순위 1: SSE 스트림 연결 (실시간 알람 - 가장 먼저 실행) ★★★
    console.log('[DEBUG] 실시간 알람 스트림(SSE) 연결 시작...')
    const disconnect = connectAlarmStream(
      // 알람 수신 콜백
      (alarm) => {
        console.log('[REALTIME ALARM] ✅ 실시간 알람 수신:', alarm)
        console.log('  - Type:', alarm.type)
        console.log('  - Camera:', alarm.camera_id)
        console.log('  - Label:', alarm.label)
        console.log('  - Score:', alarm.score)
        console.log('  - Timestamp:', alarm.ts)

        // 알람을 state에 추가 (최대 5개)
        setRecentAlarms((prev) => {
          const newAlarm = {
            label: alarm.label,
            score: alarm.score,
            time: Math.floor(Date.parse(alarm.ts) / 1000), // 초 단위로 변환
          }
          return [newAlarm, ...prev].slice(0, 5)
        })
      },
      // 에러 콜백
      (error) => {
        // 조용히 처리
      },
      // 네트워크 상태 콜백
      (isHealthy) => {
        console.log('[REALTIME ALARM] 🌐 네트워크 상태:', isHealthy ? '정상' : '불안정')
        setIsNetworkHealthy(isHealthy)
      }
    )

    disconnectRef.current = disconnect
    console.log('[DEBUG] 실시간 알람 스트림(SSE) 연결 완료 ✅')

    // ★★★ 우선순위 2: 녹화 관련 로직 (SSE 이후 백그라운드 실행) ★★★
    // 녹화 타이머 콜백 설정
    recordingTimer.onStatusChange = (isRecording) => {
      setIsRecording(isRecording)
    }

    recordingTimer.onMessage = (message) => {
      Alert.alert('녹화 알림', message)
    }

    // 녹화 상태 폴링 시작 (1.5초마다, 녹화 중일 때만 실행)
    recordStatusTimerRef.current = setInterval(pollRecordStatus, 1500)

    // 녹화 타이머 복원 (페이지 복귀 시 - 비동기 백그라운드)
    const restoreTimer = async () => {
      const restored = await recordingTimer.restore()
      if (restored) {
        console.log('[REALTIME] 녹화 타이머 복원 완료')
        setIsRecording(true)
      }
    }
    restoreTimer()

    return () => {
      console.log('[DEBUG] 실시간 뷰 언마운트 - 모든 타이머 정리...')

      // SSE 연결 해제
      if (disconnectRef.current) {
        disconnectRef.current()
      }

      // 녹화 상태 폴링 정리
      if (recordStatusTimerRef.current) {
        clearInterval(recordStatusTimerRef.current)
        recordStatusTimerRef.current = null
      }

      // 5분 갱신 타이머 정리 (중요!)
      stop5MinRenewalTimer()

      // 콜백 정리
      recordingTimer.onStatusChange = null
      recordingTimer.onMessage = null

      console.log('[DEBUG] 실시간 뷰 언마운트 완료 - 모든 리소스 정리됨')
    }
  }, [])

  return (
    <View style={styles.realtimeContainer}>
      <View style={styles.streamSection}>
        <View style={styles.streamHeader}>
          <View style={styles.streamTitleRow}>
            <Ionicons name="videocam" size={20} color="#212121" />
            <Text style={styles.sectionTitle}>실시간 CCTV</Text>
          </View>
          <View style={styles.streamHeaderRight}>
            {/* LIVE/REC 상태 표시 (정적) */}
            <View style={[
              styles.statusBadge,
              isRecording && styles.statusBadgeRecording
            ]}>
              <View style={[
                styles.statusDot,
                isRecording && styles.statusDotRecording
              ]} />
              <Text style={[
                styles.statusText,
                isRecording && styles.statusTextRecording
              ]}>
                {isRecording ? 'REC' : 'LIVE'}
              </Text>
            </View>

            {/* 녹화/정지 버튼 */}
            {isRecording ? (
              <TouchableOpacity
                style={styles.recordStopButton}
                onPress={handleStopRecording}
                activeOpacity={0.7}
              >
                <Ionicons name="stop" size={16} color="#FFF" />
                <Text style={styles.recordButtonText}>정지</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.recordStartButton}
                onPress={handleStartRecording}
                activeOpacity={0.7}
              >
                <Ionicons name="ellipse" size={16} color="#FFF" />
                <Text style={styles.recordButtonText}>녹화</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.streamContainer}>
          <WebView
            ref={webViewRef}
            source={{
              html: `
                <!DOCTYPE html>
                <html>
                  <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                    <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
                    <meta http-equiv="Pragma" content="no-cache" />
                    <meta http-equiv="Expires" content="0" />
                    <style>
                      * { margin: 0; padding: 0; box-sizing: border-box; }
                      html, body { width: 100%; height: 100%; overflow: hidden; background-color: #000; display: flex; align-items: center; justify-content: center; }
                      #container { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; position: relative; }
                      img { width: 100%; height: 100%; object-fit: cover; display: block; }
                      #status { position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.8); color: #fff; padding: 8px 12px; border-radius: 4px; font-size: 14px; font-family: monospace; z-index: 10; }
                      #recordingOverlay { position: absolute; bottom: 10px; left: 10px; background: rgba(220,38,38,0.9); color: #fff; padding: 8px 12px; border-radius: 4px; font-size: 12px; font-family: monospace; z-index: 10; display: none; }
                      .error { color: #ff4444; background: rgba(255,0,0,0.2); }
                      .loading { color: #ffaa00; }
                      .success { color: #44ff44; }
                    </style>
                  </head>
                  <body>
                    <div id="container">
                      <div id="status" class="loading">연결 중...</div>
                      <div id="recordingOverlay"></div>
                      <img id="stream" alt="CCTV Stream" />
                    </div>
                    <script>
                      const img = document.getElementById('stream');
                      const status = document.getElementById('status');
                      let retryCount = 0;
                      const maxRetries = 5;

                      function updateStatus(message, className) {
                        status.textContent = message;
                        status.className = className;
                        console.log('[MJPEG] ' + message);
                      }

                      function loadStream() {
                        const timestamp = new Date().getTime();
                        const url = "${streamUrl}?t=" + timestamp;

                        updateStatus('연결 중... (시도 ' + (retryCount + 1) + ')', 'loading');

                        img.onload = function() {
                          updateStatus('연결 성공!', 'success');
                          retryCount = 0;
                          setTimeout(() => { status.style.display = 'none'; }, 3000);
                        };

                        img.onerror = function(e) {
                          // 조용히 처리
                          retryCount++;
                          if (retryCount < maxRetries) {
                            updateStatus('연결 실패. 재시도 중... (' + retryCount + '/' + maxRetries + ')', 'error');
                            setTimeout(loadStream, 2000);
                          } else {
                            updateStatus('연결 실패 (5회 시도)', 'error');
                            setTimeout(() => {
                              retryCount = 0;
                              loadStream();
                            }, 10000);
                          }
                        };

                        img.src = url;
                      }

                      loadStream();

                      setInterval(() => {
                        if (!img.complete || img.naturalWidth === 0) {
                          console.log('[MJPEG] Stream appears disconnected, reconnecting...');
                          loadStream();
                        }
                      }, 30000);

                      // 녹화 파일명 오버레이 업데이트 함수
                      window.updateRecordingOverlay = function(filename) {
                        const overlay = document.getElementById('recordingOverlay');
                        if (filename) {
                          overlay.textContent = '🔴 REC: ' + filename;
                          overlay.style.display = 'block';
                        } else {
                          overlay.style.display = 'none';
                        }
                      };
                    </script>
                  </body>
                </html>
              `,
            }}
            style={styles.webView}
            originWhitelist={['*']}
            scrollEnabled={false}
            bounces={false}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            cacheEnabled={false}
            cacheMode="LOAD_NO_CACHE"
            startInLoadingState={true}
            scalesPageToFit={true}
            mediaPlaybackRequiresUserAction={false}
            allowsInlineMediaPlayback={true}
            mixedContentMode="always"
            thirdPartyCookiesEnabled={false}
            sharedCookiesEnabled={false}
            onMessage={(event) => {
              console.log('[WebView Message]', event.nativeEvent.data)
            }}
            onError={(syntheticEvent) => {
              // 조용히 처리
            }}
            onLoad={() => {
              console.log('[WebView] Loaded successfully')
            }}
            onLoadStart={() => {
              console.log('[WebView] Load started:', streamUrl)
            }}
            onLoadEnd={() => {
              console.log('[WebView] Load ended')
            }}
            onHttpError={(syntheticEvent) => {
              // 조용히 처리
            }}
            onShouldStartLoadWithRequest={(request) => {
              console.log('[WebView] Loading request:', request.url)
              return true
            }}
          />
        </View>
      </View>

      <View style={styles.alarmSection}>
        <View style={styles.alarmHeader}>
          <View style={styles.alarmHeaderLeft}>
            <Ionicons name="notifications" size={20} color="#212121" />
            <Text style={styles.sectionTitle}>최근 실시간 알람</Text>
            <Text style={styles.alarmCount}>({visibleAlarms.length})</Text>
          </View>
          {visibleAlarms.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={handleClearAlarms}>
              <Ionicons name="trash-outline" size={18} color="#FF4444" />
              <Text style={styles.clearButtonText}>삭제</Text>
            </TouchableOpacity>
          )}
        </View>

        {!isNetworkHealthy ? (
          <View style={styles.networkErrorContainer}>
            <Ionicons name="cloud-offline-outline" size={48} color="#FF9800" />
            <Text style={styles.networkErrorText}>네트워크가 불안합니다</Text>
            <Text style={styles.networkErrorSubText}>연결을 확인하고 있습니다...</Text>
          </View>
        ) : visibleAlarms.length === 0 ? (
          <View style={styles.emptyAlarmContainer}>
            <Ionicons name="checkmark-circle-outline" size={48} color="#9E9E9E" />
            <Text style={styles.emptyAlarmText}>알람 없음</Text>
          </View>
        ) : (
          <ScrollView style={styles.alarmList}>
            {visibleAlarms.slice(0, 5).map((alarm, index) => (
              <View key={index} style={styles.alarmItem}>
                <Text style={styles.alarmItemText}>{getAlarmMessage(alarm)}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  )
}

// ========================================
// 녹화 영상 뷰
// ========================================
const RecordingView = () => {
  const [videos, setVideos] = useState([])
  const [selectedVideo, setSelectedVideo] = useState(null)
  const [selectedIds, setSelectedIds] = useState([]) // 선택된 영상 파일명들
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [isFetching, setIsFetching] = useState(false) // 데이터 로딩 중 플래그
  const [networkError, setNetworkError] = useState(false) // 네트워크 에러 상태
  const videoRef = useRef(null)

  // 데이터 로드 (영상 0개일 때 재확인 - 알람 탭 참조)
  const fetchVideos = async () => {
    // 이미 로딩 중이면 중복 호출 방지
    if (isFetching) {
      console.log('[RECORDING] Already fetching, skipping...')
      return
    }

    try {
      setIsFetching(true)
      setLoading(true)
      setNetworkError(false)

      const videosData = await getVideos()
      console.log('[RECORDING] Loaded:', videosData.length, 'videos')

      // 영상이 0개일 경우 실제로 0개인지 최대 1000번 재확인 (알람 탭 로직 참조)
      if (videosData.length === 0) {
        console.log('[RECORDING] Videos is 0, verifying with retry (max 10 times)...')
        setNetworkError(true) // "네트워크 연결 중..." 표시

        let retryCount = 0
        let zeroCount = 0        // 연속된 '0개 응답' 카운터
        let errorCount = 0       // 연속된 에러 카운터
        let verifiedVideos = videosData

        const ZERO_THRESHOLD = 50   // 연속 0을 몇 번 허용할지
        const ERROR_THRESHOLD = 30   // 연속 에러가 몇 번이면 네트워크 불안으로 판단할지

        while (retryCount < 1000) {
          retryCount++
          console.log(`[RECORDING] Verification retry #${retryCount}/1000...`)

          await new Promise(resolve => setTimeout(resolve, 200)) // 0.2초 대기

          try {
            const retryVideos = await getVideos()
            // 호출 성공이므로 에러 카운터 리셋
            if (errorCount > 0) {
              errorCount = 0
              console.log('[RECORDING] Network recovered (errorCount reset)')
              setNetworkError(false)
            }

            console.log(`[RECORDING] Retry result:`, retryVideos.length, 'videos')

            if (retryVideos.length > 0) {
              // 영상이 있으면 즉시 업데이트하고 종료
              console.log(`[RECORDING] ✅ Found videos on retry #${retryCount}:`, retryVideos.length, 'items')
              verifiedVideos = retryVideos
              setNetworkError(false)
              break
            } else {
              // 정상 응답인데 0개: zeroCount 증가
              zeroCount++
              console.log(`[RECORDING] ⚠️ No videos detected (${zeroCount} consecutive zero results)`)

              // 0이 연속 임계치 이상이면 확정 종료
              if (zeroCount >= ZERO_THRESHOLD) {
                console.log(`[RECORDING] ❌ No videos after ${zeroCount} consecutive checks — confirmed empty.`)
                verifiedVideos = []
                break
              }

              continue
            }
          } catch (error) {
            // 네트워크/요청 에러는 errorCount만 증가
            errorCount++
            console.log(`[RECORDING] ⚠️ Network/error on retry #${retryCount} (silent):`, error.message)
            setNetworkError(true)

            // 연속 에러가 일정 수를 넘으면 종료
            if (errorCount >= ERROR_THRESHOLD) {
              console.log(`[RECORDING] 🔴 Network errors ${errorCount} times — aborting verification (silent).`)
              verifiedVideos = []
              break
            }

            continue
          }
        }

        // URL 추가 (안전한 처리)
        try {
          const videosWithUrl = verifiedVideos
            .filter(v => v && v.filename)  // 유효한 데이터만 필터링
            .map(v => ({
              ...v,
              url: `http://192.168.30.71:5000/videos/${v.filename}`
            }))

          setVideos(videosWithUrl)
          setNetworkError(false)
        } catch (mapError) {
          console.log('[RECORDING] URL mapping error (silent):', mapError.message)
          setVideos([])  // 오류 시 빈 배열
        }

        if (verifiedVideos.length === 0) {
          console.log('[RECORDING] Verified: 0 videos (checked', retryCount, 'times)')
        } else {
          console.log('[RECORDING] Final result:', verifiedVideos.length, 'videos')
        }
      } else {
        // 영상이 있으면 바로 업데이트 (안전한 처리)
        try {
          const videosWithUrl = videosData
            .filter(v => v && v.filename)  // 유효한 데이터만 필터링
            .map(v => ({
              ...v,
              url: `http://192.168.30.71:5000/videos/${v.filename}`
            }))
          setVideos(videosWithUrl)
        } catch (mapError) {
          console.log('[RECORDING] URL mapping error (silent):', mapError.message)
          setVideos([])  // 오류 시 빈 배열
        }
      }
    } catch (error) {
      console.log('[RECORDING] Failed to load (silent):', error.message)
      // 최상위 오류 발생 시 빈 배열로 안전하게 처리
      try {
        setVideos([])
      } catch (stateError) {
        console.log('[RECORDING] State update error (silent):', stateError.message)
      }
    } finally {
      setLoading(false)
      setIsFetching(false)
      setNetworkError(false)
    }
  }

  // 새로고침
  const onRefresh = async () => {
    setRefreshing(true)
    await fetchVideos()
    setRefreshing(false)
  }

  // 영상 선택/해제 토글
  const toggleSelect = (fileName) => {
    setSelectedIds(prev => {
      if (prev.includes(fileName)) {
        return prev.filter(name => name !== fileName)
      } else {
        return [...prev, fileName]
      }
    })
  }

  // 전체 선택/해제 (안전한 처리)
  const toggleSelectAll = () => {
    try {
      if (!videos || !Array.isArray(videos)) {
        console.log('[VIDEO SELECT] Videos is not array (silent)')
        return
      }

      const readableVideos = videos.filter(v => v && v.IS_READABLE && parseInt(v.IS_READABLE) !== 0 && !(v.END_AT === null || v.END_AT === '-'))
      if (selectedIds.length === readableVideos.length) {
        // 전체가 선택된 경우 -> 전체 해제
        setSelectedIds([])
      } else {
        // 일부만 선택되거나 아무것도 선택 안된 경우 -> 전체 선택
        setSelectedIds(readableVideos.filter(v => v.filename).map(v => v.filename))
      }
    } catch (error) {
      console.log('[VIDEO SELECT] Toggle select all error (silent):', error.message)
    }
  }

  // 선택된 영상 삭제 (알람 탭 참조 - 순차 삭제)
  const handleDeleteSelected = async () => {
    console.log('[VIDEO DELETE] handleDeleteSelected called, selectedIds:', selectedIds)

    if (selectedIds.length === 0) {
      Alert.alert('알림', '삭제할 영상을 선택해주세요.')
      return
    }

    // 삭제 확인
    Alert.alert(
      '영상 삭제',
      `선택한 ${selectedIds.length}개의 영상을 삭제하시겠습니까?`,
      [
        {
          text: '취소',
          style: 'cancel',
          onPress: () => console.log('[VIDEO DELETE] Cancelled by user')
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            console.log('[VIDEO DELETE] Starting deletion of', selectedIds.length, 'videos')
            console.log('[VIDEO DELETE] Files to delete:', selectedIds)

            // 삭제 개수 저장 (초기화 전에)
            const deletedCount = selectedIds.length

            let deleteSuccessCount = 0
            let deleteFailCount = 0

            setLoading(true)

            // 순차적으로 삭제
            for (const fileName of selectedIds) {
              try {
                console.log('[VIDEO DELETE] Deleting video:', fileName)
                await deleteVideo(fileName)
                console.log('[VIDEO DELETE] Delete completed for:', fileName)
                deleteSuccessCount++
              } catch (error) {
                // 삭제 에러는 조용히 처리 (백엔드에서는 삭제되었을 수 있음)
                console.log('[VIDEO DELETE] Failed to delete', fileName, '(silent):', error.message)
                deleteFailCount++
              }
            }

            console.log('[VIDEO DELETE] Deletion complete:', deleteSuccessCount, 'success,', deleteFailCount, 'failed')

            // 선택 초기화
            setSelectedIds([])

            // 선택된 영상이 삭제된 경우 선택 해제
            if (selectedVideo && selectedIds.includes(selectedVideo.filename)) {
              setSelectedVideo(null)
            }

            // 삭제 완료 메시지 먼저 표시
            Alert.alert('완료', `${deletedCount}개의 영상을 삭제했습니다.`)

            // 타이밍 이슈 방지: 삭제 후 1초 대기
            console.log('[VIDEO DELETE] Waiting 1 second before reload (timing issue)...')
            await new Promise(resolve => setTimeout(resolve, 1000))

            // 재로드 (처음 로드할 때와 동일한 방식)
            console.log('[VIDEO DELETE] Reloading data...')
            setLoading(false)
            setIsFetching(false) // 플래그 완전 초기화
            setNetworkError(false) // 네트워크 에러 상태 초기화

            // 처음 로드할 때처럼 fetchVideos() 호출 (오류는 조용히 처리)
            try {
              await fetchVideos()
            } catch (reloadError) {
              console.log('[VIDEO DELETE] Reload error (silent):', reloadError.message)
            }
          }
        }
      ]
    )
  }

  // 다운로드
  const handleDownload = () => {
    if (!selectedVideo) return

    Alert.alert(
      '파일 다운로드',
      `${selectedVideo.filename} 파일을 다운로드하시겠습니까?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '받기',
          onPress: () => {
            const downloadUrl = getVideoDownloadUrl(selectedVideo.filename)
            Linking.openURL(downloadUrl)
          }
        }
      ]
    )
  }

  useEffect(() => {
    fetchVideos()
  }, [])

  return (
    <View style={styles.recordingContainer}>
      {/* 상단: 영상 리스트 섹션 */}
      <View style={styles.recordingListSection}>
        <View style={styles.recordingHeader}>
          <View style={styles.recordingTitleRow}>
            <Ionicons name="film" size={20} color="#212121" />
            <Text style={styles.sectionTitle}>녹화 영상</Text>
            <Text style={styles.alarmCount}>({(videos && Array.isArray(videos) ? videos.filter(v => v && v.IS_READABLE && parseInt(v.IS_READABLE) !== 0) : []).length})</Text>
          </View>
          <View style={styles.alarmHistoryButtons}>
            {(videos && Array.isArray(videos) ? videos.filter(v => v && v.IS_READABLE && parseInt(v.IS_READABLE) !== 0 && !(v.END_AT === null || v.END_AT === '-')) : []).length > 0 && (
              <TouchableOpacity style={styles.allButton} onPress={toggleSelectAll}>
                <Text style={styles.allButtonText}>All</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.refreshSmallButton} onPress={onRefresh}>
              <Ionicons name="refresh" size={18} color="#2196F3" />
            </TouchableOpacity>
            {selectedIds.length > 0 && (
              <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteSelected}>
                <Ionicons name="trash-outline" size={16} color="#FF4444" />
                <Text style={styles.deleteButtonText}>{selectedIds.length}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 네트워크 연결 중 표시 */}
        {networkError && (
          <View style={styles.networkErrorContainerSmall}>
            <Ionicons name="sync-outline" size={32} color="#2196F3" />
            <Text style={styles.networkConnectingTextSmall}>네트워크 연결 중...</Text>
            <Text style={styles.networkConnectingSubTextSmall}>데이터를 불러오고 있습니다</Text>
          </View>
        )}

        {loading ? (
          <View style={styles.loadingContainerSmall}>
            <Text style={styles.loadingTextSmall}>로딩 중...</Text>
          </View>
        ) : networkError ? null : (videos && Array.isArray(videos) && videos.filter(v => v && parseInt(v.IS_READABLE) !== 0).length === 0) ? (
          <View style={styles.emptyVideoContainer}>
            <Ionicons name="film-outline" size={32} color="#9E9E9E" />
            <Text style={styles.emptyVideoText}>녹화된 영상이 없습니다</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.videoListScrollSmall}
            showsVerticalScrollIndicator={true}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {(videos && Array.isArray(videos) ? videos : [])
              .filter(v => v && v.IS_READABLE && parseInt(v.IS_READABLE) !== 0)
              .map((video, index) => {
                const recording = index === 0 && (video.END_AT === null || video.END_AT === '-')
                const isSelected = selectedVideo?.filename === video.filename
                const isChecked = selectedIds.includes(video.filename)

                return (
                  <View
                    key={video.filename}
                    style={[
                      styles.videoItemSmall,
                      isSelected && styles.videoItemSelectedSmall,
                      recording && styles.videoItemRecordingSmall
                    ]}
                  >
                    {/* 체크박스 (녹화중이 아닐 때만 표시) */}
                    {!recording && (
                      <TouchableOpacity
                        style={styles.videoCheckbox}
                        onPress={() => toggleSelect(video.filename)}
                      >
                        <Ionicons
                          name={isChecked ? "checkbox" : "square-outline"}
                          size={22}
                          color={isChecked ? "#2196F3" : "#9E9E9E"}
                        />
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={styles.videoItemLeftSmall}
                      onPress={() => !recording && setSelectedVideo(video)}
                      disabled={recording}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={recording ? 'radio-button-on' : 'play-circle'}
                        size={18}
                        color={recording ? '#FF4444' : isSelected ? '#2196F3' : '#616161'}
                      />
                      <View style={styles.videoItemContentSmall}>
                        <Text style={styles.videoItemTitleSmall} numberOfLines={1}>
                          {video.filename}
                        </Text>
                        <Text style={styles.videoItemTimeSmall}>
                          {video.SAVED_AT}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    {/* 녹화중 표시 (녹화중일 때만) */}
                    {recording && (
                      <View style={styles.recordingBadge}>
                        <Text style={styles.recordingBadgeText}>녹화중</Text>
                      </View>
                    )}
                  </View>
                )
              })}
          </ScrollView>
        )}
      </View>

      {/* 하단: 비디오 플레이어 섹션 */}
      <View style={styles.recordingPlayerSection}>
        {selectedVideo ? (
          <>
            <View style={styles.videoPlayerHeader}>
              <Text style={styles.videoPlayerTitle}>재생 중: {selectedVideo.filename}</Text>
              <TouchableOpacity onPress={() => setSelectedVideo(null)}>
                <Ionicons name="close" size={24} color="#212121" />
              </TouchableOpacity>
            </View>
            <Video
              ref={videoRef}
              source={{ uri: selectedVideo.url }}
              style={styles.videoPlayer}
              useNativeControls
              resizeMode="contain"
              shouldPlay={false}
            />
            <View style={styles.videoDetailsCompact}>
              <View style={styles.videoDetailRow}>
                <Text style={styles.videoDetailLabel}>카메라:</Text>
                <Text style={styles.videoDetailValue}>{selectedVideo.CAMERA_ID}</Text>
              </View>
              <View style={styles.videoDetailRow}>
                <Text style={styles.videoDetailLabel}>저장:</Text>
                <Text style={styles.videoDetailValue}>{selectedVideo.SAVED_AT} ~ {selectedVideo.END_AT || '-'}</Text>
              </View>
            </View>
            <View style={styles.videoActions}>
              <TouchableOpacity
                style={styles.videoActionButton}
                onPress={handleDownload}
              >
                <Ionicons name="download" size={20} color="#FFF" />
                <Text style={styles.videoActionButtonText}>내려받기</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.noVideoSelected}>
            <Ionicons name="play-circle-outline" size={64} color="#9E9E9E" />
            <Text style={styles.noVideoSelectedText}>영상을 선택하면 이곳에 재생됩니다</Text>
          </View>
        )}
      </View>
    </View>
  )
}

// ========================================
// 알람 히스토리 뷰 (DB 저장된 알람)
// ========================================
const AlarmHistoryView = () => {
  console.log('[DEBUG] ========== 알람 히스토리 뷰 마운트 ==========')
  console.log('[DEBUG] DB 알람만 사용, 실시간 알람(SSE) 사용 안 함')

  const [alarms, setAlarms] = useState([])
  const [dangerousObjects, setDangerousObjects] = useState([])
  const [selectedIds, setSelectedIds] = useState([]) // 선택된 알람 ID들
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [networkError, setNetworkError] = useState(false) // 네트워크 에러 상태
  const [isFetching, setIsFetching] = useState(false) // 데이터 로딩 중 플래그

  // 위험 객체 맵 (label -> 한글 이름)
  const dangerMap = useMemo(() => {
    const map = new Map()
    dangerousObjects.forEach(obj => {
      const code = (obj.OBJECT_CODE || '').toString().trim().toLowerCase()
      map.set(code, obj.OBJECT_NAME_KR)
    })
    return map
  }, [dangerousObjects])

  // 알람 메시지 생성 (Web 코드 참조 - DB에서 한글 이름 가져오기)
  const getAlarmMessage = (labelRaw) => {
    const code = (labelRaw || '').toString().trim().toLowerCase()
    const nameKr = dangerMap.get(code)

    if (nameKr) {
      // DB에 등록된 한글 이름 사용
      return `🚨 유해동물 ${nameKr}가 침입했습니다!!`
    } else {
      // DB에 없으면 기본 메시지
      return `🚨 유해동물 ${labelRaw === 'dog' ? '개' : nameKr}가 침입했습니다!!`
    }
  }

  // 데이터 로드 (DB 알람만 조회)
  const fetchData = async () => {
    // 이미 로딩 중이면 중복 호출 방지
    if (isFetching) {
      console.log('[DB ALARM] 이미 로딩 중, 건너뜀...')
      return
    }

    try {
      setIsFetching(true)
      setLoading(true)
      setNetworkError(false)

      console.log('[DEBUG] DB 알람 조회 시작 (getAlarmHistory)...')
      // 병렬로 조회
      const [alarmsData, objectsData] = await Promise.all([
        getAlarmHistory(100),
        getDangerousObjects()
      ])

      console.log('[DB ALARM] 조회 완료:', alarmsData.length, '개 알람,', objectsData.length, '개 위험 객체')

      // 알람이 0개일 경우 실제로 0개인지 최대 1000번 재확인
      if (alarmsData.length === 0) {
        console.log('[DB ALARM] 알람 0개 - 재확인 시작 (최대 1000회)...')
        setNetworkError(true) // "네트워크 연결 중..." 표시

        let retryCount = 0
        let zeroCount = 0        // 연속된 '0개 응답' 카운터 (정상 응답일 때만 증가)
        let errorCount = 0       // 연속된 에러 카운터 (에러일 때 증가, zeroCount와 분리)
        let verifiedAlarms = alarmsData

        const ZERO_THRESHOLD = 50   // 연속 0을 몇 번 허용할지
        const ERROR_THRESHOLD = 30   // 연속 에러가 몇 번이면 네트워크 불안으로 판단할지

        while (retryCount < 1000) {
          retryCount++
          console.log(`[DB ALARM] 재확인 시도 #${retryCount}/1000...`)

          await new Promise(resolve => setTimeout(resolve, 200)) // 0.2초 대기

          try {
            const retryAlarms = await getAlarmHistory(100)
            // 호출 성공이므로 에러 카운터 리셋
            if (errorCount > 0) {
              errorCount = 0
              console.log('[DB ALARM] 네트워크 복구 (에러 카운터 리셋)')
              setNetworkError(false)
            }

            console.log(`[ALARM HISTORY] Retry result:`, retryAlarms.length, 'alarms')

            if (retryAlarms.length > 0) {
              // 알람이 있으면 즉시 업데이트하고 종료
              console.log(`[ALARM HISTORY] ✅ Found alarms on retry #${retryCount}:`, retryAlarms.length, 'items')
              verifiedAlarms = retryAlarms
              setNetworkError(false)
              break
            } else {
              // 정상 응답인데 0개: zeroCount 증가
              zeroCount++
              console.log(`[ALARM HISTORY] ⚠️ No alarms detected (${zeroCount} consecutive zero results)`)

              // 0이 연속 임계치 이상이면 확정 종료
              if (zeroCount >= ZERO_THRESHOLD) {
                console.log(`[ALARM HISTORY] ❌ No alarms after ${zeroCount} consecutive checks — confirmed empty.`)
                verifiedAlarms = []
                break
              }

              // 계속 재시도 (에러가 없는 정상 "0" 응답이므로 루프 계속)
              continue
            }
          } catch (error) {
            // 네트워크/요청 에러는 zeroCount가 아니라 errorCount만 증가
            errorCount++
            console.warn(`[ALARM HISTORY] ⚠️ Network/error on retry #${retryCount}:`, error.message)
            setNetworkError(true)

            // 원하는 경우 연속 에러가 일정 수를 넘으면 종료(또는 다른 처리)
            if (errorCount >= ERROR_THRESHOLD) {
              // 조용히 처리
              // 네트워크 불안 상태로 간주하고 빈 배열로 확정하거나 기존 alarmsData 유지
              verifiedAlarms = [] // 또는: verifiedAlarms = alarmsData
              break
            }

            // 에러는 zeroCount에 포함시키지 않고 단순 재시도
            continue
          }
        }



        // 최종 결과 업데이트
        setAlarms(verifiedAlarms)
        setDangerousObjects(objectsData)
        setNetworkError(false)

        if (verifiedAlarms.length === 0) {
          console.log('[ALARM HISTORY] Verified: 0 alarms (checked', retryCount, 'times)')
        } else {
          console.log('[ALARM HISTORY] Final result:', verifiedAlarms.length, 'alarms')
        }
      } else {
        // 알람이 있으면 바로 업데이트
        setAlarms(alarmsData)
        setDangerousObjects(objectsData)
      }
    } catch (error) {
      console.log('[ALARM HISTORY] Failed to load (silent):', error.message)
    } finally {
      setLoading(false)
      setIsFetching(false)
      setNetworkError(false)
    }
  }

  // 새로고침
  const onRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  // 알람 선택/해제 토글
  const toggleSelect = (alarmId) => {
    setSelectedIds(prev => {
      if (prev.includes(alarmId)) {
        return prev.filter(id => id !== alarmId)
      } else {
        return [...prev, alarmId]
      }
    })
  }

  // 전체 선택/해제
  const toggleSelectAll = () => {
    if (selectedIds.length === alarms.length) {
      // 전체가 선택된 경우 -> 전체 해제
      setSelectedIds([])
    } else {
      // 일부만 선택되거나 아무것도 선택 안된 경우 -> 전체 선택
      setSelectedIds(alarms.map(alarm => alarm.ALARM_ID))
    }
  }

  // 선택된 알람 삭제 (Web 참조 - 순차 삭제)
  const handleDeleteSelected = async () => {
    console.log('[ALARM DELETE] handleDeleteSelected called, selectedIds:', selectedIds)

    if (selectedIds.length === 0) {
      Alert.alert('알림', '삭제할 알람을 선택해주세요.')
      return
    }

    // 삭제 확인
    Alert.alert(
      '알람 삭제',
      `선택한 ${selectedIds.length}개의 알람을 삭제하시겠습니까?`,
      [
        {
          text: '취소',
          style: 'cancel',
          onPress: () => console.log('[ALARM DELETE] Cancelled by user')
        },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            console.log('[ALARM DELETE] Starting deletion of', selectedIds.length, 'alarms')
            console.log('[ALARM DELETE] IDs to delete:', selectedIds)

            // 삭제 개수 저장 (초기화 전에)
            const deletedCount = selectedIds.length

            let deleteSuccessCount = 0
            let deleteFailCount = 0

            setLoading(true)

            // 순차적으로 삭제 (백엔드가 1개씩만 지원)
            for (const alarmId of selectedIds) {
              try {
                console.log('[ALARM DELETE] Deleting alarm ID:', alarmId)
                const result = await deleteAlarm(alarmId)
                console.log('[ALARM DELETE] Delete result for', alarmId, ':', result)
                deleteSuccessCount++
              } catch (error) {
                // 삭제 에러는 조용히 처리 (백엔드에서는 삭제되었을 수 있음)
                console.log('[ALARM DELETE] Failed to delete', alarmId, '(silent):', error.message)
                deleteFailCount++
              }
            }

            console.log('[ALARM DELETE] Deletion complete:', deleteSuccessCount, 'success,', deleteFailCount, 'failed')

            // 선택 초기화
            setSelectedIds([])

            // 삭제 완료 메시지 먼저 표시
            Alert.alert('완료', `${deletedCount}개의 알람을 삭제했습니다.`)

            // 타이밍 이슈 방지: 삭제 후 1초 대기
            console.log('[ALARM DELETE] Waiting 1 second before reload (timing issue)...')
            await new Promise(resolve => setTimeout(resolve, 1000))

            // 재로드 (처음 로드할 때와 동일한 방식)
            console.log('[ALARM DELETE] Reloading data...')
            setLoading(false)
            setIsFetching(false) // 플래그 완전 초기화
            setNetworkError(false) // 네트워크 에러 상태 초기화

            // 처음 로드할 때처럼 fetchData() 호출 (retryCount 없이)
            await fetchData()
          }
        }
      ]
    )
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <View style={styles.alarmHistoryContainer}>
      {/* 헤더 */}
      <View style={styles.alarmHistoryHeader}>
        <View style={styles.alarmHistoryTitleRow}>
          <Ionicons name="list" size={20} color="#212121" />
          <Text style={styles.sectionTitle}>알람 리스트</Text>
          <Text style={styles.alarmCount}>({alarms.length})</Text>
        </View>
        <View style={styles.alarmHistoryButtons}>
          {alarms.length > 0 && (
            <TouchableOpacity style={styles.allButton} onPress={toggleSelectAll}>
              <Text style={styles.allButtonText}>All</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.refreshSmallButton} onPress={onRefresh}>
            <Ionicons name="refresh" size={18} color="#2196F3" />
          </TouchableOpacity>
          {selectedIds.length > 0 && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteSelected}>
              <Ionicons name="trash-outline" size={18} color="#FF4444" />
              <Text style={styles.deleteButtonText}>{selectedIds.length}개 삭제</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* 네트워크 연결 중 표시 */}
      {networkError && (
        <View style={styles.networkErrorContainer}>
          <Ionicons name="sync-outline" size={48} color="#2196F3" />
          <Text style={styles.networkConnectingText}>네트워크 연결 중...</Text>
          <Text style={styles.networkConnectingSubText}>데이터를 불러오고 있습니다</Text>
        </View>
      )}

      {/* 알람 리스트 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>로딩 중...</Text>
        </View>
      ) : networkError ? null : alarms.length === 0 ? (
        <View style={styles.emptyAlarmContainer}>
          <Ionicons name="folder-open-outline" size={48} color="#9E9E9E" />
          <Text style={styles.emptyAlarmText}>저장된 알람이 없습니다</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.alarmHistoryList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {alarms.map((alarm) => {
            const isSelected = selectedIds.includes(alarm.ALARM_ID)
            return (
              <TouchableOpacity
                key={alarm.ALARM_ID}
                style={[styles.alarmHistoryItemCompact, isSelected && styles.alarmHistoryItemCompactSelected]}
                onPress={() => toggleSelect(alarm.ALARM_ID)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkboxCompact, isSelected && styles.checkboxCompactSelected]}>
                  {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                </View>
                <View style={styles.alarmHistoryItemContentCompact}>
                  <Text style={styles.alarmHistoryItemMessageCompact} numberOfLines={1}>
                    {getAlarmMessage(alarm.OBJECT_LABEL)}
                  </Text>
                  <Text style={styles.alarmHistoryItemTimeCompact}>
                    {new Date(alarm.DETECTED_AT).toLocaleTimeString('ko-KR')} · {(alarm.SCORE * 100).toFixed(0)}%
                  </Text>
                </View>
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}

export default CCTVScreen

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingTop: 0,
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
    fontFamily: 'System',
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 8,
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
  realtimeContainer: {
    flex: 1,
  },
  streamSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  streamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  streamHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streamTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212121',
    marginLeft: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeRecording: {
    backgroundColor: '#FFEBEE',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2196F3',
    marginRight: 6,
  },
  statusDotRecording: {
    backgroundColor: '#FF4444',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2196F3',
  },
  statusTextRecording: {
    color: '#FF4444',
  },
  recordingStatusSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 8,
    padding: 10,
    gap: 8,
  },
  recordingStatusText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF4444',
    flex: 1,
  },
  recordStartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  recordStopButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#616161',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  recordButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  streamContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#000000',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  webView: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
  },
  alarmSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 350,
  },
  alarmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  alarmHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  clearButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF4444',
  },
  emptyAlarmContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyAlarmText: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 8,
  },
  networkErrorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    marginVertical: 8,
  },
  networkErrorText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF9800',
    marginTop: 12,
  },
  networkErrorSubText: {
    fontSize: 13,
    color: '#F57C00',
    marginTop: 4,
  },
  networkConnectingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
    marginTop: 12,
  },
  networkConnectingSubText: {
    fontSize: 13,
    color: '#1976D2',
    marginTop: 4,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
    gap: 6,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
  alarmCount: {
    fontSize: 14,
    color: '#616161',
    marginLeft: 4,
  },
  alarmList: {
    maxHeight: 220,
  },
  alarmItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#FF4444',
  },
  alarmItemText: {
    fontSize: 14,
    color: '#212121',
    lineHeight: 20,
  },
  // 알람 히스토리 스타일
  alarmHistoryContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alarmHistoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  alarmHistoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alarmHistoryButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  allButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
  },
  allButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4CAF50',
  },
  refreshSmallButton: {
    padding: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FF4444',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#9E9E9E',
  },
  alarmHistoryList: {
    flex: 1,
  },
  alarmHistoryItem: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
  },
  alarmHistoryItemSelected: {
    backgroundColor: '#E3F2FD',
    borderLeftColor: '#2196F3',
  },
  alarmHistoryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#BDBDBD',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  alarmHistoryItemContent: {
    flex: 1,
  },
  alarmHistoryItemMessage: {
    fontSize: 15,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  alarmHistoryItemTime: {
    fontSize: 13,
    color: '#616161',
    marginBottom: 2,
  },
  alarmHistoryItemScore: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  // 간략화된 알람 히스토리 스타일 (실시간 알람처럼)
  alarmHistoryItemCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
    gap: 10,
  },
  alarmHistoryItemCompactSelected: {
    backgroundColor: '#E3F2FD',
    borderLeftColor: '#2196F3',
  },
  checkboxCompact: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#BDBDBD',
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxCompactSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  alarmHistoryItemContentCompact: {
    flex: 1,
  },
  alarmHistoryItemMessageCompact: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 2,
  },
  alarmHistoryItemTimeCompact: {
    fontSize: 11,
    color: '#616161',
  },
  // 녹화 영상 스타일 (실시간 탭처럼 위아래 분할)
  recordingContainer: {
    flex: 1,
  },
  recordingListSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    maxHeight: 250, // 헤더 + 3개 아이템 표시
  },
  recordingPlayerSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flex: 1,
  },
  recordingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  recordingTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // 작은 리스트 스타일 (3개 아이템만 보이도록)
  videoListScrollSmall: {
    maxHeight: 150, // 3개 아이템 높이 (각 아이템 약 46px + 여백)
  },
  emptyVideoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyVideoText: {
    fontSize: 13,
    color: '#9E9E9E',
    marginTop: 8,
  },
  networkErrorContainerSmall: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  networkConnectingTextSmall: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2196F3',
    marginTop: 8,
  },
  networkConnectingSubTextSmall: {
    fontSize: 11,
    color: '#1976D2',
    marginTop: 4,
  },
  loadingContainerSmall: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingTextSmall: {
    fontSize: 13,
    color: '#9E9E9E',
  },
  videoItemSmall: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#9E9E9E',
  },
  videoItemSelectedSmall: {
    backgroundColor: '#E3F2FD',
    borderLeftColor: '#2196F3',
  },
  videoItemRecordingSmall: {
    backgroundColor: '#FFEBEE',
    borderLeftColor: '#FF4444',
  },
  videoItemLeftSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  videoItemContentSmall: {
    flex: 1,
  },
  videoItemTitleSmall: {
    fontSize: 12,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 2,
  },
  videoItemTimeSmall: {
    fontSize: 10,
    color: '#616161',
  },
  videoDeleteButtonSmall: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  videoDeleteButtonTextSmall: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FF4444',
  },
  videoDeleteButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  videoCheckbox: {
    padding: 4,
    marginRight: 8,
  },
  recordingBadge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  recordingBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FF4444',
  },
  // 기존 큰 리스트 스타일 (사용 안함)
  videoListScroll: {
    maxHeight: 300,
    marginBottom: 16,
  },
  videoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#9E9E9E',
  },
  videoItemSelected: {
    backgroundColor: '#E3F2FD',
    borderLeftColor: '#2196F3',
  },
  videoItemDeleted: {
    backgroundColor: '#EEEEEE',
    borderLeftColor: '#9E9E9E',
    opacity: 0.6,
  },
  videoItemRecording: {
    backgroundColor: '#FFEBEE',
    borderLeftColor: '#FF4444',
  },
  videoItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  videoItemContent: {
    flex: 1,
  },
  videoItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  videoItemTitleDeleted: {
    color: '#9E9E9E',
    textDecorationLine: 'line-through',
  },
  videoItemTime: {
    fontSize: 12,
    color: '#616161',
  },
  videoDeleteButton: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  videoDeleteButtonDisabled: {
    backgroundColor: '#E0E0E0',
  },
  videoDeleteButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF4444',
  },
  videoPlayerSection: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  videoPlayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  videoPlayerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
  },
  videoPlayer: {
    width: '100%',
    height: 200,
    backgroundColor: '#000',
    borderRadius: 8,
    marginBottom: 12,
  },
  videoDetails: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  videoDetailText: {
    fontSize: 13,
    color: '#616161',
    marginBottom: 4,
  },
  videoDetailsCompact: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    gap: 6,
  },
  videoDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  videoDetailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#616161',
    minWidth: 50,
  },
  videoDetailValue: {
    fontSize: 12,
    color: '#212121',
    flex: 1,
  },
  noVideoSelected: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  noVideoSelectedText: {
    fontSize: 14,
    color: '#9E9E9E',
    marginTop: 16,
    textAlign: 'center',
  },
  videoActions: {
    flexDirection: 'row',
    gap: 8,
  },
  videoActionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  videoActionButtonDanger: {
    backgroundColor: '#FF4444',
  },
  videoActionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },
})