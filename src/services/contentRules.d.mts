export type ModuleSection = 'TV' | 'TECHNOLOGIES' | 'STUDIOS' | 'WEAR' | 'FOUNDATION';

export const CONTENT_SECTIONS: readonly ModuleSection[];
export const OFFLINE_VIDEO_KEY_PREFIX: string;
export function isModuleContentSection(section: string): section is ModuleSection;
export function isPlayableVideoUrl(url: string): boolean;
export function isOfflineVideoUrl(url: string): boolean;
export function validateModulePostDraft(input: {
  section: string;
  title: string;
  body: string;
  mediaUrl: string;
  priceLabel?: string;
}): string | null;
export function matchesModulePost(
  post: { title: string; body: string; price_label?: string | null },
  query: string
): boolean;
export function formatStorageSize(bytes: number): string;
