import axios from 'axios'

// 개발 모드 설정
// true: 목업 데이터 사용 (백엔드 없이 테스트)
// false: 실제 백엔드 API 사용
export const USE_MOCK_DATA = false  // ✅ 백엔드 서버 연결됨!

// 백엔드 서버 주소 설정
// 개발 환경에 따라 변경하세요

// ⚠️ 중요: USE_MOCK_DATA = false 일 때 백엔드 서버를 먼저 실행하세요!
// cd d:/01-STUDY/dev/backend_chickenFarm
// gradlew bootRun

// Android 에뮬레이터에서 테스트 시
// const BASE_URL = 'http://10.0.2.2:8080'

// iOS 시뮬레이터 또는 Expo Go에서 테스트 시
// const BASE_URL = 'http://localhost:8080'

// 실제 기기 또는 Expo Go에서 테스트 시 (같은 Wi-Fi 네트워크)
// 현재 컴퓨터 IP: 192.168.30.146
const BASE_URL = 'http://192.168.30.91:8081'

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 요청 인터셉터 (로깅, 인증 토큰 추가 등)
api.interceptors.request.use(
  (config) => {
    console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => {
    console.error('[API Request Error]', error)
    return Promise.reject(error)
  }
)

// 응답 인터셉터 (에러 처리)
api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.config.url}`, response.data)
    return response
  },
  (error) => {
    console.error('[API Response Error]', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export default api
