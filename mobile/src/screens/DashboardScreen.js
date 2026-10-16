import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import styles from '../styles';

export default function DashboardScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.smallText}>Good Morning,</Text>
            <Text style={[styles.titleWhite, { fontSize: 28, marginTop: 8 }]}>Abhay Pratap Singh 👋</Text>
            <Text style={[styles.smallText, { color: '#D4DEFF', marginTop: 6 }]}>Friday, May 29, 2026</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#4B6CFF', fontSize: 20, fontWeight: '800' }}>A</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { marginTop: -40 }]}> 
          <Text style={styles.sectionTitle}>Current Time</Text>
          <Text style={{ fontSize: 36, fontWeight: '800', color: '#111827' }}>09:44:36 AM</Text>
          <Text style={[styles.smallText, { marginTop: 10 }]}>Stay on track with your daily attendance and sessions.</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
            <View style={[styles.card, { flex: 1, marginRight: 8, backgroundColor: '#F5F7FF', padding: 16, marginVertical: 0, shadowOpacity: 0 }]}> 
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#4B6CFF' }}>Full Day</Text>
              <Text style={[styles.titleDark, { marginTop: 8, fontSize: 24 }]}>24</Text>
            </View>
            <View style={[styles.card, { flex: 1, marginLeft: 8, backgroundColor: '#F5F7FF', padding: 16, marginVertical: 0, shadowOpacity: 0 }]}> 
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#4B6CFF' }}>Half Days</Text>
              <Text style={[styles.titleDark, { marginTop: 8, fontSize: 24 }]}>0</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Working Hours</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
            <View>
              <Text style={styles.smallText}>Check In</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', marginTop: 4 }}>09:00 AM</Text>
            </View>
            <View>
              <Text style={styles.smallText}>Check Out</Text>
              <Text style={{ fontSize: 16, fontWeight: '800', marginTop: 4 }}>06:00 PM</Text>
            </View>
          </View>
          <View style={{ marginTop: 18, backgroundColor: '#F5F7FF', borderRadius: 18, padding: 16 }}>
            <Text style={{ color: '#4B6CFF', fontWeight: '700' }}>7.5 / 9h Completed</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Today’s Summary</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
            <View style={{ flex: 1, marginRight: 8, backgroundColor: '#F5F7FF', borderRadius: 18, padding: 16 }}>
              <Text style={{ color: '#4B6CFF', fontWeight: '700' }}>Working Hours</Text>
              <Text style={{ marginTop: 8, fontSize: 20, fontWeight: '800' }}>0.0</Text>
            </View>
            <View style={{ flex: 1, marginHorizontal: 8, backgroundColor: '#F5F7FF', borderRadius: 18, padding: 16 }}>
              <Text style={{ color: '#4B6CFF', fontWeight: '700' }}>Institute Session</Text>
              <Text style={{ marginTop: 8, fontSize: 20, fontWeight: '800' }}>0</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 8, backgroundColor: '#F5F7FF', borderRadius: 18, padding: 16 }}>
              <Text style={{ color: '#4B6CFF', fontWeight: '700' }}>School Session</Text>
              <Text style={{ marginTop: 8, fontSize: 20, fontWeight: '800' }}>0</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <TouchableOpacity style={[styles.card, { flex: 1, marginRight: 8 }]} onPress={() => navigation.navigate('Attendance')}>
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 10 }}>Mark Attendance</Text>
            <Text style={styles.smallText}>Select your attendance type and submit.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.card, { flex: 1, marginLeft: 8 }]} onPress={() => navigation.navigate('AddActivity')}>
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 10 }}>Add Activity</Text>
            <Text style={styles.smallText}>Log a new task or session.</Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', marginTop: 8 }}>
          <TouchableOpacity style={[styles.card, { flex: 1, marginRight: 8 }]} onPress={() => navigation.navigate('Calendar')}>
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 10 }}>Calendar</Text>
            <Text style={styles.smallText}>View your month and agenda.</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.card, { flex: 1, marginLeft: 8 }]} onPress={() => navigation.navigate('Reports')}>
            <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 10 }}>Reports</Text>
            <Text style={styles.smallText}>Check productivity metrics.</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
