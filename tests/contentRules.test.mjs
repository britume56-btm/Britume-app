import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CONTENT_SECTIONS,
  formatStorageSize,
  isModuleContentSection,
  isOfflineVideoUrl,
  isPlayableVideoUrl,
  matchesModulePost,
  validateModulePostDraft,
} from '../src/services/contentRules.mjs';

test('only the five upgraded content areas accept community posts', () => {
  assert.deepEqual(CONTENT_SECTIONS, ['TV', 'TECHNOLOGIES', 'STUDIOS', 'WEAR', 'FOUNDATION']);
  for (const section of CONTENT_SECTIONS) {
    assert.equal(isModuleContentSection(section), true);
  }
  assert.equal(isModuleContentSection('GAMES'), false);
  assert.equal(isModuleContentSection('SETTINGS'), false);
});

test('post drafts require a title and description within database limits', () => {
  assert.match(
    validateModulePostDraft({
      section: 'STUDIOS',
      title: '  ',
      body: 'An update',
      mediaUrl: '',
    }),
    /title/
  );
  assert.match(
    validateModulePostDraft({
      section: 'TECHNOLOGIES',
      title: 'Update',
      body: '  ',
      mediaUrl: '',
    }),
    /description/
  );
  assert.match(
    validateModulePostDraft({
      section: 'TECHNOLOGIES',
      title: 'x'.repeat(121),
      body: 'Update',
      mediaUrl: '',
    }),
    /title/
  );
});

test('TV posts accept direct video streams, not regular web pages', () => {
  const base = { section: 'TV', title: 'Short film', body: 'Watch this clip', priceLabel: '' };
  assert.match(validateModulePostDraft({ ...base, mediaUrl: '' }), /direct MP4/);
  assert.match(
    validateModulePostDraft({ ...base, mediaUrl: 'https://video.example/watch/123' }),
    /direct MP4/
  );
  assert.equal(
    validateModulePostDraft({ ...base, mediaUrl: 'https://video.example/clip.mp4?download=1' }),
    null
  );
  assert.equal(
    validateModulePostDraft({ ...base, mediaUrl: 'https://video.example/stream.m3u8' }),
    null
  );
});

test('content links must use HTTP or HTTPS', () => {
  assert.match(
    validateModulePostDraft({
      section: 'WEAR',
      title: 'Jacket',
      body: 'New collection',
      mediaUrl: 'javascript:alert(1)',
    }),
    /https/
  );
  assert.equal(
    validateModulePostDraft({
      section: 'WEAR',
      title: 'Jacket',
      body: 'New collection',
      mediaUrl: 'https://shop.example/jacket',
      priceLabel: 'P 750',
    }),
    null
  );
});

test('TV playback supports MP4, HLS and MOV while offline downloads stay MP4-only', () => {
  assert.equal(isPlayableVideoUrl('https://cdn.example/clip.MP4'), true);
  assert.equal(isPlayableVideoUrl('https://cdn.example/live.m3u8?token=ok'), true);
  assert.equal(isPlayableVideoUrl('https://cdn.example/clip.mov'), true);
  assert.equal(isPlayableVideoUrl('https://example.com/watch'), false);
  assert.equal(isOfflineVideoUrl('https://cdn.example/clip.mp4?token=ok'), true);
  assert.equal(isOfflineVideoUrl('https://cdn.example/live.m3u8'), false);
});

test('section search is case-insensitive and includes the product price', () => {
  const product = { title: 'Denim Jacket', body: 'Cotton blend', price_label: 'P 750' };
  assert.equal(matchesModulePost(product, 'denim'), true);
  assert.equal(matchesModulePost(product, 'P 750'), true);
  assert.equal(matchesModulePost(product, 'silk'), false);
  assert.equal(matchesModulePost(product, '  '), true);
});

test('offline storage size is displayed in readable units', () => {
  assert.equal(formatStorageSize(0), '0 MB');
  assert.equal(formatStorageSize(1024), '1.0 KB');
  assert.equal(formatStorageSize(1024 * 1024 * 2.5), '2.5 MB');
});
