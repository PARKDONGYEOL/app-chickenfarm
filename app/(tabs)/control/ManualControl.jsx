import axios from 'axios';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { 
  ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View 
} from 'react-native';
import Octicons from '@expo/vector-icons/Octicons';


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

  // 개별 로딩
  const [isLoading, setIsLoading] = useState({
    door: false,
    humPen: false,
    airPen: false,
    led: false
  });

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // 진행 중인 요청 개수
  const activeRequestsRef = useRef(0);

  // 재시도 함수
  const retryRequest = async (retry, maxRetries = 10) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await retry();
        return { success: true, data: result };
      } catch(e) {
        if (i < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
    return { success: false };
  }
  
  // 센서 데이터
  const getSensorData = async () => {
    const result = await retryRequest(() => 
      axios.get('http://192.168.30.240:5000/api/realtime', {
        timeout: 5000
      })
    );

    if (result.success) {
      const data = result.data.data.data;
      setSensorData({
        temperature: data.temperature,
        humidity: data.humidity,
        lux: data.lux,
        co2: data.co2
      });
      return true;
    }
    return false;
  }
  
  // 모드 상태
  const getControlStatus = async () => {
    const result = await retryRequest(() =>
      axios.get('http://192.168.30.240:5000/api/status', {
        timeout: 5000
      })
    );

    if (result.success && result.data.data.modes) {
      setControlMode(result.data.data.modes);
      return true;
    }
    return false;
  }

  // 초기 데이터 로드
  const loadInitialData = async () => {
    setIsInitialLoading(true);
    setLoadError(false);
    
    const sensorSuccess = await getSensorData();
    const statusSuccess = await getControlStatus();
    
    if (!sensorSuccess || !statusSuccess) {
      setLoadError(true);
    }
    
    setIsInitialLoading(false);
  }
  
  // 모드 토글
  const toggleMode = async (device) => {
    // 이미 이 기기 처리 중이면 무시
    if (isLoading[device]) {
      return;
    }

    // 동시 요청 2개 이상이면 차단
    if (activeRequestsRef.current >= 2) {
      Alert.alert('알림', '잠시만 기다려주세요!');
      return;
    }
    
    const currentMode = controlMode[device];
    const newMode = currentMode === 'auto' ? 'manual' : 'auto';
    
    // 로딩 시작
    setIsLoading(prev => ({ ...prev, [device]: true }));
    activeRequestsRef.current += 1;
    
    // 재시도하면서 요청
    const result = await retryRequest(() =>
      axios.post('http://192.168.30.240:5000/api/control', {
        device: device,
        mode: newMode
      }, {
        timeout: 5000
      })
    );

    if (result.success) {
      setControlMode(prev => ({
        ...prev,
        [device]: newMode
      }));
    } else {
      Alert.alert('오류', '모드 전환에 실패했습니다.');
    }
    
    // 로딩 끝
    setIsLoading(prev => ({ ...prev, [device]: false }));
    activeRequestsRef.current -= 1;
  }
  
  // 수동 제어 - ON
  const turnOn = async (device) => {
    try {
      await axios.post('http://192.168.30.240:5000/api/control', {
        device: device,
        state: true
      }, {
        timeout: 5000
      });
    } catch(e) {
    }
  }
  
  // 수동 제어 - OFF
  const turnOff = async (device) => {
    try {
      await axios.post('http://192.168.30.240:5000/api/control', {
        device: device,
        state: false
      }, {
        timeout: 5000
      });
    } catch(e) {
    }
  }

  // 새로고침
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await getSensorData();
    setRefreshing(false);
  }, [])

  // 처음 진입
  useEffect(() => {
    loadInitialData();
  }, [])

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync("loginInfo")
    router.replace("/authorization/signin")
  }

  // 초기 로딩 화면
  if (isInitialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>데이터를 불러오는 중...</Text>
      </View>
    );
  }

  // 에러 화면
  if (loadError) {
    return (
      <View style={styles.errorContainer}>
        <Octicons name="alert-fill" size={40} color="#ffc219ff" />
        <Text style={styles.errorTitle}>네트워크 오류</Text>
        <Text style={styles.errorText}>설정을 불러올 수 없습니다</Text>
        
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadInitialData}
        >
          <Text style={styles.retryButtonText}>다시 시도하기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
    <View style={styles.pageHeader}> 
      <Text style={styles.headerTitle}>수동 제어</Text>
      <TouchableOpacity onPress={handleLogout}>
        <Text style={styles.logoutText}>로그아웃</Text>
      </TouchableOpacity>
    </View>
   
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
            
            {isLoading.door ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : (
              <Switch 
                trackColor={{false: '#ff9800', true: '#4CAF50'}}
                thumbColor='#fff'
                value={controlMode.door === 'auto'}
                onValueChange={() => toggleMode('door')}
              />
            )}
            
            <Text style={[styles.modeText, controlMode.door === 'auto' && styles.activeText]}>
              자동
            </Text>
          </View>
        </View>
        
        {controlMode.door === 'manual' && !isLoading.door && (
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
            
            {isLoading.humPen ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : (
              <Switch 
                trackColor={{false: '#ff9800', true: '#4CAF50'}}
                thumbColor='#fff'
                value={controlMode.humPen === 'auto'}
                onValueChange={() => toggleMode('humPen')}
              />
            )}
            
            <Text style={[styles.modeText, controlMode.humPen === 'auto' && styles.activeText]}>
              자동
            </Text>
          </View>
        </View>
        
        {controlMode.humPen === 'manual' && !isLoading.humPen && (
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
            
            {isLoading.airPen ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : (
              <Switch 
                trackColor={{false: '#ff9800', true: '#4CAF50'}}
                thumbColor='#fff'
                value={controlMode.airPen === 'auto'}
                onValueChange={() => toggleMode('airPen')}
              />
            )}
            
            <Text style={[styles.modeText, controlMode.airPen === 'auto' && styles.activeText]}>
              자동
            </Text>
          </View>
        </View>
        
        {controlMode.airPen === 'manual' && !isLoading.airPen && (
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
            
            {isLoading.led ? (
              <ActivityIndicator size="small" color="#4CAF50" />
            ) : (
              <Switch 
                trackColor={{false: '#ff9800', true: '#4CAF50'}}
                thumbColor='#fff'
                value={controlMode.led === 'auto'}
                onValueChange={() => toggleMode('led')}
              />
            )}
            
            <Text style={[styles.modeText, controlMode.led === 'auto' && styles.activeText]}>
              자동
            </Text>
          </View>
        </View>
        
        {controlMode.led === 'manual' && !isLoading.led && (
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


       <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => router.push('/control/AutoControl')}
        >
        <Text>자동 제어 설정</Text>
      </TouchableOpacity>
   
    </ScrollView>
  </View>
  )
}

export default ManualControl

const styles = StyleSheet.create({
    wrapper: {
    flex: 1,
    backgroundColor: '#fff',
  },
  pageHeader: { 
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
  },
  logoutText: {
    color: '#007AFF',
    fontSize: 16,
  },
  container: {
    backgroundColor: '#fff',
    padding: 15
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff'
  },
  loadingText: {
    marginTop: 15,
    fontSize: 16,
    color: '#666'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 40
  },
  errorIcon: {
    width: 80,
    height: 80,
    backgroundColor: '#FFD700',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24
  },
  errorIconText: {
    fontSize: 48,
    color: '#fff'
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 32
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 8,
    minWidth: 200,
    alignItems: 'center'
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
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
    backgroundColor: '#dddddd',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom : 70,
    alignItems : 'center'
  }
})