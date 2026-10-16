import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import styles from '../styles';

const weekDays = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const dayNumbers = [27, 28, 29, 30, 31, 1, 2];

export default function CalendarScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.titleWhite}>May 2026</Text>
        <Text style={[styles.smallText, { color: '#D4DEFF', marginTop: 8 }]}>Month View</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            {weekDays.map(day => (
              <Text key={day} style={[styles.smallText, { fontSize: 12, color: '#9CA3AF' }]}>{day}</Text>
            ))}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            {dayNumbers.map((day, index) => (
              <View key={index} style={{ alignItems: 'center', width: 36 }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: day === 29 ? '#4B6CFF' : '#F5F7FF', justifyContent: 'center', alignItems: 'center' }}>
                  <Text style={{ color: day === 29 ? '#FFFFFF' : '#111827', fontWeight: day === 29 ? '800' : '700' }}>{day}</Text>
                </View>
              </View>
            ))}
          </View>

          <View style={{ marginTop: 24 }}>
            <Text style={styles.sectionTitle}>Events</Text>
            <View style={[styles.card, { backgroundColor: '#F5F7FF', marginVertical: 8, padding: 16 }]}> 
              <Text style={{ fontWeight: '700' }}>Full Day</Text>
              <Text style={[styles.smallText, { marginTop: 6 }]}>Projects - Department Work</Text>
            </View>
            <View style={[styles.card, { backgroundColor: '#F5F7FF', marginVertical: 8, padding: 16 }]}> 
              <Text style={{ fontWeight: '700' }}>Institute Session</Text>
              <Text style={[styles.smallText, { marginTop: 6 }]}>Inventory Management</Text>
            </View>
            <View style={[styles.card, { backgroundColor: '#F5F7FF', marginVertical: 8, padding: 16 }]}> 
              <Text style={{ fontWeight: '700' }}>School Session</Text>
              <Text style={[styles.smallText, { marginTop: 6 }]}>Educational Visit</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
