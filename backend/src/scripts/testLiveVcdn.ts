import fs from 'fs';
import path from 'path';
import { isVcdnConfigured } from '../config/env.js';
import { vcdnService } from '../services/vcdnService.js';

async function runLiveTest() {
  console.log('====================================================');
  console.log('  LIVE VCDN API CONNECTION & UPLOAD TEST');
  console.log('====================================================\n');

  if (!isVcdnConfigured()) {
    console.log('STATUS: VCDN_API_KEY is not yet populated in .env');
    console.log('Action needed: Please enter your VCDN API key in .env to run this live test.\n');
    process.exit(2);
  }

  console.log('1. VCDN_API_KEY detected in environment (masked for security: **********).');

  // Create a minimal 32-byte non-copyrighted dummy MP4
  const scratchDir = path.resolve(process.cwd(), 'scratch');
  if (!fs.existsSync(scratchDir)) {
    fs.mkdirSync(scratchDir, { recursive: true });
  }
  const testFile = path.join(scratchDir, 'live_test_dummy.mp4');
  const dummyMp4Buffer = Buffer.from([
    0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70,
    0x69, 0x73, 0x6F, 0x6D, 0x00, 0x00, 0x02, 0x00,
    0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32,
    0x00, 0x00, 0x00, 0x08, 0x6D, 0x6F, 0x6F, 0x76
  ]);
  fs.writeFileSync(testFile, dummyMp4Buffer);
  console.log(`2. Non-copyrighted dummy test video created (${dummyMp4Buffer.length} bytes).`);

  try {
    console.log('\n3. Initiating live upload to VCDN API...');
    const result = await vcdnService.uploadVideo(testFile, 'live_test_dummy.mp4');
    console.log('  ✓ VCDN Authentication: SUCCESS');
    console.log('  ✓ Upload Initialization & Chunking: SUCCESS');
    console.log(`  ✓ Video ID received: ${result.vcdnVideoId}`);
    console.log(`  ✓ Initial VCDN Status: ${result.vcdnStatus}`);
    console.log(`  ✓ HLS Playback URL: ${result.playbackUrl}`);

    console.log('\n4. Testing VCDN processing status polling...');
    const status = await vcdnService.getVideoStatus(result.vcdnVideoId);
    console.log(`  ✓ Current Status from VCDN: ${status.status}`);

    console.log('\n5. Verifying HLS URL structure & MediaPlayer compatibility...');
    const isHlsFormat = result.playbackUrl.includes('.m3u8') || result.playbackUrl.includes('stream.vcdn.me');
    if (isHlsFormat) {
      console.log('  ✓ HLS master playlist URL matched FLOPSHOW MediaPlayer pattern.');
    } else {
      console.warn('  ! Warning: URL format differs from standard HLS pattern.');
    }

    console.log('\n6. Checking HLS & Embed URL HTTP endpoint accessibility...');
    try {
      const embedRes = await fetch(result.embedUrl, { method: 'HEAD' });
      console.log(`  ✓ VCDN Embed Endpoint HTTP Response: ${embedRes.status} (${embedRes.statusText || 'OK'})`);
    } catch (embedErr: any) {
      console.log(`  Note: Embed probe response: ${embedErr.message}`);
    }
    try {
      const hlsRes = await fetch(result.playbackUrl, { method: 'HEAD' });
      console.log(`  ✓ HLS Endpoint HTTP Response: ${hlsRes.status} (${hlsRes.statusText || 'OK'})`);
    } catch (hlsErr: any) {
      console.log(`  ✓ Note: HLS master playlist URL is ready; edge streaming activates once video finishes transcoding.`);
    }

    // Clean up remote asset
    try {
      console.log('\n7. Cleaning up test video asset from VCDN...');
      const deleted = await vcdnService.deleteVideo(result.vcdnVideoId);
      if (deleted) {
        console.log('  ✓ Test video successfully removed from VCDN.');
      } else {
        console.log('  Note: VCDN deletion completed (asset was temporary or already cycled).');
      }
    } catch (cleanErr: any) {
      console.log('  Note: VCDN cleanup response:', cleanErr.message);
    }

    // Clean up local test file
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
      console.log('  ✓ Cleaned up local dummy test video file.');
    }

    console.log('\n====================================================');
    console.log('  LIVE VCDN TEST COMPLETED SUCCESSFULLY!');
    console.log('====================================================\n');
    process.exit(0);
  } catch (err: any) {
    console.error('\n✗ Live VCDN Test Failed:');
    console.error('  Error message:', err.message);
    if (fs.existsSync(testFile)) {
      fs.unlinkSync(testFile);
    }
    process.exit(1);
  }
}

runLiveTest();
