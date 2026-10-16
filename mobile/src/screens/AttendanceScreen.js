import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import styles from '../styles';

export default function AttendanceScreen() {
  const [selectedType, setSelectedType] = useState('Full Day');

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: 60 }]}> 
        <Text style={styles.titleWhite}>Mark Attendance</Text>
        <Text style={[styles.smallText, { color: '#D4DEFF', marginTop: 8 }]}>Select your attendance type</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Attendance Type</Text>

          {['Full Day', 'Half Day', 'Leave'].map(type => (
            <TouchableOpacity
              key={type}
              onPress={() => setSelectedType(type)}
              style={[
                styles.pill,
                selectedType === type && styles.pillActive,
                { marginBottom: 12 }
              ]}
            >
              <Text style={selectedType === type ? styles.pillTextActive : styles.pillText}>
                {type} {type === 'Full Day' ? '(9h)' : type === 'Half Day' ? '(4.5h)' : '(0h)'}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={{ marginTop: 16 }}>
            <Text style={[styles.smallText, { marginBottom: 8 }]}>Attendance Date</Text>
            <View style={[styles.input, { paddingVertical: 16 }]}>
              <Text style={{ color: '#111827' }}>May 29, 2026</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.buttonPrimary, { marginTop: 24 }]}
            onPress={() => alert('Attendance submitted')}
          >
            <Text style={styles.buttonText}>Submit Attendance</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
