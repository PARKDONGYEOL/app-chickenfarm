import axios from 'axios'
import { Image } from 'expo-image'
import { useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { CircularProgress } from 'react-native-circular-progress'

const HomeScreen = () => {
  // router
  const router = useRouter()
  // 날씨 정보 api 키
  const api_key = "b1be2831111b47865f86a3c4b3798c3c"

  // 날씨 정보 
  const [weather, setWeather] = useState(null)

  // 실시간 환경 정보
  const [realtime, setRealtime] = useState(null)
  
  // 통신 오류 상태
  const [connectionError, setConnectionError] = useState(false)

  // 날씨 데이터 가져오기
  useEffect(() => {
    const getWeather = async () => {
      // 날씨 정보
      const response = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
        params: {
          q: "Ulsan",
          appid: api_key,
          lang: "kr",
          units: "metric"
        }
      })
        .then((resp) => setWeather(resp.data))
    }

    // 실시간 환경 정보
    const getRealtimeData = async () => {
      try {
        const response = await axios.get('http://10.0.2.2:5000/api/realtime', {
          timeout: 3000
        })

        if (response.data.success) {
          setRealtime(response.data.data)
          setConnectionError(false) // 통신 성공
        }
      } catch (error) {
        // 에러는 UI로만 표시 (콘솔 로그 제거)
        setConnectionError(true) // 통신 실패
      }
    }

    // 첫 실행
    getRealtimeData()
    getWeather()

    // 실시간 업데이트 (5초마다로 변경 - 더 안정적)
    const realtimeInterval = setInterval(getRealtimeData, 3000)

    // 날씨는 10분마다 업데이트
    const weatherInterval = setInterval(getWeather, 600000)

    // 클린업
    return () => {
      clearInterval(realtimeInterval)
      clearInterval(weatherInterval)
    }
  }, [])

  // 날씨에 따른 배경
  const getBackground = (icon) => {
    if (!icon) return '#87CEEB'

    const code = icon.slice(0, 2)  // '01d' -> '01'
    const isDay = icon.endsWith('d')

    const backgrounds = {
      '01': isDay ? '#FFD700' : '#1a1a2e',  // 맑음
      '02': isDay ? '#87CEEB' : '#2c3e50',  // 구름 조금
      '03': '#B0C4DE',  // 구름 많음
      '04': '#778899',  // 흐림
      '09': '#4682B4',  // 소나기
      '10': '#4682B4',  // 비
      '11': '#2F4F4F',  // 천둥
      '13': '#F0F8FF',  // 눈
      '50': '#D3D3D3',  // 안개
    }

    return backgrounds[code] || '#87CEEB'
  }

  const getColor = (value, optimalMin, optimalMax, warningMin, warningMax) => {
    // 적정 범위
    if (value >= optimalMin && value <= optimalMax) {
      return '#22c55e'  // 초록색
    }

    // 보통 범위
    if (value >= warningMin && value <= warningMax) {
      return '#f59e0b'  // 주황색
    }

    // 위험
    return '#ef4444'  // 빨간색
  }

  // 환경 점수 계산 (0-100점)
  const calculateEnvScore = () => {
    if (!realtime) return 0

    let score = 100

    const temp = realtime.temperature || 0
    if (temp < 15 || temp > 25) {
      score -= Math.abs(temp < 15 ? 15 - temp : temp - 25) * 2
    }

    const humidity = realtime.humidity || 0
    if (humidity < 40 || humidity > 60) {
      score -= Math.abs(humidity < 40 ? 40 - humidity : humidity - 60) * 1.5
    }

    const co2 = realtime.co2 || 0
    if (co2 > 800) {
      score -= (co2 - 800) / 20
    }

    const co = realtime.co || 0
    if (co > 10) {
      score -= (co - 10) * 2
    }

    const nh3 = realtime.nh3 || 0
    if (nh3 > 15) {
      score -= (nh3 - 15) * 2
    }

    const no2 = realtime.no2 || 0
    if (no2 > 20) {
      score -= (no2 - 20) * 1.5
    }

    const lux = realtime.lux || 0
    if (lux < 300 || lux > 800) {
      score -= Math.abs(lux < 300 ? 300 - lux : lux - 800) / 10
    }

    return Math.max(0, Math.min(100, Math.round(score)))
  }

  // 점수에 따른 등급
  const getScoreGrade = (score) => {
    if (score >= 90) return { grade: '최고', color: '#22c55e', emoji: '😊' }
    if (score >= 70) return { grade: '좋음', color: '#3b82f6', emoji: '🙂' }
    if (score >= 50) return { grade: '보통', color: '#f59e0b', emoji: '😐' }
    if (score >= 30) return { grade: '나쁨', color: '#ef4444', emoji: '😟' }
    return { grade: '매우나쁨', color: '#991b1b', emoji: '😰' }
  }

  return (
    <ScrollView style={styles.container}>
      <View
        style={[
          styles.weatherContainer,
          { backgroundColor: getBackground(weather?.weather?.[0]?.icon) }
        ]}>

        <Image
          source={{
            uri: `https://openweathermap.org/img/wn/${weather?.weather[0]?.icon}@2x.png`
          }}
          style={{ width: 80, height: 90 }}
        />

        <Text style={styles.temp}>{Math.round(weather?.main?.temp)}</Text>
        <Text style={styles.tempFormat}>°C</Text>
        <View style={styles.elseContainer}>
          <Text style={styles.else}>풍속: {weather?.wind?.speed} m/s</Text>
          <Text style={styles.else}>습도: {weather?.main?.humidity}%</Text>
          <Text style={styles.else}>체감: {Math.round(weather?.main?.feels_like)}°C</Text>
        </View>
        <Text style={styles.description}>{weather?.weather?.[0]?.description}</Text>
      </View>

      {/* 통신 오류 메시지 */}
      {connectionError && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>⚠️ 실시간 데이터 통신 오류</Text>
          <Text style={styles.errorSubText}>서버 연결을 확인해주세요</Text>
        </View>
      )}

      {/* 환경 데이터 박스들 */}
      <View style={styles.dataRow}>
        <View style={styles.dataBox}>
          <Text style={styles.dataTitle}>온도</Text>
          <View style={styles.gaugeContainer}>
            <CircularProgress
              size={120}
              width={15}
              fill={(realtime?.temperature / 50) * 100}
              rotation={-90}
              arcSweepAngle={180}
              tintColor={getColor(realtime?.temperature, 15, 25, 10, 30)}
              backgroundColor="#e5e7eb"
              lineCap="round"
            >
              {() => (
                <Text style={styles.dataValue}>{realtime?.temperature || '-'}°C</Text>
              )}
            </CircularProgress>
          </View>
        </View>

        <View style={styles.dataBox}>
          <Text style={styles.dataTitle}>습도</Text>
          <View style={styles.gaugeContainer}>
            <CircularProgress
              size={120}
              width={15}
              fill={realtime?.humidity || 0}
              rotation={-90}
              arcSweepAngle={180}
              tintColor={getColor(realtime?.humidity, 40, 60, 30, 70)}
              backgroundColor="#e5e7eb"
              lineCap="round"
            >
              {() => (
                <Text style={styles.dataValue}>{realtime?.humidity || '-'}%</Text>
              )}
            </CircularProgress>
          </View>
        </View>
      </View>

      <View style={styles.dataRow}>
        <View style={styles.dataBox}>
          <Text style={styles.dataTitle}>CO2</Text>
          <View style={styles.gaugeContainer}>
            <CircularProgress
              size={120}
              width={15}
              fill={(realtime?.co2 / 2000) * 100}
              rotation={-90}
              arcSweepAngle={180}
              tintColor={getColor(realtime?.co2, 0, 800, 0, 1200)}
              backgroundColor="#e5e7eb"
              lineCap="round"
            >
              {() => (
                <Text style={styles.dataValue}>{Math.round(realtime?.co2 || 0)}</Text>
              )}
            </CircularProgress>
          </View>
        </View>

        <View style={styles.dataBox}>
          <Text style={styles.dataTitle}>CO</Text>
          <View style={styles.gaugeContainer}>
            <CircularProgress
              size={120}
              width={15}
              fill={(realtime?.co / 100) * 100}
              rotation={-90}
              arcSweepAngle={180}
              tintColor={getColor(realtime?.co, 0, 10, 0, 30)}
              backgroundColor="#e5e7eb"
              lineCap="round"
            >
              {() => (
                <Text style={styles.dataValue}>{realtime?.co?.toFixed(1) || '-'}</Text>
              )}
            </CircularProgress>
          </View>
        </View>
      </View>

      <View style={styles.dataRow}>
        <View style={styles.dataBox}>
          <Text style={styles.dataTitle}>NH3</Text>
          <View style={styles.gaugeContainer}>
            <CircularProgress
              size={120}
              width={15}
              fill={(realtime?.nh3 / 50) * 100}
              rotation={-90}
              arcSweepAngle={180}
              tintColor={getColor(realtime?.nh3, 0, 15, 0, 25)}
              backgroundColor="#e5e7eb"
              lineCap="round"
            >
              {() => (
                <Text style={styles.dataValue}>{realtime?.nh3?.toFixed(1) || '-'}</Text>
              )}
            </CircularProgress>
          </View>
        </View>

        <View style={styles.dataBox}>
          <Text style={styles.dataTitle}>NO2</Text>
          <View style={styles.gaugeContainer}>
            <CircularProgress
              size={120}
              width={15}
              fill={(realtime?.no2 / 100) * 100}
              rotation={-90}
              arcSweepAngle={180}
              tintColor={getColor(realtime?.no2, 0, 20, 0, 40)}
              backgroundColor="#e5e7eb"
              lineCap="round"
            >
              {() => (
                <Text style={styles.dataValue}>{realtime?.no2?.toFixed(1) || '-'}</Text>
              )}
            </CircularProgress>
          </View>
        </View>
      </View>

      <View style={styles.dataRow}>
        <View style={styles.dataBox}>
          <Text style={styles.dataTitle}>조도</Text>
          <View style={styles.gaugeContainer}>
            <CircularProgress
              size={120}
              width={15}
              fill={(realtime?.lux / 1000) * 100}
              rotation={-90}
              arcSweepAngle={180}
              tintColor={getColor(realtime?.lux, 300, 800, 200, 1000)}
              backgroundColor="#e5e7eb"
              lineCap="round"
            >
              {() => (
                <Text style={styles.dataValue}>{realtime?.lux || '-'} lux</Text>
              )}
            </CircularProgress>
          </View>
        </View>

        <View style={styles.dataBox}>
          <Text style={styles.dataTitle}>환경 점수</Text>
          <View style={styles.gaugeContainer}>
            <CircularProgress
              size={120}
              width={15}
              fill={Math.max(0.1, calculateEnvScore())}
              rotation={-90}
              arcSweepAngle={180}
              tintColor={getScoreGrade(calculateEnvScore()).color}
              backgroundColor="#e5e7eb"
              lineCap="round"
            >
              {() => {
                const score = calculateEnvScore()
                const { grade, emoji } = getScoreGrade(score)
                return (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 24, fontWeight: 'bold' }}>{score}</Text>
                    <Text style={{ fontSize: 12, color: '#666' }}>{grade}</Text>
                  </View>
                )
              }}
            </CircularProgress>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

export default HomeScreen

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  weatherContainer: {
    borderWidth: 1,
    borderColor: "gray",
    margin: 15,
    borderRadius: 15,
    flexDirection: "row",
    alignItems: "center"
  },
  temp: {
    color: "white",
    fontSize: 45
  },
  tempFormat: {
    fontSize: 30,
    color: "white",
    marginBottom: 16
  },
  description: {
    marginLeft: 15,
    color: 'white',
    fontSize: 40,
    fontWeight: '600'
  },
  else: {
    color: "white",
    fontSize: 11,
  },
  elseContainer: {
    marginLeft: 10
  },
  errorContainer: {
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 10,
    padding: 15,
    margin: 15,
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
  },
  errorText: {
    color: '#dc2626',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  errorSubText: {
    color: '#991b1b',
    fontSize: 14,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  dataBox: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 15,
    padding: 15,
    paddingBottom: 0,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  dataTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  dataValue: {
    fontSize: 18,
    color: '#666',
    marginVertical: 3,
  },
  value_header: {
    flexDirection: "row"
  },
  gaugeContainer: {
    alignItems: 'center',
    marginBottom: -28,
  }
})
