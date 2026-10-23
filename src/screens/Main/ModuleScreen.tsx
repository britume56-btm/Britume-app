import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Switch,
  Pressable,
  Platform,
} from 'react-native';

interface SystemModule {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'inactive';
  critical: boolean;
}

const INITIAL_MODULES: SystemModule[] = [
  {
    id: 'core_engine',
    title: 'Core Runtime Engine',
    description: 'Manages lower-level binary message framing and live thread loops.',
    status: 'active',
    critical: true,
  },
  {
    id: 'haptic_bridge',
    title: 'Haptic Feedback Service',
    description: 'Provides physical haptic triggers during interactions.',
    status: 'active',
    critical: false,
  },
  {
    id: 'offline_sync',
    title: 'Local Background Sync',
    description: 'Syncs localized state snapshots back into storage files silently.',
    status: 'inactive',
    critical: false,
  },
  {
    id: 'telemetry_agent',
    title: 'Telemetry Analytics',
    description: 'Aggregates platform crash reports and performance latency benchmarks.',
    status: 'active',
    critical: false,
  },
];

const BLUE = '#5598F5';
const TEXT = '#203450';
const MUTED = '#71839D';

export default function ModulesScreen() {
  const [modules, setModules] = useState<SystemModule[]>(INITIAL_MODULES);

  const toggleModule = (id: string) => {
    setModules((prevModules) =>
      prevModules.map((mod) => {
        // Prevent disabling critical system modules
        if (mod.id === id && mod.critical) return mod;
        if (mod.id === id) {
          return {
            ...mod,
            status: mod.status === 'active' ? 'inactive' : 'active',
          };
        }
        return mod;
      })
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.brand}>BRITUME</Text>
      <Text style={styles.heading}>System Modules</Text>
      <Text style={styles.description}>
        Review and manage running expansion subsystems. Critical items cannot be deactivated.
      </Text>

      <View style={styles.list}>
        {modules.map((item) => {
          const isActive = item.status === 'active';
          
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.titleContainer}>
                  <Text style={styles.cardTitle}>{item.title}</Text>
                  {item.critical && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>REQUIRED</Text>
                    </View>
                  )}
                </View>
                <Switch
                  trackColor={{ false: '#D7E7FC', true: '#B9D5F7' }}
                  thumbColor={isActive ? BLUE : '#C9D8E9'}
                  ios_backgroundColor="#D7E7FC"
                  onValueChange={() => toggleModule(item.id)}
                  value={isActive}
                  disabled={item.critical}
                />
              </View>
              <Text style={styles.cardDescription}>{item.description}</Text>
            </View>
          );
        })}
      </View>

      <View style={styles.footerCard}>
        <Text style={styles.footerTitle}>Diagnostic Status</Text>
        <Text style={styles.footerText}>
          Environment: <Text style={styles.boldText}>Production</Text>
        </Text>
        <Text style={styles.footerText}>
          Architecture: <Text style={styles.boldText}>{Platform.OS.toUpperCase()} Native</Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F2F7FF',
  },
  content: {
    padding: 18,
    paddingBottom: 40,
  },
  brand: {
    color: '#2869C7',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 3,
  },
  heading: {
    color: TEXT,
    fontSize: 26,
    fontWeight: '900',
    marginTop: 8,
  },
  description: {
    color: MUTED,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
    marginBottom: 20,
  },
  list: {
    gap: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D7E7FC',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  cardTitle: {
    color: TEXT,
    fontSize: 15,
    fontWeight: '800',
    marginRight: 8,
  },
  badge: {
    backgroundColor: '#EAF3FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#8BB9F5',
  },
  badgeText: {
    color: '#2869C7',
    fontSize: 9,
    fontWeight: '900',
  },
  cardDescription: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
  },
  footerCard: {
    backgroundColor: '#EAF3FF',
    borderRadius: 16,
    padding: 16,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#B9D5F7',
  },
  footerTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 6,
  },
  footerText: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '700',
    color: TEXT,
  },
});
