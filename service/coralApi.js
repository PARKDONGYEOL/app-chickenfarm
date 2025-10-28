import axios from 'axios'

// CORAL 백엔드 서버 주소 (Odroid M1S)
const CORAL_BASE_URL = 'http://192.168.30.71:5000'

// Axios 인스턴스 생성
const coralApi = axios.create({
  baseURL: CORAL_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 요청 인터셉터
coralApi.interceptors.request.use(
  (config) => {
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 응답 인터셉터
coralApi.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    const isAlarmEndpoint = error.config?.url?.includes('/alarms')
    const isDangerousObjectsEndpoint = error.config?.url?.includes('/dangerous_objects')
    const isRecordEndpoint = error.config?.url?.includes('/record')
    const isVideoDeleteEndpoint = error.config?.url?.includes('/videos/delete')
    const isVideosDbEndpoint = error.config?.url?.includes('/videos_db')
    const isAlarmDbEndpoint = error.config?.url?.includes('/alarms_db')
    const isSilentEndpoint = isAlarmEndpoint || isDangerousObjectsEndpoint || isRecordEndpoint || isVideoDeleteEndpoint || isVideosDbEndpoint || isAlarmDbEndpoint

    if (error.response) {
      if (!isSilentEndpoint) {
        console.error('[CORAL API Response Error]', {
          status: error.response.status,
          data: error.response.data,
          url: error.config?.url
        })
      }
    } else if (error.request) {
      if (!isSilentEndpoint) {
        console.error('[CORAL API Network Error]', {
          message: error.message,
          url: error.config?.url
        })
      }
    } else {
      if (!isSilentEndpoint) {
        console.error('[CORAL API Request Setup Error]', error.message)
      }
    }
    return Promise.reject(error)
  }
)

// ========================================
// CCTV 스트리밍 API
// ========================================

/**
 * 실시간 CCTV 스트리밍 URL 반환
 */
export const getVideoStreamUrl = () => {
  return `${CORAL_BASE_URL}/video_feed`
}

// ========================================
// 알람 API
// ========================================

/**
 * 실시간 알람 목록 조회 (메모리에서)
 */
export const getRecentAlarms = async () => {
  try {
    const response = await coralApi.get('/alarms', { timeout: 500 })
    return response.data || []
  } catch (error) {
    return []
  }
}

/**
 * 알람 폴링 연결 (SSE 대신 폴링 사용 - 에뮬레이터 호환)
 * @param {function} onAlarm - 알람 수신 시 호출되는 콜백
 * @param {function} onError - 에러 발생 시 호출되는 콜백
 * @param {function} onNetworkStatus - 네트워크 상태 변경 콜백 (isHealthy)
 * @returns {function} cleanup - 연결 종료 함수
 */
export const connectAlarmStream = (onAlarm, onError, onNetworkStatus) => {
  let isActive = true
  let previousAlarms = []
  let pollCount = 0
  let consecutiveErrors = 0
  let isNetworkHealthy = true

  console.log('========================================')
  console.log('[실시간 알람] 작동 시작')
  console.log('  - API 주소: ' + CORAL_BASE_URL + '/alarms')
  console.log('  - 방식: 폴링 (Polling)')
  console.log('  - 폴링 간격: 500ms')
  console.log('  - API 타임아웃: 500ms')
  console.log('  - 네트워크 불안정 판단: 연속 10회 에러')
  console.log('========================================')

  const poll = async () => {
    if (!isActive) return

    pollCount++

    try {
      const alarms = await getRecentAlarms()

      // 성공 시 에러 카운터 리셋
      if (consecutiveErrors > 0) {
        consecutiveErrors = 0
        if (!isNetworkHealthy) {
          isNetworkHealthy = true
          if (onNetworkStatus) {
            onNetworkStatus(true)
          }
        }
      }

      if (alarms.length > 0) {
        // 새로운 알람만 콜백 호출 (time 기준으로 판단)
        for (const alarm of alarms) {
          const isNew = !previousAlarms.some(prev => prev.time === alarm.time)

          if (isNew) {
            const sseFormat = {
              type: 'alarm',
              camera_id: 'CAM01',
              label: alarm.label,
              score: alarm.score,
              ts: new Date(alarm.time * 1000).toISOString()
            }
            onAlarm(sseFormat)
          }
        }

        previousAlarms = alarms
      }
    } catch (error) {
      consecutiveErrors++

      // 10번 연속 실패 시 네트워크 불안정으로 판단
      if (consecutiveErrors >= 10 && isNetworkHealthy) {
        isNetworkHealthy = false
        if (onNetworkStatus) {
          onNetworkStatus(false)
        }
      }

      onError(error)
    }
  }

  // 즉시 한 번 실행
  poll()

  // 500ms마다 폴링 (균형잡힌 실시간 응답)
  const interval = setInterval(poll, 500)

  // cleanup 함수 반환
  return () => {
    isActive = false
    clearInterval(interval)
  }
}

// ========================================
// 알람 히스토리 API (DB)
// ========================================

/**
 * DB에 저장된 알람 히스토리 조회
 * @param {number} limit - 가져올 알람 개수 (기본: 100)
 * @returns {Array} 알람 배열 (에러 시 빈 배열)
 */
export const getAlarmHistory = async (limit = 100) => {
  try {
    const response = await coralApi.get('/alarms_db', {
      params: { limit, _t: Date.now() },
      timeout: 500
    })

    if (response.data?.status === 'success') {
      const alarms = response.data?.alarms || []
      return alarms
    } else {
      return []
    }
  } catch (error) {
    return []
  }
}

/**
 * 위험 객체 목록 조회 (알람 메시지 표시용)
 * @returns {Array} 객체 배열 (에러 시 빈 배열)
 */
export const getDangerousObjects = async () => {
  try {
    const response = await coralApi.get('/dangerous_objects', {
      params: { _t: Date.now() },
      timeout: 5000
    })

    if (response.data?.status === 'success') {
      const objects = response.data?.objects || []
      return objects
    } else {
      return []
    }
  } catch (error) {
    return []
  }
}

/**
 * @param {number} alarmId - 삭제할 알람 ID
 */
export const deleteAlarm = async (alarmId) => {
  console.log('[API] 🗑️ Attempting to delete alarm ID:', alarmId)
  const url = `${CORAL_BASE_URL}/alarms/${alarmId}`
  console.log('[API] DELETE URL:', url)

  try {
    const response = await axios.delete(url, {
      params: { _t: Date.now() }
    })
    console.log('[API] ✅ Alarm deleted successfully:', alarmId)
    console.log('[API] Response status:', response.status)
    console.log('[API] Response data:', response.data)
    return response.data
  } catch (error) {
    console.log('[API] ⚠️ Failed to delete alarm (silent):', alarmId, error.message)
    throw error
  }
}

// ========================================
// 녹화 영상 API
// ========================================

/**
 * 녹화 영상 목록 조회 (DB에서)
 * @returns {Array} 영상 배열 (에러 시 빈 배열)
 */
export const getVideos = async () => {
  try {
    const response = await coralApi.get('/videos_db', {
      params: { _t: Date.now() },
      timeout: 500
    })

    if (response?.data?.status === 'success') {
      const videos = response.data?.videos || []

      if (!Array.isArray(videos)) {
        return []
      }

      return videos
    } else {
      return []
    }
  } catch (error) {
    return []
  }
}

/**
 * 영상 파일 삭제 (물리적 파일 삭제 + DB 업데이트)
 * @param {string} fileName - 삭제할 파일명
 */
export const deleteVideo = async (fileName) => {
  console.log('[API] 🗑️ Attempting to delete video:', fileName)

  try {
    const response = await coralApi.post(`/videos/delete/${fileName}`, {}, {
      params: { _t: Date.now() },
      timeout: 15000
    })
    console.log('[API] ✅ Video deleted successfully:', fileName)
    return response.data
  } catch (error) {
    console.log('[API] ⚠️ Failed to delete video (silent):', fileName, error.message)
    throw error
  }
}

/**
 * 삭제된 영상 DB 정리 (IS_READABLE=0인 항목 제거)
 */
export const cleanupDeletedVideos = async () => {
  console.log('[API] 🧹 Attempting to cleanup deleted videos from DB')

  try {
    const response = await coralApi.post('/videos/cleanup_deleted', {}, {
      params: { _t: Date.now() },
      timeout: 15000
    })
    console.log('[API] ✅ DB cleanup completed:', response.data)
    return response.data
  } catch (error) {
    console.log('[API] ⚠️ Failed to cleanup DB (silent):', error.message)
    throw error
  }
}

/**
 * 영상 다운로드 URL 반환
 * @param {string} fileName - 다운로드할 파일명
 */
export const getVideoDownloadUrl = (fileName) => {
  return `${CORAL_BASE_URL}/download/${fileName}`
}

// ========================================
// 녹화 제어 API
// ========================================

/**
 * 녹화 시작
 */
export const startRecording = async () => {
  console.log('[API] 🎥 Starting recording...')

  try {
    const response = await coralApi.get('/record/start', {
      params: { _t: Date.now() },
      timeout: 10000
    })
    console.log('[API] ✅ Recording started:', response.data)
    return response.data
  } catch (error) {
    console.log('[API] ⚠️ Failed to start recording:', error.message)
    throw error
  }
}

/**
 * 녹화 중지
 */
export const stopRecording = async () => {
  console.log('[API] ⏹️ Stopping recording...')

  try {
    const response = await coralApi.get('/record/stop', {
      params: { _t: Date.now() },
      timeout: 10000
    })
    console.log('[API] ✅ Recording stopped:', response.data)
    return response.data
  } catch (error) {
    console.log('[API] ⚠️ Failed to stop recording:', error.message)
    throw error
  }
}

/**
 * 녹화 상태 조회 (예외 처리 강화 - 조용히 실패)
 * @returns {Object} { is_recording: boolean, current_file: string }
 */
export const getRecordingStatus = async () => {
  try {
    const response = await coralApi.get('/record/status', {
      params: { _t: Date.now() },
      timeout: 5000
    })

    // 응답 검증
    if (response && response.data) {
      // 기본값 설정
      return {
        is_recording: response.data.is_recording ?? false,
        current_file: response.data.current_file ?? null
      }
    }

    // 응답이 없으면 기본값 반환
    return { is_recording: false, current_file: null }
  } catch (error) {
    // 에러를 조용히 처리 (콘솔 로그만)
    if (error.code === 'ECONNABORTED') {
      // 타임아웃 에러
      console.log('[API] Recording status timeout (silent)')
    } else if (error.response) {
      // 서버 응답 에러 (4xx, 5xx)
      console.log('[API] Recording status error:', error.response.status, '(silent)')
    } else if (error.request) {
      // 네트워크 에러
      console.log('[API] Recording status network error (silent)')
    } else {
      // 기타 에러
      console.log('[API] Recording status error (silent):', error.message)
    }

    // 항상 기본값 반환
    return { is_recording: false, current_file: null }
  }
}

export default coralApi