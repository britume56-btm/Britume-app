import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { launchImageLibrary, Asset } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons'; 
import { useAppTheme } from '../../theme/AppThemeContext';
import { createPost, listFeed, type FeedPost } from '../../services/socialService';
import { supabase } from '../../../lib/supabase';

const BLUE = '#1877F2'; 
const BACKGROUND_GREY = '#FFFFFF'; // Facebook uses a clean solid white canvas for headers
const SEPARATOR_GREY = '#E4E6EB';
const DARK_TEXT = '#050505';
const MUTED_TEXT = '#65676B';
const GREEN_MEDIA = '#45BD62'; 

export default function HomeScreen({ navigation }: any) {
  useAppTheme();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [draft, setDraft] = useState('');
  const [selectedMedia, setSelectedMedia] = useState<Asset | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const loadFeed = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      const user = data.user;
      if (!user) {
        setUserId(null);
        return;
      }
      setUserId(user.id);
      const result = await listFeed(user.id);
      setPosts(result);
    } catch {
      // Quietly fallback
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleSelectMedia = async () => {
    const result = await launchImageLibrary({ mediaType: 'mixed', quality: 0.8 });
    if (result.assets && result.assets.length > 0) {
      setSelectedMedia(result.assets[0]);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={BACKGROUND_GREY} />

      {/* Top Brand Bar */}
      <View style={styles.topBrandHeader}>
        <Text style={styles.brandTitleText}>facebook</Text>
        <View style={styles.rightHeaderActions}>
          <TouchableOpacity style={styles.circleActionButton}>
            <Ionicons name="add" size={22} color={DARK_TEXT} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.circleActionButton}>
            <Ionicons name="search" size={18} color={DARK_TEXT} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('SETTINGS')} style={styles.circleActionButton}>
            <Ionicons name="menu" size={20} color={DARK_TEXT} />
          </TouchableOpacity>
        </View>
      </View>

      {/* High-Density Navigation Tab Bar (Placed right under brand headers) */}
      <View style={styles.facebookTabBar}>
        <TouchableOpacity onPress={() => navigation.navigate('Social')} style={[styles.tabButton, styles.activeTab]}>
          <Ionicons name="home" size={22} color={BLUE} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Chat')} style={styles.tabButton}>
          <Ionicons name="people-outline" size={22} color={MUTED_TEXT} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabButton}>
          <Ionicons name="chatbubble-ellipses-outline" size={21} color={MUTED_TEXT} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Module', { section: 'SHOWCASE' })} style={styles.tabButton}>
          <Ionicons name="storefront-outline" size={22} color={MUTED_TEXT} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabButton}>
          <Ionicons name="notifications-outline" size={22} color={MUTED_TEXT} />
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Module', { section: 'TV_DOWNLOADS' })} style={styles.tabButton}>
          <Ionicons name="tv-outline" size={22} color={MUTED_TEXT} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollCanvas}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadFeed(false); }} tintColor={BLUE} />
        }
      >
        {/* Flat Input Status Row */}
        <View style={styles.statusComposerCard}>
          <View style={styles.avatarCircleRound} />
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="What's on your mind?"
            placeholderTextColor={MUTED_TEXT}
            style={styles.textInputBarField}
          />
          <TouchableOpacity onPress={handleSelectMedia} style={styles.inlineMediaButtonIcon}>
            <Ionicons name="images" size={22} color={GREEN_MEDIA} />
          </TouchableOpacity>
        </View>

        <View style={styles.horizontalThickDivider} />

        {/* Dense Feed Card Layout */}
        {posts.map((post) => (
          <View key={post.id} style={styles.feedBoxCard}>
            <View style={styles.feedCardHeaderRow}>
              <View style={styles.avatarCircleRoundSmall} />
              <View style={styles.authorTextContainerMetadata}>
                <Text style={styles.profileUserHeaderTitleName}>BRITUME Member</Text>
                <Text style={styles.smallDateSubtextLabel}>Just now</Text>
              </View>
            </View>
            <Text style={styles.normalFontBodyText}>{post.body}</Text>
          </View>
        ))}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#E4E6EB' }, // Light gray backdrop for feed spacing
  scrollCanvas: { paddingVertical: 0 },
  
  // Top Banner Brand Bar
  topBrandHeader: {
    height: 48,
    backgroundColor: BACKGROUND_GREY,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  brandTitleText: {
    color: BLUE,
    fontSize: 25,
    fontWeight: '800',
    letterSpacing: -1,
  },
  rightHeaderActions: {
    flexDirection: 'row',
    gap: 8,
  },
  circleActionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0F2F5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Flat Native Top Navigation Tabs
  BRITUMETabBar: {
    flexDirection: 'row',
    height: 42,
    backgroundColor: BACKGROUND_GREY,
    borderBottomWidth: 1,
    borderBottomColor: SEPARATOR_GREY,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: BLUE,
  },

  // Status Composer Area
  statusComposerCard: {
    flexDirection: 'row',
    backgroundColor: BACKGROUND_GREY,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  textInputBarField: {
    flex: 1,
    height: 36,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: SEPARATOR_GREY,
    paddingHorizontal: 16,
    fontSize: 14,
    color: DARK_TEXT,
  },
  inlineMediaButtonIcon: {
    padding: 2,
  },
  horizontalThickDivider: {
    height: 8,
    backgroundColor: '#E4E6EB',
  },

  // Clean Native Card Posts
  feedBoxCard: {
    backgroundColor: BACKGROUND_GREY,
    padding: 14,
    marginBottom: 8,
  },
  feedCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  authorTextContainerMetadata: {
    flex: 1,
  },
  profileUserHeaderTitleName: {
    fontSize: 14,
    fontWeight: '600',
    color: DARK_TEXT,
  },
  smallDateSubtextLabel: {
    fontSize: 11,
    color: MUTED_TEXT,
    marginTop: 1,
  },
  normalFontBodyText: {
    fontSize: 14,
    color: DARK_TEXT,
    lineHeight: 19,
  },
  avatarCircleRound: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E4E6EB',
  },
  avatarCircleRoundSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E4E6EB',
  },
});
