import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

const AlertCard = ({ alert, onPress, isSelected, onLongPress }) => {
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critical':
        return '#FF4444'
      case 'Warning':
        return '#FFA726'
      default:
        return '#66BB6A'
    }
  }

  const getSensorIcon = (type) => {
    switch (type) {
      case 'temperature':
        return 'thermometer-outline'
      case 'humidity':
        return 'water-outline'
      case 'light':
        return 'sunny-outline'
      case 'ammonia':
        return 'warning-outline'
      case 'co2':
        return 'cloud-outline'
      case 'co':
        return 'alert-circle-outline'
      case 'no2':
        return 'alert-outline'
      default:
        return 'notifications-outline'
    }
  }

  const getSensorBgColor = (type, severity) => {
    if (severity === 'Critical') {
      return '#FFEBEE'
    }
    return '#FFF8E1'
  }

  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.selectedCard]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        {isSelected && (
          <View style={styles.checkboxContainer}>
            <Ionicons name="checkmark-circle" size={24} color="#2196F3" />
          </View>
        )}
        <View style={[
          styles.iconContainer,
          { backgroundColor: getSensorBgColor(alert.sensorType, alert.severity) }
        ]}>
          <Ionicons
            name={getSensorIcon(alert.sensorType)}
            size={24}
            color={getSeverityColor(alert.severity)}
          />
        </View>

        <View style={styles.contentContainer}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{alert.title}</Text>
            <Text style={styles.time}>{alert.timeAgo}</Text>
          </View>

          <Text style={styles.description}>{alert.description}</Text>

          <View style={styles.footerRow}>
            <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(alert.severity) }]}>
              <Text style={styles.severityText}>{alert.severity}</Text>
            </View>
            <View style={styles.rightFooter}>
              {alert.severity === 'Critical' && (
                <View style={styles.criticalDot} />
              )}
              {alert.exactTime && (
                <Text style={styles.exactTime}>{alert.exactTime}</Text>
              )}
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

export default AlertCard

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  selectedCard: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 16,
  },
  checkboxContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    flex: 1,
  },
  time: {
    fontSize: 12,
    color: '#9E9E9E',
    marginLeft: 8,
  },
  description: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 8,
    lineHeight: 20,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rightFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exactTime: {
    fontSize: 11,
    color: '#757575',
  },
  severityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  criticalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4444',
  },
})
