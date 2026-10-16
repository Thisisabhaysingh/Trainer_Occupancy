import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import styles from '../styles';

export default function WelcomeScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={{ flex: 1, backgroundColor: '#4B6CFF', borderBottomLeftRadius: 40, borderBottomRightRadius: 40, paddingTop: 80, paddingHorizontal: 24, paddingBottom: 32 }}>
        <Text style={styles.titleWhite}>Welcome Back 👋</Text>
        <Text style={[styles.subtitle, { color: '#D4DEFF', marginTop: 12, width: '85%' }]}>Track your attendance, activities, and productivity every day with a clean mobile dashboard.</Text>
        <View style={{ width: 240, height: 240, alignSelf: 'center', marginTop: 30 }}>
          <Image source={require('../../assets/placeholder.png')} style={{ width: '100%', height: '100%', resizeMode: 'contain' }} />
        </View>
      </View>

      <View style={[styles.card, { marginHorizontal: 20, marginTop: -50 }]}> 
        <Text style={styles.titleDark}>Your productivity starts here</Text>
        <Text style={[styles.smallText, { marginTop: 10 }]}>Login to continue and manage attendance, sessions, and reports from a modern interface.</Text>
        <TouchableOpacity style={[styles.buttonPrimary, { marginTop: 24 }]} onPress={() => navigation.navigate('Login')}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
