import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import styles from '../styles';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={[styles.container, { justifyContent: 'center' }]}> 
      <View style={styles.card}>
        <Text style={styles.titleDark}>Hello Again 👋</Text>
        <Text style={[styles.smallText, { marginTop: 8, marginBottom: 24 }]}>Login to continue</Text>
        <TextInput
          placeholder="Email or Employee ID"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <TextInput
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.input}
        />
        <TouchableOpacity onPress={() => {}}>
          <Text style={[styles.smallText, { textAlign: 'right', marginBottom: 18, color: '#4B6CFF' }]}>Forgot Password?</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.buttonPrimary} onPress={() => navigation.replace('Main')}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>

        <Text style={[styles.smallText, { textAlign: 'center', marginVertical: 18 }]}>or continue with</Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <TouchableOpacity style={[styles.buttonSecondary, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.buttonTextDark}>Google</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.buttonSecondary, { flex: 1, marginLeft: 10 }]}>
            <Text style={styles.buttonTextDark}>Microsoft</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => {}} style={{ marginTop: 24 }}>
          <Text style={[styles.smallText, { textAlign: 'center', color: '#6B7280' }]}>Don't have an account? Contact Admin</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
