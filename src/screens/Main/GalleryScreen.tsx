Writing
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import * as ImageManipulator from 'expo-image-manipulator';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VideoView, useVideoPlayer } from 'expo-video';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../navigation/types';
import { useAppTheme } from '../../theme/AppThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Gallery'>;

type GalleryItem = {
  id: string;
  uri: string;
  name: string;
  kind: 'photo' | 'video' | 'file' | 'music';
  hidden: boolean;
  source: 'device' | 'picked';
  width?: number;
  height?: number;
  duration?: number;
  mediaId?: string;
};

type Tab = 'all' | 'photos' | 'videos' | 'files' | 'music' | 'hidden';

const HIDDEN_KEY = 'britume-gallery-hidden-v1';
const ALBUM_KEY = 'britume-gallery-albums-v1';

function GalleryVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, p => {
    p.loop = false;
  });
