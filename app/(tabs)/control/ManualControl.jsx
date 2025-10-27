import axios from 'axios';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import Button from '../../../components/Button';


const ManualControl = () => {
  const router = useRouter();

  const [controlMode, setControlMode] = useState({
    door: 'auto',
    humPen: 'auto',
    airPen: 'auto',
    led: 'auto'
  });

  const [refreshing, setRefreshing] = useState(false);

  const [sensorData, setSensorData] = useState({
    temperature: '-',
    humidity: '-',
    lux: '-',
    co2 : '-'
  });
  
  // 모드 토글 (자동 ↔ 수동)
  const toggleMode = async (device) => {
    const currentMode = controlMode[device];
    const newMode = currentMode === 'auto' ? 'manual' : 'auto';
    
    console.log('device:', device);
    console.log('현재 모드:', currentMode, '→ 새 모드:', newMode);
    
    try {
      // 서버에 모드 변경 요청
      await axios.post('http://192.168.30.240:5000/api/control', {
        device: device,
        mode: newMode
      }, {
        timeout: 10000
      });
      
      // 화면 업데이트
      setControlMode(prev => ({
        ...prev,
        [device]: newMode
      }));
      
      console.log(`${device} ${newMode} 모드로 전환 완료`);
      
      // 자동 모드로 전환 시 상태 새로고침
      if (newMode === 'auto') {
        await getEnv();
      }
      
    } catch(e) {
      console.log('모드 전환 에러:', e);
      Alert.alert('모드 전환 실패', '모드 전환에 실패했습니다.');
    }
  }
  
  // 수동 제어 - ON 버튼
  const turnOn = async (device) => {
    console.log(`${device} ON 버튼 클릭`);
    
    try {
      await axios.post('http://192.168.30.240:5000/api/control', {
        device: device,
        state: true
      }, {
        timeout: 10000
      });
      
      console.log(`${device} ON 성공`);
      
      // 상태 새로고침
      await getEnv();
      
    } catch(e) {
      console.log('제어 에러:', e);
      Alert.alert('제어 실패', '기기 제어에 실패했습니다.');  //나중에 시연 영상 찍을 때는 이거 없애고
    }
  }
  
  // 수동 제어 - OFF 버튼
  const turnOff = async (device) => {
    console.log(`${device} OFF 버튼 클릭`);
    
    try {
      await axios.post('http://192.168.30.240:5000/api/control', {
        device: device,
        state: false
      }, {
        timeout: 10000
      });
      
      console.log(`${device} OFF 성공`);
      
      // 상태 새로고침
      await getEnv();
      
    } catch(e) {
      console.log('제어 에러:', e);
      Alert.alert('제어 실패', '기기 제어에 실패했습니다.');  //나중에 시연 영상 찍을 때는 이거 없애고 
    }
  }

  // 센서 데이터 및 상태 가져오기
  const getEnv = async () => {
    try {
      const res = await axios.get('http://192.168.30.240:5000/api/realtime');
      const data = res.data.data;
      setSensorData({
        temperature: data.temperature,
        humidity: data.humidity,
        lux: data.lux,
        co2: data.co2
      });

      const statusRes = await axios.get('http://192.168.30.240:5000/api/status', {
        timeout: 5000
      });

      if (statusRes.data && statusRes.data.modes) {
        setControlMode(statusRes.data.modes);
        console.log('현재 모드:', statusRes.data.modes);
      }
    } catch(e) {
      console.log('데이터 가져오기 에러:', e);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await getEnv();
    setRefreshing(false);
  }, [])

  useEffect(() => {
    getEnv();
  }, [])

  return (
    <ScrollView
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh}
        />
      }
      style={styles.container}
    >
      {/* 온도 - 문 제어 */}
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.label}>온도</Text>
          <Text style={styles.value}>{sensorData.temperature}°C</Text>
        </View>
        
        <View style={styles.modeRow}>
          <Text style={styles.modeLabel}>모드</Text>
          <View style={styles.modeSwitch}>
            <Text style={[styles.modeText, controlMode.door === 'manual' && styles.activeText]}>
              수동
            </Text>
            <Switch 
              trackColor={{false: '#ff9800', true: '#4CAF50'}}
              thumbColor='#fff'
              value={controlMode.door === 'auto'}
              onValueChange={() => toggleMode('door')}
            />
            <Text style={[styles.modeText, controlMode.door === 'auto' && styles.activeText]}>
              자동
            </Text>
          </View>
        </View>
        
        {controlMode.door === 'manual' && (
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>문 제어</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity 
                style={styles.onButton}
                onPress={() => turnOn('door')}
              >
                <Text style={styles.buttonText}>열기</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.offButton}
                onPress={() => turnOff('door')}
              >
                <Text style={styles.buttonText}>닫기</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* 습도 - 팬 가동 */}
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.label}>습도</Text>
          <Text style={styles.value}>{sensorData.humidity}%</Text>
        </View>
        
        <View style={styles.modeRow}>
          <Text style={styles.modeLabel}>모드</Text>
          <View style={styles.modeSwitch}>
            <Text style={[styles.modeText, controlMode.humPen === 'manual' && styles.activeText]}>
              수동
            </Text>
            <Switch 
              trackColor={{false: '#ff9800', true: '#4CAF50'}}
              thumbColor='#fff'
              value={controlMode.humPen === 'auto'}
              onValueChange={() => toggleMode('humPen')}
            />
            <Text style={[styles.modeText, controlMode.humPen === 'auto' && styles.activeText]}>
              자동
            </Text>
          </View>
        </View>
        
        {controlMode.humPen === 'manual' && (
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>팬 가동</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity 
                style={styles.onButton}
                onPress={() => turnOff('humPen')}
              >
                <Text style={styles.buttonText}>ON</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.offButton}
                onPress={() => turnOn('humPen')}
              >
                <Text style={styles.buttonText}>OFF</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* CO2 - 팬 가동 */}
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.label}>CO2</Text>
          <Text style={styles.value}>{sensorData.co2} ppm</Text>
        </View>
        
        <View style={styles.modeRow}>
          <Text style={styles.modeLabel}>모드</Text>
          <View style={styles.modeSwitch}>
            <Text style={[styles.modeText, controlMode.airPen === 'manual' && styles.activeText]}>
              수동
            </Text>
            <Switch 
              trackColor={{false: '#ff9800', true: '#4CAF50'}}
              thumbColor='#fff'
              value={controlMode.airPen === 'auto'}
              onValueChange={() => toggleMode('airPen')}
            />
            <Text style={[styles.modeText, controlMode.airPen === 'auto' && styles.activeText]}>
              자동
            </Text>
          </View>
        </View>
        
        {controlMode.airPen === 'manual' && (
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>팬 가동</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity 
                style={styles.onButton}
                onPress={() => turnOff('airPen')}
              >
                <Text style={styles.buttonText}>ON</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.offButton}
                onPress={() => turnOn('airPen')}
              >
                <Text style={styles.buttonText}>OFF</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* 조도 - 조명 */}
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.label}>조도</Text>
          <Text style={styles.value}>{sensorData.lux} lux</Text>
        </View>
        
        <View style={styles.modeRow}>
          <Text style={styles.modeLabel}>모드</Text>
          <View style={styles.modeSwitch}>
            <Text style={[styles.modeText, controlMode.led === 'manual' && styles.activeText]}>
              수동
            </Text>
            <Switch 
              trackColor={{false: '#ff9800', true: '#4CAF50'}}
              thumbColor='#fff'
              value={controlMode.led === 'auto'}
              onValueChange={() => toggleMode('led')}
            />
            <Text style={[styles.modeText, controlMode.led === 'auto' && styles.activeText]}>
              자동
            </Text>
          </View>
        </View>
        
        {controlMode.led === 'manual' && (
          <View style={styles.controlRow}>
            <Text style={styles.controlLabel}>조명</Text>
            <View style={styles.buttonGroup}>
              <TouchableOpacity 
                style={styles.onButton}
                onPress={() => turnOn('led')}
              >
                <Text style={styles.buttonText}>ON</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.offButton}
                onPress={() => turnOff('led')}
              >
                <Text style={styles.buttonText}>OFF</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <Button 
        title='자동 제어 설정' 
        onPress={() => router.push('/control/AutoControl')}
        style={styles.settingsButton}
      />
    </ScrollView>
  )
}

export default ManualControl

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15
  },
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 20,
    marginBottom: 15
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333'
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e6df5'
  },
  modeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  modeLabel: {
    fontSize: 16,
    color: '#666'
  },
  modeSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  modeText: {
    fontSize: 14,
    color: '#999'
  },
  activeText: {
    color: '#333',
    fontWeight: '600'
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0'
  },
  controlLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500'
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 10
  },
  onButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center'
  },
  offButton: {
    backgroundColor: '#f44336',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center'
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600'
  },
  settingsButton: {
    marginTop: 10,
    marginBottom: 30
  }
})