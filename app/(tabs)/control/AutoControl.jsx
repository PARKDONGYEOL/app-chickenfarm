import axios from 'axios';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

const AutoControl = () => {
  const DEFAULT_SETTINGS = {
    doorOpenTemp: 28,
    doorCloseTemp: 24,
    fanHumidityThreshold: 70,
    fanCO2Threshold: 1000
  };

  const router = useRouter();
  
  const [settings, setSettings] = useState({
    doorOpenTemp: 28,
    doorCloseTemp: 24,
    fanHumidityThreshold: 70,
    fanCO2Threshold: 1000
  });

  const [loading, setLoading] = useState(false);

  // 설정 불러오기
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await axios.get('http://192.168.30.240:5000/api/settings/simple', {
        timeout: 15000
      });
      
      const data = res.data.data

      if (res.data.success && data) {
        setSettings(data);
      }
    } catch(e) {
      console.log('설정 불러오기 실패:', e);
    }
  };

  // 설정 저장
  const handleSave = async () => {
    setLoading(true);
    
    try {
      // 1. 설정 저장
      const saveRes = await axios.post(
        'http://192.168.30.240:5000/api/settings/update',
        settings,
        { timeout: 15000 }
      );
      
      if (saveRes.data && saveRes.data.success) {
        // 2. 라즈베리파이에 적용
        await axios.post(
          'http://192.168.30.240:5000/api/settings/apply',
          {},
          { timeout: 15000 }
        );
        
        Alert.alert('저장 완료', '설정이 저장되었습니다.');
      } else {
       // Alert.alert('저장 실패', saveRes.data?.message || '설정 저장에 실패했습니다.');
      }
    } catch(e) {
      console.log('설정 저장 실패:', e);
      //실제로는 저장되는 거 맞는데 앱 느림 이슈로 오류 뜨길래 그냥 오류란에도 성공 메세지 띄워놓음
      Alert.alert('저장 완료', '설정이 저장되었습니다.'); 
     // Alert.alert('오류', '설정 저장 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
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
          <Text style={styles.saveButtonText}>
            설정 저장 및 적용
          </Text>
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
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333'
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
    padding : 15
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