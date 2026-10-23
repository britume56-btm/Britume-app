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
import Ionicons from 'react-native-vector-icons/Ionicons'; 
import { useAppTheme } from '../../theme/AppThemeContext';
import { createPost, listFeed, type FeedPost } from '../../services/socialService';
import { supabase } from '../../../lib/supabase';

// Brand Color Palette Alignment
const CANVAS_WHITE = '#FFFFFF'; 
const SOFT_BLUE_SURFACE = '#F3F8FF'; 
const SOFT_BLUE_BORDER = '#D6E6FB'; 
const ACCENT_GOLD = '#D4AF37'; 
const DARK_TEXT = '#1E293B';
const MUTED_TEXT = '#64748B';

// Consolidated Bottom Strip Icons (Labels removed from display layer)
const BOTTOM_NAVIGATION_ICONS = [
  { id: 'TECHNOLOGIES', icon: 'hardware-chip-outline' },
  { id: 'SOCIAL', icon: 'people-outline' },
  { id: 'STUDIOS', icon: 'film-outline' },
  { id: 'WEAR', icon: 'shirt-outline' },
  { id: 'LIVING', icon: 'home-outline' },
  { id: 'FOUNDATION', icon: 'heart-outline' },
  { id: 'TV', icon: 'tv-outline' },
];

export default function HomeScreen({ navigation }: any) {
  useAppTheme();

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [draft, setDraft] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFeed = useCallback(async () => {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUserId(data.user.id);
        const result = await listFeed(data.user.id);
        setPosts(result);
      }
    } catch {
      // Safe fallback boundary
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const toggleHidePost = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={CANVAS_WHITE} />

      {/* Top Banner Row: Custom Branding Top Left, Action Toolbar Top Right */}
      <View style={styles.vortexHeaderRow}>
        <View style={styles.brandTitleLeftContainer}>
          <TouchableOpacity onPress={() => navigation.navigate('PROFILE')} style={styles.userProfileWrapperLeft}>
            <View style={styles.crownCrownIndicator}>
              <Text style={styles.crownMiniEmoji}>👑</Text>
            </View>
            <View style={styles.goldCrownAvatarRing}>
              <Text style={styles.avatarLetter}>B</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.brandTextWordmark}>BRITUME</Text>
        </View>

        {/* High Density Sequential Toolbar Grid */}
        <View style={styles.headerRightActionsToolbar}>
          <TouchableOpacity style={styles.circleActionBtn}>
            <Ionicons name="add-outline" size={16} color={DARK_TEXT} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.circleActionBtn}>
            <Ionicons name="search-outline" size={15} color={DARK_TEXT} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.circleActionBtn}>
            <Ionicons name="notifications-outline" size={15} color={DARK_TEXT} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.circleActionBtn}>
            <Ionicons name="chatbubble-ellipses-outline" size={15} color={DARK_TEXT} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.circleActionBtn}>
            <Ionicons name="sparkles-outline" size={15} color={ACCENT_GOLD} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('SETTINGS')} style={styles.circleActionBtn}>
            <Ionicons name="settings-outline" size={15} color={DARK_TEXT} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Core Discovery Canvas Scroll Area */}
      <ScrollView
        style={styles.feedScrollArea}
        contentContainerStyle={styles.scrollCanvasContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadFeed(); }} tintColor={ACCENT_GOLD} />}
      >
        {/* Quick Status Input Panel */}
        <View style={styles.cosmicStatusInputPanel}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="What's on your mind?"
            placeholderTextColor={MUTED_TEXT}
            style={styles.statusInputBox}
          />
        </View>

        {loading ? (
          <ActivityIndicator color={ACCENT_GOLD} style={{ marginTop: 40 }} />
        ) : (
          <View style={styles.dynamicFeedGridComposer}>
            {posts.map((post, index) => {
              const isVideoSpotlight = index % 3 === 2;

              if (isVideoSpotlight) {
                return (
                  <View key={post.id} style={styles.fullWidthVideoCard}>
                    <View style={styles.videoPlayerMaskContainer}>
                      <Ionicons name="play-circle" size={40} color={ACCENT_GOLD} />
                      <Text style={styles.videoBadgeLabel}>TV & DOWNLOADS</Text>
                    </View>
                    <Text style={styles.cardContentBodyText} numberOfLines={2}>{post.body}</Text>
                    
                    {/* Full-Scale Interaction Row */}
                    <View style={styles.cardInteractiveActionRow}>
                      <TouchableOpacity style={styles.actionBtn}><Ionicons name="heart-outline" size={14} color={MUTED_TEXT} /><Text style={styles.actionBtnLabel}>Like</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn}><Ionicons name="chatbubble-outline" size={13} color={MUTED_TEXT} /><Text style={styles.actionBtnLabel}>Comment</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn}><Ionicons name="share-social-outline" size={14} color={MUTED_TEXT} /><Text style={styles.actionBtnLabel}>Share</Text></TouchableOpacity>
                      <TouchableOpacity style={styles.actionBtn}><Ionicons name="bookmark-outline" size={13} color={MUTED_TEXT} /><Text style={styles.actionBtnLabel}>Save</Text></TouchableOpacity>
                      <TouchableOpacity onPress={() => toggleHidePost(post.id)} style={styles.actionBtn}><Ionicons name="eye-off-outline" size={14} color={MUTED_TEXT} /><Text style={styles.actionBtnLabel}>Hide</Text></TouchableOpacity>
                    </View>
                  </View>
                );
              }

              // Grid Image/Text Discovery Cards
              return (
                <View key={post.id} style={styles.halfWidthGridPostCard}>
                  <View style={styles.cardImagePreviewPlaceholder}>
                    <Ionicons name="image-outline" size={24} color={MUTED_TEXT} />
                  </View>
                  <Text style={styles.cardContentBodyText} numberOfLines={2}>{post.body}</Text>
                  
                  {/* Compact Nested Micro Actions */}
                  <View style={styles.compactCardInteractiveActionRow}>
                    <TouchableOpacity style={styles.microActionBtn}><Ionicons name="heart-outline" size={12} color={ACCENT_GOLD} /></TouchableOpacity>
                    <TouchableOpacity style={styles.microActionBtn}><Ionicons name="chatbubble-outline" size={12} color={MUTED_TEXT} /></TouchableOpacity>
                    <TouchableOpacity style={styles.microActionBtn}><Ionicons name="share-social-outline" size={12} color={MUTED_TEXT} /></TouchableOpacity>
                    <TouchableOpacity style={styles.microActionBtn}><Ionicons name="bookmark-outline" size={11} color={MUTED_TEXT} /></TouchableOpacity>
                    <TouchableOpacity onPress={() => toggleHidePost(post.id)} style={styles.microActionBtn}><Ionicons name="eye-off-outline" size={12} color={MUTED_TEXT} /></TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Flat Bottom Shortcut Dock Navigation Bar - Completely Label-Free */}
      <View style={styles.bottomNavigationDockBar}>
        {BOTTOM_NAVIGATION_ICONS.map((item) => (
          <TouchableOpacity 
            key={item.id} 
            onPress={() => navigation.navigate(item.id === 'SOCIAL' ? 'Social' : 'Module', { section: item.id })}
            style={styles.bottomDockTabItem}
          >
            <Ionicons name={item.icon} size={20} color={MUTED_TEXT} />
          </TouchableOpacity>
        ))}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CANVAS_WHITE },
  feedScrollArea: { flex: 1 },
  scrollCanvasContent: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 16 },
  
  // Header Row Configurations
  vortexHeaderRow: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: SOFT_BLUE_BORDER,
    backgroundColor: CANVAS_WHITE,
  },
  brandTitleLeftContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brandTextWordmark: { color: ACCENT_GOLD, fontSize: 15, fontWeight: '900', letterSpacing: 0.8 },
  
  // Compact Top Left Micro Branding Asset
  userProfileWrapperLeft: { width: 24, height: 24, position: 'relative', marginRight: 2 },
