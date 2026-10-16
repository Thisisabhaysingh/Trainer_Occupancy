import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import styles from '../styles';

export default function ReportsScreen() {
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: 60 }]}> 
        <Text style={styles.titleWhite}>Reports</Text>
        <Text style={[styles.smallText, { color: '#D4DEFF', marginTop: 8 }]}>This month performance</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Text style={styles.sectionTitle}>This Month</Text>
            <View style={styles.tag}>
              <Text style={styles.tagText}>Live</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, marginRight: 8, backgroundColor: '#F5F7FF', borderRadius: 18, padding: 16 }}>
              <Text style={{ color: '#4B6CFF', fontWeight: '700' }}>Total Hours</Text>
              <Text style={{ marginTop: 12, fontSize: 24, fontWeight: '800' }}>197.1</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 8, backgroundColor: '#F5F7FF', borderRadius: 18, padding: 16 }}>
              <Text style={{ color: '#4B6CFF', fontWeight: '700' }}>Working Days</Text>
              <Text style={{ marginTop: 12, fontSize: 24, fontWeight: '800' }}>24</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            <View style={{ flex: 1, marginRight: 8, backgroundColor: '#F5F7FF', borderRadius: 18, padding: 16 }}>
              <Text style={{ color: '#4B6CFF', fontWeight: '700' }}>Leaves</Text>
              <Text style={{ marginTop: 12, fontSize: 24, fontWeight: '800' }}>1</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 8, backgroundColor: '#F5F7FF', borderRadius: 18, padding: 16 }}>
              <Text style={{ color: '#4B6CFF', fontWeight: '700' }}>Half Days</Text>
              <Text style={{ marginTop: 12, fontSize: 24, fontWeight: '800' }}>0</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Hours Overview</Text>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
            <View key={day} style={{ marginTop: index === 0 ? 0 : 14 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={styles.smallText}>{day}</Text>
                <Text style={{ fontWeight: '700' }}>{[6, 8, 7, 9, 8, 4, 0][index]}h</Text>
              </View>
              <View style={{ height: 10, borderRadius: 10, backgroundColor: '#E6E9F2' }}>
                <View style={{ width: `${[70, 90, 80, 100, 90, 45, 0][index]}%`, height: '100%', borderRadius: 10, backgroundColor: '#4B6CFF' }} />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
