import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView, ActivityIndicator, Linking, Modal, PermissionsAndroid, Platform } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import axios from 'axios';
import * as Location from 'expo-location';
import { useSpeechRecognitionEvent, ExpoSpeechRecognitionModule } from 'expo-speech-recognition';
import MyModule from './modules/my-module/src/MyModule';
import { io } from 'socket.io-client';

const Stack = createNativeStackNavigator();
// Ensure this matches your actual local backend IP
const API_URL = 'http://192.168.1.100:3001/api'; 
const SOCKET_URL = 'http://192.168.1.100:3001';

// Theme Colors
const theme = {
  bg: '#111827',
  card: '#1f2937',
  border: '#374151',
  text: '#f9fafb',
  textMuted: '#9ca3af',
  primary: '#3b82f6',
  danger: '#ef4444',
  success: '#22c55e',
};

function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please enter email and password');
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/auth/login`, { email, password });
      if (response.data.success) {
        navigation.replace('Dashboard', { 
          token: response.data.token, 
          user: response.data.user 
        });
      }
    } catch (error) {
      Alert.alert('Login Failed', error.response?.data?.error || error.message);
    }
    setLoading(false);
  };

  return (
    <View style={styles.loginContainer}>
      <Text style={styles.title}>Guardian Protocol</Text>
      <Text style={styles.subtitle}>Secure Access</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={theme.textMuted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor={theme.textMuted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TouchableOpacity style={styles.buttonPrimary} onPress={handleLogin} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
      </TouchableOpacity>
    </View>
  );
}

function DashboardScreen({ route, navigation }) {
  const { token, user } = route.params;
  const [contacts, setContacts] = useState([]);
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMap, setLoadingMap] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState('');
  
  const [nearbyUsers, setNearbyUsers] = useState([]);
  const [incomingSos, setIncomingSos] = useState(null);
  
  const socket = React.useRef(null);

  useEffect(() => {
    fetchContacts();
    requestPermissions();

    // Socket Setup
    socket.current = io(SOCKET_URL);
    
    // Attempt to update location for nearby user alerts
    Location.getCurrentPositionAsync({}).then((position) => {
      socket.current.emit('update_location', {
        userId: user._id,
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });
      fetchNearbyUsers(position.coords.latitude, position.coords.longitude);
    }).catch(err => console.log('Location permission not granted initially'));

    socket.current.on('incoming_sos', (data) => {
      setIncomingSos(data);
    });

    return () => {
      if (socket.current) socket.current.disconnect();
    };
  }, []);

  const fetchNearbyUsers = async (lat, lng) => {
    try {
      const response = await axios.get(`${API_URL}/emergency/nearby-users?lat=${lat}&lng=${lng}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setNearbyUsers(response.data.data);
      }
    } catch (error) {
      console.error("Failed to fetch nearby users", error);
    }
  };

  // Voice Command Event Listener
  useSpeechRecognitionEvent("result", (event) => {
    let currentTranscript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      currentTranscript += event.results[i][0].transcript;
    }
    setTranscript(currentTranscript);
    
    const text = currentTranscript.toLowerCase();
    
    // 1. Check for Contact Names
    let foundContact = false;
    if (contacts.length > 0) {
      for (const contact of contacts) {
        if (contact.contactName && text.includes(contact.contactName.toLowerCase())) {
          MyModule.makePhoneCall(contact.phoneNumber);
          toggleListening(false);
          foundContact = true;
          break;
        }
      }
    }
    if (foundContact) return;

    // 2. Check Hotlines
    if (text.includes('police') || text.includes('fire') || text.includes('national emergency') || text.includes('999')) {
      MyModule.makePhoneCall('999');
      toggleListening(false);
    } else if (text.includes('health') || text.includes('ambulance') || text.includes('16263')) {
      MyModule.makePhoneCall('16263');
      toggleListening(false);
    } else if (text.includes('women') || text.includes('children') || text.includes('109')) {
      MyModule.makePhoneCall('109');
      toggleListening(false);
    } else if (text.includes('information') || text.includes('help desk') || text.includes('333')) {
      MyModule.makePhoneCall('333');
      toggleListening(false);
    } 
    // 3. Emergency SOS
    else if (text.includes("help") || text.includes("bacao") || text.includes("emergency")) {
      triggerSOS('GENERAL');
      toggleListening(false);
    }
  });

  const requestPermissions = async () => {
    await Location.requestForegroundPermissionsAsync();
    ExpoSpeechRecognitionModule.requestPermissionsAsync();
    
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.CALL_PHONE,
          {
            title: "Phone Call Permission",
            message: "Guardian Protocol needs access to make emergency phone calls automatically.",
            buttonNeutral: "Ask Me Later",
            buttonNegative: "Cancel",
            buttonPositive: "OK"
          }
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.log("Call Phone permission denied");
        }
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await axios.get(`${API_URL}/contacts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setContacts(response.data.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const toggleListening = async (forceState = null) => {
    const newState = forceState !== null ? forceState : !isListening;
    if (!newState) {
      ExpoSpeechRecognitionModule.stop();
      setIsListening(false);
    } else {
      ExpoSpeechRecognitionModule.start({ lang: "en-US", continuous: true });
      setIsListening(true);
    }
  };

  const triggerSOS = async (type = 'GENERAL') => {
    if (loading || loadingMap) return;
    
    if (type === 'GENERAL') {
      setLoading(true);
    } else {
      setLoadingMap(true);
    }
    
    try {
      const location = await Location.getCurrentPositionAsync({});
      
      const response = await axios.post(`${API_URL}/emergency/trigger`, {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        triggerType: type
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success && response.data.eventId) {
        // Open Web Tracking View directly as requested (no auto-call on SOS)
        const webUrl = `http://192.168.1.100:3000/track/${response.data.eventId}`; // Assuming Next.js runs on 3000
        Linking.openURL(webUrl).catch(() => setError("Could not open map URL"));
      } else {
        setError("Failed to trigger emergency.");
      }
    } catch (error) {
      console.error(error);
      setError(error.message || "Network error while triggering emergency.");
    }
    
    setLoading(false);
    setLoadingMap(false);
  };

  return (
    <View style={styles.container}>
      
      {/* INCOMING SOS MODAL */}
      <Modal visible={!!incomingSos} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>🚨 Emergency Nearby</Text>
            <Text style={styles.modalText}><Text style={{fontWeight: 'bold'}}>{incomingSos?.victimName}</Text> needs help!</Text>
            <Text style={styles.modalText}>{incomingSos?.distance} km away</Text>
            <Text style={styles.modalText}>Tracking ID: {incomingSos?.eventId}</Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.buttonPrimary} onPress={() => {
                Linking.openURL(`http://192.168.1.100:3000/track/${incomingSos?.eventId}`);
                setIncomingSos(null);
              }}>
                <Text style={styles.buttonText}>View Live Tracker</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.buttonPrimary, {backgroundColor: theme.border, marginTop: 10}]} onPress={() => setIncomingSos(null)}>
                <Text style={styles.buttonText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Guardian Protocol</Text>
            <Text style={styles.subtitle}>Welcome back, {user?.fullName || 'User'}</Text>
          </View>
          <View style={{alignItems: 'flex-end', gap: 10}}>
            <TouchableOpacity onPress={() => Linking.openURL('http://192.168.1.100:3000/dashboard')}>
              <Text style={{color: theme.primary, fontWeight: 'bold', fontSize: 13}}>Admin Dashboard</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.replace('Login')}>
              <Text style={{color: theme.danger, fontWeight: 'bold'}}>Secure Logout</Text>
            </TouchableOpacity>
          </View>
        </View>

        {error ? (
          <View style={{backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.5)', borderWidth: 1, padding: 15, borderRadius: 12, marginBottom: 20}}>
            <Text style={{color: theme.danger}}>⚠️ {error}</Text>
          </View>
        ) : null}

        {/* SOS Button */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
             <Text style={styles.cardTitle}>🚨 Emergency Override</Text>
             <TouchableOpacity style={[styles.pill, {backgroundColor: isListening ? theme.danger : theme.border}]} onPress={() => toggleListening()}>
                <Text style={{color: theme.text, fontSize: 12, fontWeight: 'bold'}}>{isListening ? 'Voice Active' : 'Enable Voice'}</Text>
             </TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.sosButton, loading && styles.sosDisabled]} onPress={() => triggerSOS('GENERAL')} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" size="large" /> : <Text style={styles.sosText}>SOS</Text>}
          </TouchableOpacity>
          <Text style={{color: theme.textMuted, textAlign: 'center', fontSize: 12, marginTop: 15, textTransform: 'uppercase', letterSpacing: 1}}>Tap or say "Help"</Text>
          
          {!!transcript && (
            <View style={{backgroundColor: 'rgba(0,0,0,0.4)', alignSelf: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)'}}>
              <Text style={{color: '#d1d5db', fontStyle: 'italic', fontSize: 14}}>"{transcript}"</Text>
            </View>
          )}
        </View>

        {/* Safe Exploration */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🗺️ Safe Exploration</Text>
          <Text style={{color: theme.textMuted, fontSize: 13, marginBottom: 15}}>Silently view your area and scan for nearby hospitals or police stations.</Text>
          <TouchableOpacity style={styles.buttonBlue} onPress={() => triggerSOS('SILENT')} disabled={loadingMap}>
            {loadingMap ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>My Area Map</Text>}
          </TouchableOpacity>
        </View>

        {/* Contacts */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>📞 Trusted Contacts ({contacts.length})</Text>
            <TouchableOpacity onPress={() => Linking.openURL('http://192.168.1.100:3000/dashboard/contacts')}>
              <Text style={{color: theme.primary, fontSize: 13, fontWeight: 'bold'}}>Manage</Text>
            </TouchableOpacity>
          </View>
          {contacts.length === 0 ? <Text style={{color: theme.textMuted, marginTop: 10}}>No contacts found.</Text> : null}
          {contacts.map((contact, index) => (
            <View key={index} style={styles.listItem}>
              <View>
                <Text style={styles.listTitle}>{contact.contactName}</Text>
                <Text style={styles.listSub}>{contact.phoneNumber}</Text>
              </View>
              <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${contact.phoneNumber}`)}>
                <Text style={{color: theme.text, fontSize: 12, fontWeight: 'bold'}}>Call</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Volunteers */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🤝 Nearby Volunteers ({nearbyUsers.length})</Text>
          {nearbyUsers.length === 0 ? <Text style={{color: theme.textMuted, marginTop: 10}}>Scanning area...</Text> : null}
          {nearbyUsers.map((u, index) => (
            <View key={index} style={styles.listItem}>
              <View>
                <Text style={styles.listTitle}>{u.fullName}</Text>
                <Text style={styles.listSub}>📍 {u.distance} km away</Text>
              </View>
              <TouchableOpacity style={[styles.actionBtn, {backgroundColor: theme.danger}]} onPress={() => Linking.openURL(`tel:${u.phoneNumber}`)}>
                <Text style={{color: theme.text, fontSize: 12, fontWeight: 'bold'}}>Request</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Hotlines */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>🏛️ National Hotlines</Text>
          <View style={styles.grid}>
             <TouchableOpacity style={styles.gridItem} onPress={() => Linking.openURL(`tel:999`)}>
               <Text style={[styles.gridTitle, {color: theme.danger}]}>999</Text>
               <Text style={styles.gridSub}>Police/Emergency</Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.gridItem} onPress={() => Linking.openURL(`tel:16263`)}>
               <Text style={[styles.gridTitle, {color: theme.primary}]}>16263</Text>
               <Text style={styles.gridSub}>Ambulance</Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.gridItem} onPress={() => Linking.openURL(`tel:109`)}>
               <Text style={[styles.gridTitle, {color: '#ec4899'}]}>109</Text>
               <Text style={styles.gridSub}>Women/Children</Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.gridItem} onPress={() => Linking.openURL(`tel:333`)}>
               <Text style={[styles.gridTitle, {color: theme.success}]}>333</Text>
               <Text style={styles.gridSub}>Help Desk</Text>
             </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: theme.bg }
      }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 50,
    paddingBottom: 40,
  },
  loginContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    backgroundColor: theme.bg,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: theme.text,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: theme.textMuted,
    marginBottom: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  card: {
    backgroundColor: theme.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 10,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  input: {
    backgroundColor: theme.card,
    color: theme.text,
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: theme.border,
  },
  buttonPrimary: {
    backgroundColor: theme.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonBlue: {
    backgroundColor: theme.primary,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  sosButton: {
    backgroundColor: theme.danger,
    width: 220,
    height: 220,
    borderRadius: 110,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    borderWidth: 5,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    elevation: 10,
    shadowColor: theme.danger,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
  },
  sosDisabled: {
    opacity: 0.7,
  },
  sosText: {
    color: '#fff',
    fontSize: 54,
    fontWeight: '900',
    letterSpacing: 2,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  listTitle: {
    color: theme.text,
    fontWeight: 'bold',
    fontSize: 15,
  },
  listSub: {
    color: theme.textMuted,
    fontSize: 12,
    marginTop: 3,
  },
  actionBtn: {
    backgroundColor: theme.border,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  gridTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 5,
  },
  gridSub: {
    color: theme.textMuted,
    fontSize: 12,
  },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: theme.card,
    borderWidth: 2,
    borderColor: theme.danger,
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.text,
    marginBottom: 15,
    textTransform: 'uppercase',
  },
  modalText: {
    color: theme.text,
    fontSize: 16,
    marginBottom: 5,
  },
  modalButtons: {
    width: '100%',
    marginTop: 20,
  }
});
