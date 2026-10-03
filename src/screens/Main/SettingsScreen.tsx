import React from 'react';
import {
  Alert,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { supabase } from '../../../lib/supabase';

export default function SettingsScreen() {
  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      Alert.alert('Sign out failed', error.message);
      return;
    }

    Alert.alert('Signed out', 'You have been signed out of BRITUME.');
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.kicker}>BRITUME • SETTINGS</Text>
      <Text style={styles.title}>Control center</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Text style={styles.sectionBody}>Profile, email, password, account details.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        <Text style={styles.sectionBody}>App lock, passcode, biometrics, protection.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy</Text>
        <Text style={styles.sectionBody}>Control visibility and personal data access.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <Text style={styles.sectionBody}>Alerts, messages, and personal updates.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance / Themes</Text>
        <Text style={styles.sectionBody}>Dark mode, visual themes, premium UI styling.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Language</Text>
        <Text style={styles.sectionBody}>Choose your BRITUME language.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storage</Text>
        <Text style={styles.sectionBody}>Profile media, backups, and account storage usage.</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About BRITUME</Text>
        <Text style={styles.sectionBody}>BRITUME version, app overview, and developer info.</Text>
      </View>

      <View style={styles.signOutWrap}>
        <Button title="Sign out" onPress={signOut} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#070b12',
    gap: 12,
  },
  kicker: {
    color: '#d9b867',
    fontSize: 12,
    letterSpacing: 1.6,
    fontWeight: '800',
    marginBottom: 8,
  },
  title: {
    color: '#f4f6fa',
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 10,
  },
  section: {
    backgroundColor: '#101722',
    borderWidth: 1,
    borderColor: '#263247',
    borderRadius: 14,
    padding: 14,
  },
  sectionTitle: {
    color: '#f4f6fa',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionBody: {
    color: '#c5ccd7',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  signOutWrap: {
    marginTop: 12,
  },
});
