import axios from 'axios'
import { Image } from 'expo-image'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, View } from 'react-native'

const HomeScreen = () => {
  // 날씨 정보 api 키
  const api_key = "b1be2831111b47865f86a3c4b3798c3c"

  // 날씨 정보 
  const [weather, setWeather] = useState(null)

  // 실시간 환경 정보
  const [realtime, setRealtime] = useState(null)

  // 날씨 데이터 가져오기
  useEffect(() => {
    const getWeather = async () => {
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
        const response = await axios.get('http://192.168.30.240:5000/api/realtime')

        if (response.data.success) {
          setRealtime(response.data.data)  // 실제 데이터만 저장
        }
      } catch (error) {
        console.error('API 에러:', error.message)
      }
    }

    // 실행
    getRealtimeData()
    getWeather()
  }, [])

  console.log(weather)

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

  return (
    <View style={styles.container} >
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

      {/* 환경 데이터 박스들 */}
      <View style={styles.dataRow}>
        <View style={styles.dataBox}>
          <Text style={styles.dataTitle}>온도</Text>
          <Text style={styles.dataValue}>{realtime?.temperature || '-'}°C</Text>
        </View>

        <View style={styles.dataBox}>
          <Text style={styles.dataTitle}>습도</Text>
          <Text style={styles.dataValue}>{realtime?.humidity || '-'}%</Text>
        </View>
      </View>

      <View style={styles.dataRow}>
        <View style={styles.dataBox}>
          <Text style={styles.dataTitle}>CO2</Text>
          <Text style={styles.dataValue}>{realtime?.co2 || '-'}ppm</Text>
        </View>

        <View style={styles.dataBox}>
          <Text style={styles.dataTitle}>CO</Text>
          <Text style={styles.dataValue}>{realtime?.co || '-'}ppm</Text>
        </View>
      </View>

      <View style={styles.dataRow}>
        <View style={styles.dataBox}>
          <Text style={styles.dataTitle}>NH3</Text>
          <Text style={styles.dataValue}>{realtime?.nh3 || '-'}ppm</Text>
        </View>

        <View style={styles.dataBox}>
          <Text style={styles.dataTitle}>NO2</Text>
          <Text style={styles.dataValue}>{realtime?.no2 || '-'}ppm</Text>
        </View>
      </View>

      <View style={styles.dataRow}>
        <View style={styles.dataBox}>
          <Text style={styles.dataTitle}>조도</Text>
          <Text style={styles.dataValue}>{realtime?.lux || '-'} lux</Text>
        </View>

        <View style={styles.dataBox}>

        </View>
      </View>
    </View>
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
  }
})
