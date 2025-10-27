import api from './api'

/**
 * Push Token API Service
 * 백엔드에 푸시 토큰을 등록/업데이트하는 서비스
 */

/**
 * 푸시 토큰을 백엔드에 등록
 * @param {Object} tokenData - 토큰 데이터
 * @param {string} tokenData.expoPushToken - Expo 푸시 토큰
 * @param {number} tokenData.farmNum - 농장 번호
 * @param {string} tokenData.deviceId - 기기 고유 ID
 * @param {string} tokenData.platform - 플랫폼 ('ios' | 'android' | 'web')
 * @returns {Promise<boolean>} 성공 여부
 */
export const registerPushToken = async (tokenData) => {
  try {
    const response = await api.post('/push-token/register', tokenData)

    if (response.data.success) {
      return true
    } else {
      return false
    }
  } catch (error) {
    return false
  }
}

/**
 * 푸시 토큰 삭제 (로그아웃 시)
 * @param {string} expoPushToken - Expo 푸시 토큰
 * @returns {Promise<boolean>} 성공 여부
 */
export const removePushToken = async (expoPushToken) => {
  try {
    const response = await api.delete(`/push-token/remove/${encodeURIComponent(expoPushToken)}`)

    if (response.data.success) {
      return true
    } else {
      return false
    }
  } catch (error) {
    return false
  }
}

/**
 * 테스트 푸시 알림 전송 (개발용)
 * @param {string} expoPushToken - Expo 푸시 토큰
 * @param {Object} notification - 알림 데이터
 * @returns {Promise<boolean>} 성공 여부
 */
export const sendTestPushNotification = async (expoPushToken, notification) => {
  try {
    const response = await api.post('/push-token/test', {
      expoPushToken,
      title: notification.title || 'Test Notification',
      body: notification.body || 'This is a test push notification',
      data: notification.data || {},
    })

    if (response.data.success) {
      return true
    } else {
      return false
    }
  } catch (error) {
    return false
  }
}
