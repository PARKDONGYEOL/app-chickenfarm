import axios from 'axios';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import Button from '../../../components/Button';


const ManualControl = () => {
  const router = useRouter();

  const [isEnabled, setIsEnabled] = useState({
    door : false,
    humPen : false,
    airPen : false,
    led : false
  });

  const [sensorData, setSensorData] = useState({
    temperature: '-',
    humidity: '-',
    lux: '-',
    co2 : '-'
  });
  
  const toggleSwitch = (device) => {
    setIsEnabled(prev => ({
      ...prev,
      [device] : !prev[device]
    }))
  }

  useEffect(() => {
    const getEnv = async () => {
      try{
        const res = await axios.get('http://192.168.30.240:5000/api/realtime');
        const data = res.data.data;
        setSensorData({
          temperature : data.temperature,
          humidity : data.humidity,
          lux : data.lux,
          co2 : data.co2
        })
      }catch(e){
        console.log(e);
      }
    }
    getEnv();
    const timer = setInterval(getEnv, 10000);
    return () => clearInterval(timer);
  }, [])

  return (
    <View>
      <View style={styles.control}>
        <View style={styles.manual}>
          <Text>온도</Text>
          <Text>{sensorData.temperature}</Text>
          <Text>문 제어</Text>
          <Switch 
            trackColor={{false : '#b9b8b9ff', true : '#87b3ffff'}}
            thumbColor={isEnabled.door ? '#1e6df5ff' : '#767577'}
            onValueChange={() => toggleSwitch('door')}
            value={isEnabled.door}
          />
        </View>
        <Button 
          title='자동'
        />
      </View>
      <View style={styles.control}>
        <View style={styles.manual}>
          <Text>습도</Text>
          <Text>{sensorData.humidity}</Text>
          <Text>팬 가동</Text>
          <Switch 
            trackColor={{false : '#b9b8b9ff', true : '#87b3ffff'}}
            thumbColor={isEnabled.humPen ? '#1e6df5ff' : '#767577'}
            onValueChange={() => toggleSwitch('humPen')}
            value={isEnabled.humPen}
          />
        </View>
        <Button 
          title='자동'
        />
      </View>
      <View style={styles.control}>
        <View style={styles.manual}>
          <Text>CO2</Text>
          <Text>{sensorData.co2}</Text>
          <Text>팬 가동</Text>
          <Switch 
            trackColor={{false : '#b9b8b9ff', true : '#87b3ffff'}}
            thumbColor={isEnabled.airPen ? '#1e6df5ff' : '#767577'}
            onValueChange={() => toggleSwitch('airPen')}
            value={isEnabled.airPen}
          />
        </View>
        <Button 
          title='자동'
        />
      </View>
      <View style={styles.control}>
        <View style={styles.manual}>
          <Text>조도</Text>
          <Text>{sensorData.lux}</Text>
          <Text>조명</Text>
          <Switch 
            trackColor={{false : '#b9b8b9ff', true : '#87b3ffff'}}
            thumbColor={isEnabled.led ? '#1e6df5ff' : '#767577'}
            onValueChange={() => toggleSwitch('led')}
            value={isEnabled.led}
          />
        </View>
        <Button 
          title='자동'
        />
      </View>
      <Button title='자동 제어 설정' onPress={() => router.push('/control/AutoControl')}/>

    </View>
  )
}

export default ManualControl

const styles = StyleSheet.create({
  control : {
    flexDirection : 'row',
    gap : 10,
    justifyContent : 'space-around',
    alignItems : 'center',
    marginVertical : 20
  },
  manual : {
    flexDirection : 'row',
    alignItems : 'center',
    gap : 30
  }
})