import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import styles from '../styles';

export default function ProfileScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: 60 }]}> 
        <Text style={styles.titleWhite}>Profile</Text>
        <Text style={[styles.smallText, { color: '#D4DEFF', marginTop: 8 }]}>View and update your account</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontSize: 22, fontWeight: '800' }}>Abhay Pratap Singh</Text>
              <Text style={[styles.smallText, { marginTop: 6 }]}>Employee</Text>
              <Text style={[styles.smallText, { marginTop: 4, color: '#6B7280' }]}>OMOTEC</Text>
            </View>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#F5F7FF', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ fontSize: 28, fontWeight: '800', color: '#4B6CFF' }}>A</Text>
            </View>
          </View>
        </View>

        {['Personal Information', 'Change Password', 'Notification Settings', 'Help & Support', 'About Us'].map(item => (
          <TouchableOpacity key={item} style={[styles.card, { paddingVertical: 18, paddingHorizontal: 20 }]}> 
            <Text style={{ fontSize: 16, fontWeight: '700' }}>{item}</Text>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={[styles.buttonPrimary, { marginTop: 16 }]} onPress={() => navigation.replace('Login')}>
          <Text style={styles.buttonText}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
