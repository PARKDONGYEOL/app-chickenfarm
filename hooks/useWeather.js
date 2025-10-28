import { useEffect, useState } from 'react'

const useWeather = (city = 'Seoul') => {
  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const API_KEY = 'YOUR_API_KEY' // openweathermap.org에서 발급

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        setLoading(true)
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${API_KEY}&lang=kr&units=metric`
        )
        const data = await response.json()
        
        if (response.ok) {
          setWeather({
            temp: Math.round(data.main.temp),
            description: data.weather[0].description,
            humidity: data.main.humidity,
            windSpeed: data.wind.speed,
            icon: data.weather[0].icon,
          })
        } else {
          setError(data.message)
        }
      } catch (err) {
        setError('날씨 정보를 가져올 수 없습니다')
      } finally {
        setLoading(false)
      }
    }

    fetchWeather()
  }, [city])

  return { weather, loading, error }
}

export default useWeather
