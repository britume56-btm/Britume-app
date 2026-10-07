import type { NavigatorScreenParams } from '@react-navigation/native';
import type { BRITUME_SECTIONS } from '../constants/sections';

export type MainTabParamList = {
  LIVING: undefined;
  PROFILE: undefined;
  SETTINGS: undefined;
};

type BritumeSection = (typeof BRITUME_SECTIONS)[number]['name'];

export type RootStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined;
  Module: { section: Exclude<BritumeSection, 'LIVING' | 'SETTINGS'> };
  Security: undefined;
};
