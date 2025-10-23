import api, { USE_MOCK_DATA } from './api'

/**
 * Danger Notice API Service
 * 백엔드의 DangerNoticeController와 연동
 */

// 목업 데이터 (개발/테스트용)
const MOCK_NOTICES = [
  {
    noticeNum: 1,
    noticeContent: '온도가 35도를 초과했습니다',
    noticeCategory: '온도',
    farmNum: 1,
    recTime: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  {
    noticeNum: 2,
    noticeContent: 'NH3 농도가 30ppm을 초과했습니다',
    noticeCategory: '암모니아',
    farmNum: 1,
    recTime: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
  },
  {
    noticeNum: 3,
    noticeContent: '습도가 35%로 낮습니다',
    noticeCategory: '습도',
    farmNum: 1,
    recTime: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
  },
  {
    noticeNum: 4,
    noticeContent: '일산화탄소가 감지되었습니다',
    noticeCategory: 'CO',
    farmNum: 1,
    recTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  {
    noticeNum: 5,
    noticeContent: 'CO2 농도가 2500ppm을 초과했습니다',
    noticeCategory: 'CO2',
    farmNum: 1,
    recTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    noticeNum: 6,
    noticeContent: '조도가 10 lux 이하입니다',
    noticeCategory: '조도',
    farmNum: 1,
    recTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    noticeNum: 7,
    noticeContent: 'NO2가 0.5ppm 감지되었습니다',
    noticeCategory: 'NO2',
    farmNum: 1,
    recTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
]

/**
 * 알림 목록 조회
 * @param {number} farmNum - 농장 번호
 * @returns {Promise<Array>} 알림 목록
 */
export const getDangerNotices = async (farmNum) => {
  // 목업 데이터 모드
  if (USE_MOCK_DATA) {
    console.log('[MOCK MODE] Returning mock danger notices')
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(MOCK_NOTICES.filter((notice) => notice.farmNum === farmNum))
      }, 500) // 네트워크 지연 시뮬레이션
    })
  }

  // 실제 API 호출
  try {
    const response = await api.get(`/danger/list/${farmNum}`)

    if (response.data.success) {
      return response.data.data
    } else {
      throw new Error('Failed to fetch danger notices')
    }
  } catch (error) {
    console.error('Error fetching danger notices:', error)
    throw error
  }
}

/**
 * 기간별 알림 목록 조회 (신규)
 * @param {number} farmNum - 농장 번호
 * @param {string} period - 기간 ('day', 'week', 'month', 'all')
 * @returns {Promise<Array>} 알림 목록
 */
export const getDangerNoticesByPeriod = async (farmNum, period) => {
  // 목업 데이터 모드
  if (USE_MOCK_DATA) {
    console.log(`[MOCK MODE] Returning mock danger notices for period: ${period}`)
    return new Promise((resolve) => {
      setTimeout(() => {
        const now = new Date()
        let filteredNotices = MOCK_NOTICES.filter((notice) => notice.farmNum === farmNum)

        // 기간별 필터링
        if (period !== 'all') {
          filteredNotices = filteredNotices.filter((notice) => {
            const noticeTime = new Date(notice.recTime)
            const diffMs = now - noticeTime
            const diffDays = diffMs / (1000 * 60 * 60 * 24)

            switch (period) {
              case 'day':
                return diffDays <= 1
              case 'week':
                return diffDays <= 7
              case 'month':
                return diffDays <= 30
              default:
                return true
            }
          })
        }

        resolve(filteredNotices)
      }, 500)
    })
  }

  // 실제 API 호출
  try {
    // period가 'all'인 경우 파라미터 없이 호출
    const url = period === 'all'
      ? `/danger/list/${farmNum}`
      : `/danger/${farmNum}/period?period=${period}`

    console.log(`[getDangerNoticesByPeriod] ====== REQUEST ======`)
    console.log(`[getDangerNoticesByPeriod] farmNum: ${farmNum}, period: "${period}"`)
    console.log(`[getDangerNoticesByPeriod] Calling API: ${url}`)
    const response = await api.get(url)
    console.log(`[getDangerNoticesByPeriod] ====== RESPONSE ======`)
    console.log(`[getDangerNoticesByPeriod] Response data count:`, response.data.length || response.data.data?.length)

    // period가 'all'일 때는 기존 API 응답 형식, 아니면 새로운 API 응답 형식
    if (period === 'all') {
      if (response.data.success) {
        return response.data.data
      } else {
        throw new Error('Failed to fetch danger notices')
      }
    } else {
      // 새로운 API는 직접 배열을 반환
      console.log(`[getDangerNoticesByPeriod] Returning ${response.data.length} notices`)
      if (response.data.length > 0) {
        console.log(`[getDangerNoticesByPeriod] First notice date:`, response.data[0].recTime)
        console.log(`[getDangerNoticesByPeriod] Last notice date:`, response.data[response.data.length - 1].recTime)
      }
      return response.data
    }
  } catch (error) {
    console.error('Error fetching danger notices by period:', error)
    throw error
  }
}

/**
 * 새 알림 추가
 * @param {Object} noticeData - 알림 데이터
 * @param {string} noticeData.noticeContent - 알림 내용
 * @param {string} noticeData.noticeCategory - 알림 카테고리 (센서 타입)
 * @param {number} noticeData.farmNum - 농장 번호
 * @returns {Promise<boolean>} 성공 여부
 */
export const insertDangerNotice = async (noticeData) => {
  // 목업 데이터 모드
  if (USE_MOCK_DATA) {
    console.log('[MOCK MODE] Insert danger notice:', noticeData)
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true)
      }, 300)
    })
  }

  // 실제 API 호출
  try {
    const response = await api.post('/danger/insert', noticeData)

    if (response.data.success) {
      return true
    } else {
      throw new Error('Failed to insert danger notice')
    }
  } catch (error) {
    console.error('Error inserting danger notice:', error)
    throw error
  }
}

/**
 * 백엔드 데이터를 React Native 앱 형식으로 변환
 * @param {Object} backendNotice - 백엔드 알림 데이터
 * @returns {Object} 앱에서 사용할 알림 데이터
 */
export const transformNoticeToAlert = (backendNotice) => {
  // 센서 타입 매핑 (백엔드 카테고리 -> 앱 센서 타입)
  const sensorTypeMap = {
    '온도': 'temperature',
    '습도': 'humidity',
    '조도': 'light',
    '암모니아': 'ammonia',
    '이산화탄소': 'co2',
    '일산화탄소': 'co',
    '이산화질소': 'no2',
    'NH3': 'ammonia',
    'CO2': 'co2',
    'CO': 'co',
    'NO2': 'no2',
  }

  // 심각도 판단 (내용에서 추출하거나 기본값 사용)
  const determineSeverity = (content, category) => {
    const lowerContent = content.toLowerCase()
    if (lowerContent.includes('critical') || lowerContent.includes('위험') || lowerContent.includes('긴급')) {
      return 'Critical'
    } else if (lowerContent.includes('warning') || lowerContent.includes('경고') || lowerContent.includes('주의')) {
      return 'Warning'
    }
    // 기본값: 센서 타입에 따라 판단
    return 'Warning'
  }

  // 시간 차이 계산 (상대 시간)
  const getTimeAgo = (recTime) => {
    const now = new Date()
    const then = new Date(recTime)
    const diffMs = now - then
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return '1 min ago'
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hr ago`
    return `${diffDays} day ago`
  }

  // 정확한 시간 포맷 (YYYY-MM-DD HH:mm:ss)
  const getExactTime = (recTime) => {
    const date = new Date(recTime)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  const sensorType = sensorTypeMap[backendNotice.noticeCategory] || 'temperature'
  const severity = determineSeverity(backendNotice.noticeContent, backendNotice.noticeCategory)

  return {
    id: backendNotice.noticeNum,
    sensorType: sensorType,
    title: `${backendNotice.noticeCategory} Alert`,
    description: backendNotice.noticeContent,
    severity: severity,
    timeAgo: getTimeAgo(backendNotice.recTime),
    exactTime: getExactTime(backendNotice.recTime),
    timestamp: new Date(backendNotice.recTime),
  }
}

/**
 * 농장의 모든 알림을 조회하고 앱 형식으로 변환
 * @param {number} farmNum - 농장 번호
 * @returns {Promise<Array>} 변환된 알림 목록
 */
export const getAlertsForFarm = async (farmNum) => {
  try {
    const notices = await getDangerNotices(farmNum)
    return notices.map(transformNoticeToAlert)
  } catch (error) {
    console.error('Error getting alerts for farm:', error)
    return []
  }
}

/**
 * 기간별 농장 알림을 조회하고 앱 형식으로 변환 (신규)
 * @param {number} farmNum - 농장 번호
 * @param {string} period - 기간 ('day', 'week', 'month', 'all')
 * @returns {Promise<Array>} 변환된 알림 목록
 */
export const getAlertsByPeriod = async (farmNum, period) => {
  try {
    const notices = await getDangerNoticesByPeriod(farmNum, period)
    return notices.map(transformNoticeToAlert)
  } catch (error) {
    console.error('Error getting alerts by period:', error)
    return []
  }
}
