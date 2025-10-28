// 녹화 자동 갱신 타이머 전역 관리 (React Native 버전)
// 페이지 이동과 무관하게 계속 작동

import AsyncStorage from '@react-native-async-storage/async-storage'
import { getRecordingStatus, startRecording, stopRecording } from './coralApi'

const TIMER_STORAGE_KEY = 'next_record_renewal_time'
const DEFAULT_DURATION = 300000 // 5분 (300,000ms)

class RecordingTimer {
  constructor() {
    this.timerId = null
    this.isRunning = false
    this.duration = DEFAULT_DURATION
    this.onStatusChange = null // 콜백 함수
    this.onMessage = null // 메시지 콜백
  }

  // 타이머 시작
  start(duration = this.duration) {
    this.stop() // 기존 타이머 제거

    const nextRenewalTime = Date.now() + duration
    AsyncStorage.setItem(TIMER_STORAGE_KEY, nextRenewalTime.toString())
    this.isRunning = true

    this.timerId = setTimeout(async () => {
      await this.performRenewal()
    }, duration)
  }

  // 타이머 중지
  stop() {
    if (this.timerId) {
      clearTimeout(this.timerId)
      this.timerId = null
    }
    this.isRunning = false
    AsyncStorage.removeItem(TIMER_STORAGE_KEY)
  }

  // 갱신 수행 (예외 처리 강화)
  async performRenewal() {
    try {
      // 1️⃣ 현재 상태 확인
      const statusData = await getRecordingStatus()

      // 응답 검증
      if (!statusData || typeof statusData.is_recording === 'undefined') {
        this.stop()
        if (this.onStatusChange) this.onStatusChange(false)
        return
      }

      if (!statusData.is_recording) {
        this.stop()
        if (this.onStatusChange) this.onStatusChange(false)
        return
      }

      // 2️⃣ 녹화 중지
      const stopRes = await stopRecording()
      if (!stopRes || stopRes.status !== 'success') {
        throw new Error('녹화 중지 실패')
      }

      // 3️⃣ 중지 완료 확인 (최대 5초 대기)
      let stopped = false
      for (let i = 0; i < 10; i++) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const checkRes = await getRecordingStatus()

        // 응답 검증
        if (checkRes && typeof checkRes.is_recording !== 'undefined') {
          if (!checkRes.is_recording) {
            stopped = true
            break
          }
        }
      }

      if (!stopped) {
        throw new Error('녹화 중지 확인 실패')
      }

      // 4️⃣ 녹화 재시작
      const startRes = await startRecording()
      if (startRes && startRes.status === 'success') {
        if (this.onMessage) {
          this.onMessage(`녹화 갱신 완료: ${this.duration / 60000}분 주기로 재시작.`)
        }
        this.start(this.duration) // 재귀 호출
      } else {
        throw new Error('녹화 재시작 실패')
      }

    } catch (err) {
      // 에러를 조용히 처리
      this.stop()
      if (this.onStatusChange) this.onStatusChange(false)
    }
  }

  // 페이지 복귀 시 타이머 복원 (예외 처리 강화)
  async restore() {
    try {
      const statusData = await getRecordingStatus()

      // 응답 검증
      if (!statusData || typeof statusData.is_recording === 'undefined') {
        this.stop()
        return false
      }

      const isRecording = statusData.is_recording

      if (!isRecording) {
        this.stop()
        return false
      }

      const savedTime = await AsyncStorage.getItem(TIMER_STORAGE_KEY)
      if (savedTime) {
        const nextRenewalTime = parseInt(savedTime, 10)
        const now = Date.now()
        const remainingTime = nextRenewalTime - now

        if (remainingTime <= 0) {
          this.start(100) // 100ms 후 실행
        } else {
          this.start(remainingTime)
        }
      } else {
        this.start(this.duration)
      }

      return true
    } catch (err) {
      // 에러를 조용히 처리
      this.stop()
      return false
    }
  }

  // 상태 확인
  async getStatus() {
    const nextRenewalTime = await AsyncStorage.getItem(TIMER_STORAGE_KEY)
    return {
      isRunning: this.isRunning,
      timerId: this.timerId,
      nextRenewalTime
    }
  }

  // 기존 메서드들 (호환성 유지)
  getElapsedTime() {
    return 0
  }

  getFormattedTime() {
    return '00:00:00'
  }

  reset() {
    this.stop()
  }

  getState() {
    return {
      isRecording: this.isRunning,
      startTime: null
    }
  }
}

// 싱글톤 인스턴스
const recordingTimer = new RecordingTimer()

export default recordingTimer
