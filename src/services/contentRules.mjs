export const CONTENT_SECTIONS = Object.freeze([
  'TV',
  'TECHNOLOGIES',
  'STUDIOS',
  'WEAR',
  'FOUNDATION',
]);

export const OFFLINE_VIDEO_KEY_PREFIX = 'britume:offline-tv:';

export function isModuleContentSection(section) {
  return CONTENT_SECTIONS.includes(section);
}

export function isPlayableVideoUrl(url) {
  return /\.(mp4|m3u8|mov)(?:$|[?#])/i.test(url);
}

export function isOfflineVideoUrl(url) {
  return /\.mp4(?:$|[?#])/i.test(url);
}

export function validateModulePostDraft({ section, title, body, mediaUrl, priceLabel = '' }) {
  if (!isModuleContentSection(section)) {
    return 'Choose a supported BRITUME section.';
  }
  if (!title.trim() || title.trim().length > 120) {
    return 'Add a title of up to 120 characters.';
  }
  if (!body.trim() || body.trim().length > 4000) {
    return 'Add a description of up to 4,000 characters.';
  }

  const link = mediaUrl.trim();
  if (link && !/^https?:\/\/[^/\s]+/i.test(link)) {
    return 'Links must start with https:// or http://.';
  }
  if (section === 'TV' && (!link || !isPlayableVideoUrl(link))) {
    return 'Use a direct MP4, HLS (.m3u8), or MOV video link.';
  }
  if (section === 'WEAR' && priceLabel.trim().length > 50) {
    return 'Keep the price under 50 characters.';
  }
  return null;
}

export function matchesModulePost(post, query) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) {
    return true;
  }
  return `${post.title} ${post.body} ${post.price_label ?? ''}`
    .toLocaleLowerCase()
    .includes(needle);
}

export function formatStorageSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 MB';
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
