import axios from 'axios';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Octicons from '@expo/vector-icons/Octicons';

const AutoControl = () => {
  //기본 세팅값
  const DEFAULT_SETTINGS = {
    doorOpenTemp: 28,
    doorCloseTemp: 24,
    fanHumidityThreshold: 70,
    fanCO2Threshold: 1000
  };

  const router = useRouter();
  
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);

  //저장중 로딩 상태
  const [loading, setLoading] = useState(false);
  
  //전체 로딩 화면(로딩중..)
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // 재시도 함수(1초 간격 10번 시도)
  const retryRequest = async (whatToRetry, maxRetries = 10) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await whatToRetry();
        return { success: true, data: result };
      } catch(e) {
        if (i < maxRetries - 1) {
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    }
    return { success: false };
  }

  // 설정 불러오기
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsInitialLoading(true);
    setLoadError(false); //이전 에러 화면 초기화
    
    const result = await retryRequest(() =>
      axios.get('http://192.168.30.240:5000/api/settings/simple', {
        timeout: 5000
      })
    );

    if (result.success) {
      const data = result.data.data.data;
      if (data) {
        setSettings(data);
        setLoadError(false);
      }
    } else {
      setLoadError(true);
    }
    
    setIsInitialLoading(false);
  };

  // 설정 저장
  const handleSave = async () => {
    setLoading(true);
    
    // 1. 설정 저장
    const saveResult = await retryRequest(() =>
      axios.post(
        'http://192.168.30.240:5000/api/settings/update',
        settings,
        { timeout: 5000 }
      )
    );
    
    if (!saveResult.success) {
      Alert.alert('오류', '설정 저장에 실패했습니다.');
      setLoading(false);
      return;
    }
    
    // 2. 라즈베리파이에 적용
    const applyResult = await retryRequest(() =>
      axios.post(
        'http://192.168.30.240:5000/api/settings/apply',
        {}, //파이썬에서 최신 디비 읽어서 적용하기 때문에 값 보낼 필요 없음
        { timeout: 5000 }
      )
    );
    
    if (applyResult.success) {
      Alert.alert('저장 완료', '설정이 저장되었습니다.');
    } else {
      Alert.alert('경고', '설정은 저장되었으나 적용에 실패했습니다.');
    }
    
    setLoading(false);
  };

  // 기본값으로 초기화
  const handleReset = () => {
    Alert.alert(
      '초기화 확인',
      '설정을 기본값으로 초기화하시겠습니까?',
      [
        { text: '취소' },
        {
          text: '초기화',
          onPress: () => {
            setSettings(DEFAULT_SETTINGS);
          }
        }
      ]
    );
  };

  const handleChange = (key, value) => {
    const numValue = parseInt(value) || 0;
    setSettings(prev => ({
      ...prev,
      [key]: numValue
    }));
  };

  // 초기 로딩 화면
  if (isInitialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>설정을 불러오는 중...</Text>
      </View>
    );
  }

  // 에러 화면
  if (loadError) {
    return (
      <View style={styles.errorContainer}>
        <Octicons name="alert-fill" size={40} color="#ffc219ff" />
        <Text style={styles.errorTitle}>네트워크 오류</Text>
        <Text style={styles.errorText}>
          설정을 불러올 수 없습니다
        </Text>
        
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadSettings}
        >
          <Text style={styles.retryButtonText}>
            다시 시도하기
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>
            ← 뒤로 가기
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>환경 설정</Text>
      </View>

      {/* 문 제어 */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>문 제어</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.label}>문 열림 온도 (°C)</Text>
          <TextInput
            style={styles.input}
            value={String(settings.doorOpenTemp)}
            onChangeText={(text) => handleChange('doorOpenTemp', text)}
            keyboardType="numeric"
            placeholder="28"
            editable={!loading}
          />
          <Text style={styles.description}>
            이 온도 이상일 때 문이 열립니다
          </Text>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.label}>문 닫힘 온도 (°C)</Text>
          <TextInput
            style={styles.input}
            value={String(settings.doorCloseTemp)}
            onChangeText={(text) => handleChange('doorCloseTemp', text)}
            keyboardType="numeric"
            placeholder="24"
            editable={!loading}
          />
          <Text style={styles.description}>
            이 온도 이하일 때 문이 닫힙니다
          </Text>
        </View>
      </View>

      {/* 팬 제어 */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>팬 제어</Text>
        
        <View style={styles.settingItem}>
          <Text style={styles.label}>팬 가동 습도 기준 (%)</Text>
          <TextInput
            style={styles.input}
            value={String(settings.fanHumidityThreshold)}
            onChangeText={(text) => handleChange('fanHumidityThreshold', text)}
            keyboardType="numeric"
            placeholder="70"
            editable={!loading}
          />
          <Text style={styles.description}>
            이 습도 이상일 때 팬이 가동됩니다
          </Text>
        </View>

        <View style={styles.settingItem}>
          <Text style={styles.label}>팬 가동 CO2 기준 (ppm)</Text>
          <TextInput
            style={styles.input}
            value={String(settings.fanCO2Threshold)}
            onChangeText={(text) => handleChange('fanCO2Threshold', text)}
            keyboardType="numeric"
            placeholder="1000"
            editable={!loading}
          />
          <Text style={styles.description}>
            이 CO2 농도 초과 시 팬이 가동됩니다
          </Text>
        </View>
      </View>

      {/* 버튼 그룹 */}
      <View style={styles.buttonGroup}>

        <TouchableOpacity
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              설정 저장 및 적용
            </Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.resetButton, loading && styles.disabledButton]}
          onPress={handleReset}
          disabled={loading}
        >
          <Text style={styles.resetButtonText}>기본값으로 초기화</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.resetButton, loading && styles.disabledButton]}
          onPress={() => router.replace('/control/ManualControl')}
          disabled={loading}
        >
          <Text style={styles.resetButtonText}>뒤로가기</Text>
        </TouchableOpacity>
        
      </View>
    </ScrollView>
  );
};

export default AutoControl;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5'
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
    backgroundColor: '#f5f5f5',
    padding: 20
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 20
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center'
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    marginBottom: 15,
    minWidth: 200, // 33
    alignItems: 'center'
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  backButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    minWidth: 200,
    alignItems: 'center'
  },
  backButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600'
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop : 30
  },
  card: {
    backgroundColor: '#fff',
    margin: 15,
    marginBottom: 0,
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333'
  },
  settingItem: {
    marginBottom: 20
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333'
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    backgroundColor: '#fafafa'
  },
  description: {
    fontSize: 13,
    color: '#666',
    marginTop: 5,
    lineHeight: 18
  },
  buttonGroup: {
    paddingVertical: 10,
    flexDirection : 'row',
    justifyContent  : 'space-evenly',
    
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 10,
    padding : 15,
    minWidth: 100,
    alignItems: 'center'
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold'
  },
  resetButton: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  resetButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600'
  },
  disabledButton: {
    opacity: 0.5
  }
});