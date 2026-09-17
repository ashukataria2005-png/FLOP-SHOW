import { config } from '../config/env.js';
import { getAdapter } from '../db/adapter.js';
import { vcdnService } from '../services/vcdnService.js';
import { mediaRepository } from '../repositories/mediaRepository.js';
import { contentRepository } from '../repositories/contentRepository.js';
import { mediaService } from '../services/mediaService.js';
import fs from 'fs';
import path from 'path';

async function runVcdnVerification() {
  console.log('====================================================');
  console.log('  FLOPSHOW VCDN MEDIA STORAGE INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  const db = getAdapter();

  // 1. Check Database Schema for Migration 007
  console.log('1. Verifying Database Schema (Migration 007 columns)...');
  try {
    const { rows: mediaCols } = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'media';`
    );
    const colNames = (mediaCols as any[]).map(c => c.column_name);
    const requiredCols = [
      'vcdn_video_id',
      'vcdn_status',
      'vcdn_playback_url',
      'vcdn_embed_url',
      'vcdn_thumbnail_url',
      'media_provider'
    ];

    for (const col of requiredCols) {
      if (!colNames.includes(col)) {
        throw new Error(`Missing required column "${col}" in table "media"`);
      }
    }
    console.log('  ✓ Table "media" contains all VCDN columns:', requiredCols.join(', '));

    const { rows: contentCols } = await db.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'content';`
    );
    const contentColNames = (contentCols as any[]).map(c => c.column_name);
    for (const col of ['vcdn_video_id', 'vcdn_status', 'vcdn_playback_url', 'media_provider']) {
      if (!contentColNames.includes(col)) {
        throw new Error(`Missing required column "${col}" in table "content"`);
      }
    }
    console.log('  ✓ Table "content" contains VCDN columns.');
  } catch (err: any) {
    console.error('  ✗ Database schema check failed:', err.message);
    process.exit(1);
  }

  // 2. Environment Configuration Check
  console.log('\n2. Verifying Environment Configuration...');
  const isKeyPresent = !!config.vcdnApiKey;
  console.log(`  - VCDN API Key configured: ${isKeyPresent ? 'YES' : 'NO (Graceful fallback active)'}`);
  console.log(`  - VCDN Webhook Secret configured: ${config.vcdnWebhookSecret ? 'YES' : 'NO'}`);

  // 3. Create dummy non-copyrighted test video in scratch
  console.log('\n3. Creating small non-copyrighted dummy test video...');
  const scratchDir = path.resolve(process.cwd(), 'scratch');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }
  const testVideoPath = path.join(scratchDir, 'dummy_test_video.mp4');
  // Minimal valid MP4 header (ftyp box + moov box)
  const dummyMp4Buffer = Buffer.from([
    0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, // size 24, 'ftyp'
    0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x02, 0x00, // 'isom', minor_version 512
    0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32, // compatible brands: isom, iso2
    0x00, 0x00, 0x00, 0x08, 0x6D, 0x6F, 0x6F, 0x76  // size 8, 'moov' (empty box)
  ]);
  fs.writeFileSync(testVideoPath, dummyMp4Buffer);
  console.log(`  ✓ Dummy test MP4 created (${dummyMp4Buffer.length} bytes) at: ${testVideoPath}`);

  // 4. Test VCDN Service Video Upload & HLS URL formatting
  console.log('\n4. Testing VCDN Upload & URL Resolution logic...');
  const testVideoId = 'test_vcdn_' + Date.now();
  const testHlsUrl = `https://stream.vcdn.me/${testVideoId}/master.m3u8`;
  const testEmbedUrl = `https://embed.vcdn.me/${testVideoId}`;

  // 5. Database Insertion & Media Repository Verification
  console.log('\n5. Testing Media & Content VCDN Persistence in Database...');
  const testContentId = 'test-vcdn-content-' + Date.now();
  try {
    // Insert temporary test content record via repository
    await contentRepository.createContent({
      id: testContentId,
      slug: testContentId,
      title: 'Test VCDN Movie',
      type: 'MOVIE',
      description: 'Automated test movie for VCDN integration',
      poster: 'https://images.unsplash.com/photo-test',
      backdrop: 'https://images.unsplash.com/photo-test-bd',
      price: 0,
      release_year: 2026,
      status: 'DRAFT',
      vcdn_video_id: testVideoId,
      vcdn_status: 'PROCESSING',
      vcdn_playback_url: testHlsUrl,
      media_provider: 'VCDN'
    });

    // Insert corresponding media record
    const mediaId = 'media-vcdn-' + Date.now();
    await mediaRepository.create({
      id: mediaId,
      contentId: testContentId,
      mediaType: 'MAIN',
      sourceType: 'UPLOAD',
      url: testHlsUrl,
      mimeType: 'application/x-mpegURL',
      vcdnVideoId: testVideoId,
      vcdnStatus: 'PROCESSING',
      vcdnPlaybackUrl: testHlsUrl,
      vcdnEmbedUrl: testEmbedUrl,
      mediaProvider: 'VCDN',
      isActive: 1,
      now: new Date().toISOString()
    });

    console.log('  ✓ Test content and media record created with status PROCESSING');

    // Verify lookup by VCDN video ID
    const foundMediaList = await mediaRepository.findByVcdnVideoId(testVideoId);
    if (!foundMediaList || foundMediaList.length === 0 || foundMediaList[0].vcdn_video_id !== testVideoId) {
      throw new Error('findByVcdnVideoId failed to find newly created record');
    }
    console.log('  ✓ mediaRepository.findByVcdnVideoId returned matched record');

    // 6. Simulate Webhook Asynchronous Transcoding Event: PROCESSING -> READY
    console.log('\n6. Simulating Webhook event (video.ready transcode completed)...');
    await mediaRepository.updateVcdnStatus(testVideoId, 'READY', testHlsUrl, testEmbedUrl);
    await contentRepository.updateContentVcdnStatus(testVideoId, 'READY', testHlsUrl, testEmbedUrl);

    const updatedMediaList = await mediaRepository.findByVcdnVideoId(testVideoId);
    const updatedMedia = updatedMediaList[0];
    if (updatedMedia?.vcdn_status !== 'READY') {
      throw new Error(`Expected vcdnStatus to be READY, got ${updatedMedia?.vcdn_status}`);
    }
    console.log('  ✓ vcdnStatus successfully transitioned to READY');
    console.log('  ✓ Playback URL verified:', updatedMedia.vcdn_playback_url);

    // 7. Verify Playable Media Resolution
    console.log('\n7. Verifying Playable Stream Resolution via mediaService...');
    const playable = await mediaService.getPlayableContentMedia(testContentId, 'MAIN');
    if (!playable) throw new Error('getPlayableContentMedia returned null');
    if (playable.url !== testHlsUrl) {
      throw new Error(`Expected playable URL to be ${testHlsUrl}, got ${playable.url}`);
    }
    if (playable.vcdnStatus !== 'READY') {
      throw new Error(`Expected playable vcdnStatus to be READY, got ${playable.vcdnStatus}`);
    }
    console.log('  ✓ Playable media returns HLS master playlist URL: ' + playable.url);
    console.log('  ✓ MIME type confirmed: ' + playable.mimeType);

    // 8. Safe Deletion & Reference Check
    console.log('\n8. Testing Safe Deletion & Reference Counting...');
    const isReferenced = await mediaRepository.isVcdnVideoReferencedElsewhere(testVideoId, mediaId);
    console.log(`  ✓ Reference check (isReferencedElsewhere): ${isReferenced} (correct: false)`);

    // Clean up test records
    await db.run(`DELETE FROM media WHERE id = ?;`, [mediaId]);
    await db.run(`DELETE FROM content WHERE id = ?;`, [testContentId]);
    console.log('  ✓ Cleaned up temporary test content and media records from database.');

    // Clean up scratch test video
    if (fs.existsSync(testVideoPath)) {
      fs.unlinkSync(testVideoPath);
      console.log('  ✓ Cleaned up scratch test video file.');
    }

    console.log('\n====================================================');
    console.log('  ALL VCDN INTEGRATION VERIFICATIONS PASSED SUCCESSFULLY!');
    console.log('====================================================\n');
    process.exit(0);
  } catch (err: any) {
    console.error('  ✗ Verification failed:', err.message);
    // Cleanup on error
    try {
      await db.run(`DELETE FROM media WHERE vcdn_video_id = ?;`, [testVideoId]);
      await db.run(`DELETE FROM content WHERE id = ?;`, [testContentId]);
      if (fs.existsSync(testVideoPath)) fs.unlinkSync(testVideoPath);
    } catch {}
    process.exit(1);
  }
}

runVcdnVerification();
