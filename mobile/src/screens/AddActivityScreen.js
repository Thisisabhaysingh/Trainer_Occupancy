import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import styles from '../styles';

export default function AddActivityScreen() {
  const [activityType, setActivityType] = useState('Projects - Department Work');
  const [sessionType, setSessionType] = useState('Institute Session');
  const [comment, setComment] = useState('');

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: 60 }]}> 
        <Text style={styles.titleWhite}>Add Activity</Text>
        <Text style={[styles.smallText, { color: '#D4DEFF', marginTop: 8 }]}>Fill in your activity details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Activity Type</Text>
          {['Projects - Department Work', 'Institute Session', 'School Session'].map(item => (
            <TouchableOpacity
              key={item}
              onPress={() => setActivityType(item)}
              style={[
                styles.pill,
                activityType === item && styles.pillActive,
                { marginBottom: 12 }
              ]}
            >
              <Text style={activityType === item ? styles.pillTextActive : styles.pillText}>{item}</Text>
            </TouchableOpacity>
          ))}

          <Text style={[styles.smallText, { marginTop: 12, marginBottom: 10 }]}>Session Type</Text>
          <View style={{ flexDirection: 'row' }}>
            {['Institute Session', 'School Session'].map(type => (
              <TouchableOpacity
                key={type}
                onPress={() => setSessionType(type)}
                style={[
                  styles.pill,
                  sessionType === type && styles.pillActive,
                  { marginBottom: 0 }
                ]}
              >
                <Text style={sessionType === type ? styles.pillTextActive : styles.pillText}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.smallText, { marginTop: 16, marginBottom: 8 }]}>Start Time</Text>
          <View style={[styles.input, { paddingVertical: 16 }]}>
            <Text style={{ color: '#111827' }}>02:00 PM</Text>
          </View>

          <Text style={[styles.smallText, { marginTop: 12, marginBottom: 8 }]}>End Time</Text>
          <View style={[styles.input, { paddingVertical: 16 }]}>
            <Text style={{ color: '#111827' }}>04:00 PM</Text>
          </View>

          <Text style={[styles.smallText, { marginTop: 12, marginBottom: 8 }]}>Comment</Text>
          <TextInput
            placeholder="Inventory Management"
            value={comment}
            onChangeText={setComment}
            multiline
            style={[styles.input, { height: 110, textAlignVertical: 'top' }]}
          />

          <TouchableOpacity style={[styles.buttonPrimary, { marginTop: 18 }]} onPress={() => alert('Activity saved')}>
            <Text style={styles.buttonText}>Save Activity</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
