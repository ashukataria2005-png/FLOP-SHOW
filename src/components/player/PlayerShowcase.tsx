import React, { useState, useEffect } from 'react';
import { MediaItem, MEDIA_TABLE_SQL_SCHEMA } from '../../types/mediaPlayer';
import { MOCK_MEDIA_CATALOG } from '../../data/mockMediaCatalog';
import { MediaPlayerContainer } from './core/MediaPlayerContainer';
import { mediaPlayerService } from '../../services/mediaPlayerService';
import {
  Tv,
  Layers,
  Sparkles,
  Code2,
  Database,
  Volume2,
  Clock,
  PlayCircle,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';

interface PlayerShowcaseProps {
  onBackToApp?: () => void;
}

export const PlayerShowcase: React.FC<PlayerShowcaseProps> = ({ onBackToApp }) => {
  // Read current URL param or default to first mock stream
  const [selectedMedia, setSelectedMedia] = useState<MediaItem>(() => {
    const urlId = mediaPlayerService.getMediaIdFromUrl();
    if (urlId) {
      const match = MOCK_MEDIA_CATALOG.find(m => m.id === urlId);
      if (match) return match;
    }
    return MOCK_MEDIA_CATALOG[0];
  });

  const [playerVariant, setPlayerVariant] = useState<'inline-frame' | 'fullscreen-overlay'>('inline-frame');
  const [activeTab, setActiveTab] = useState<'live' | 'data-contract' | 'sql-schema'>('live');
  const [savedVolume, setSavedVolume] = useState<number>(() => mediaPlayerService.getSavedVolume());
  const [savedResumeTime, setSavedResumeTime] = useState<number>(0);

  // Poll localStorage values for the diagnostics HUD
  useEffect(() => {
    const updateStats = () => {
      setSavedVolume(mediaPlayerService.getSavedVolume());
      setSavedResumeTime(mediaPlayerService.getResumeTimestamp(selectedMedia.id));
    };

    updateStats();
    const interval = setInterval(updateStats, 1500);
    return () => clearInterval(interval);
  }, [selectedMedia.id]);

  const handleSelectStream = (item: MediaItem) => {
    setSelectedMedia(item);
    mediaPlayerService.updateUrlParam(item.id);
  };

  const handleClearResume = () => {
    mediaPlayerService.clearResumeTimestamp(selectedMedia.id);
    setSavedResumeTime(0);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#07090E',
        color: '#FFFFFF',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        paddingBottom: '80px'
      }}
    >
      {/* Top Banner Navigation */}
      <header
        style={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          backgroundColor: 'rgba(11, 14, 23, 0.95)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          padding: '14px 24px'
        }}
      >
        <div
          style={{
            maxWidth: '1400px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'rgba(245, 197, 24, 0.15)',
                border: '1px solid var(--brand-gold, #F5C518)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--brand-gold, #F5C518)'
              }}
            >
              <Tv size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
                  Modular OTT Media Player
                </h1>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: 'rgba(245, 197, 24, 0.2)',
                    color: 'var(--brand-gold, #F5C518)',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    border: '1px solid rgba(245, 197, 24, 0.3)'
                  }}
                >
                  v2.0 Production Ready
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary, #9CA3AF)', margin: 0 }}>
                Dynamic HLS adaptive streaming, direct MP4, and sandboxed iframe architecture
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {onBackToApp && (
              <button
                onClick={onBackToApp}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <span>Back to App</span>
              </button>
            )}

            <button
              onClick={() => setPlayerVariant(playerVariant === 'inline-frame' ? 'fullscreen-overlay' : 'inline-frame')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: 'var(--brand-gold, #F5C518)',
                border: 'none',
                color: '#0E0E12',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <PlayCircle size={16} />
              <span>{playerVariant === 'inline-frame' ? 'Launch Fullscreen Overlay' : 'Switch to Inline View'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {/* Stream Type Filter Selector */}
        <section style={{ marginBottom: '24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
              flexWrap: 'wrap',
              gap: '8px'
            }}
          >
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-secondary, #9CA3AF)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Select Demonstration Stream (Dynamic Switching)
            </span>
            <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
              URL Param: <code style={{ color: 'var(--brand-gold, #F5C518)' }}>?id={selectedMedia.id}</code>
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '10px'
            }}
          >
            {MOCK_MEDIA_CATALOG.map((item) => {
              const isSelected = item.id === selectedMedia.id;
              const typeBadgeColor = {
                hls: '#F5C518',
                direct: '#10B981',
                embed: '#3B82F6'
              }[item.stream_type];

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectStream(item)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: '10px',
                    backgroundColor: isSelected ? 'rgba(245, 197, 24, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                    border: isSelected ? '1px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.08)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        color: typeBadgeColor,
                        textTransform: 'uppercase',
                        backgroundColor: `${typeBadgeColor}18`,
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}
                    >
                      {item.stream_type.toUpperCase()}
                    </span>
                    {isSelected && <CheckCircle2 size={15} color="var(--brand-gold, #F5C518)" />}
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.title}
                  </div>
                  <div style={{ fontSize: '11px', color: '#9CA3AF' }}>
                    {item.category || item.badge}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Video Player Display Container */}
        <section
          style={{
            marginBottom: '32px',
            backgroundColor: '#05070A',
            borderRadius: '20px',
            padding: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.8)'
          }}
        >
          <MediaPlayerContainer
            media={selectedMedia}
            variant={playerVariant}
            onClose={() => setPlayerVariant('inline-frame')}
            enableUrlSync={true}
          />
        </section>

        {/* Diagnostic HUD & Persistence Inspector */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '16px',
            marginBottom: '32px'
          }}
        >
          {/* Engine Status Card */}
          <div
            style={{
              padding: '18px 20px',
              backgroundColor: 'rgba(15, 18, 28, 0.8)',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--brand-gold, #F5C518)' }}>
              <Layers size={18} />
              <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Active Playback Engine
              </span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', marginBottom: '4px' }}>
              {selectedMedia.stream_type === 'hls'
                ? 'Hls.js Adaptive Bitrate'
                : selectedMedia.stream_type === 'direct'
                ? 'HTML5 Progressive Engine'
                : 'Sandboxed 16:9 Iframe'}
            </div>
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>
              {selectedMedia.stream_type === 'hls'
                ? 'Supports multi-bitrate .m3u8 playlists with automatic bandwidth adaptation.'
                : selectedMedia.stream_type === 'direct'
                ? 'Supports native hardware decode for .mp4 / .webm containers.'
                : 'Isolated cross-origin iframe with autoplay and picture-in-picture permissions.'}
            </p>
          </div>

          {/* LocalStorage Volume Card */}
          <div
            style={{
              padding: '18px 20px',
              backgroundColor: 'rgba(15, 18, 28, 0.8)',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#10B981' }}>
              <Volume2 size={18} />
              <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Volume Persistence
              </span>
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', marginBottom: '4px' }}>
              {Math.round(savedVolume * 100)}%
            </div>
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>
              Persisted in <code style={{ color: '#10B981' }}>localStorage['ott_player_volume']</code> across all tabs & sessions.
            </p>
          </div>

          {/* LocalStorage Resume Timestamp Card */}
          <div
            style={{
              padding: '18px 20px',
              backgroundColor: 'rgba(15, 18, 28, 0.8)',
              borderRadius: '14px',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#3B82F6' }}>
                <Clock size={18} />
                <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Resume Point
                </span>
              </div>
              {savedResumeTime > 0 && (
                <button
                  onClick={handleClearResume}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#EF4444',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Clear resume timestamp"
                >
                  <RotateCcw size={12} />
                  <span>Reset</span>
                </button>
              )}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', marginBottom: '4px' }}>
              {savedResumeTime > 0 ? `${Math.round(savedResumeTime)} seconds` : 'At beginning (0s)'}
            </div>
            <p style={{ fontSize: '12px', color: '#9CA3AF', margin: 0 }}>
              Key: <code style={{ color: '#3B82F6' }}>localStorage['ott_player_resume_{selectedMedia.id}']</code>
            </p>
          </div>
        </section>

        {/* Code & Schema Tabs */}
        <section
          style={{
            backgroundColor: 'rgba(11, 14, 23, 0.8)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            overflow: 'hidden'
          }}
        >
          {/* Tab Headers */}
          <div
            style={{
              display: 'flex',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '8px 16px',
              backgroundColor: 'rgba(15, 18, 28, 0.6)',
              gap: '12px'
            }}
          >
            <button
              onClick={() => setActiveTab('live')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'live' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: activeTab === 'live' ? 'var(--brand-gold, #F5C518)' : '#9CA3AF',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Sparkles size={15} />
              <span>Architecture & Setup</span>
            </button>
            <button
              onClick={() => setActiveTab('data-contract')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'data-contract' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: activeTab === 'data-contract' ? 'var(--brand-gold, #F5C518)' : '#9CA3AF',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Code2 size={15} />
              <span>Active JSON Payload</span>
            </button>
            <button
              onClick={() => setActiveTab('sql-schema')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'sql-schema' ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
                color: activeTab === 'sql-schema' ? 'var(--brand-gold, #F5C518)' : '#9CA3AF',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Database size={15} />
              <span>Database SQL Model</span>
            </button>
          </div>

          {/* Tab Body */}
          <div style={{ padding: '24px' }}>
            {activeTab === 'live' && (
              <div style={{ lineHeight: 1.6, fontSize: '14px', color: '#D1D5DB' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#FFFFFF', marginTop: 0 }}>
                  Zero-Friction Integration Surface
                </h3>
                <p>
                  Pointing the player to new video sources requires updating only <strong>2–3 configuration values</strong>:
                </p>
                <div
                  style={{
                    backgroundColor: '#090B10',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    color: '#E5E7EB',
                    marginBottom: '16px'
                  }}
                >
                  <span style={{ color: '#9CA3AF' }}>// Minimal Integration Example:</span>
                  <br />
                  &lt;<span style={{ color: 'var(--brand-gold, #F5C518)' }}>MediaPlayerContainer</span>
                  <br />
                  &nbsp;&nbsp;media=&#123;&#123;
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;id: <span style={{ color: '#10B981' }}>"content-101"</span>,
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;title: <span style={{ color: '#10B981' }}>"Featured Premiere"</span>,
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;stream_type: <span style={{ color: '#F59E0B' }}>"hls"</span>, <span style={{ color: '#6B7280' }}>// or "direct" | "embed"</span>
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;source_url: <span style={{ color: '#3B82F6' }}>"https://cdn.example.com/master.m3u8"</span>,
                  <br />
                  &nbsp;&nbsp;&nbsp;&nbsp;poster_url: <span style={{ color: '#3B82F6' }}>"https://cdn.example.com/poster.jpg"</span>
                  <br />
                  &nbsp;&nbsp;&#125;&#125;
                  <br />
                  /&gt;
                </div>
                <p>
                  The engine will automatically mount the correct playback architecture without requiring any changes to the surrounding OTT layout, navigation, or parent page.
                </p>
              </div>
            )}

            {activeTab === 'data-contract' && (
              <pre
                style={{
                  backgroundColor: '#090B10',
                  padding: '18px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  overflowX: 'auto',
                  fontSize: '13px',
                  color: '#A7F3D0',
                  margin: 0
                }}
              >
                {JSON.stringify(selectedMedia, null, 2)}
              </pre>
            )}

            {activeTab === 'sql-schema' && (
              <pre
                style={{
                  backgroundColor: '#090B10',
                  padding: '18px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  overflowX: 'auto',
                  fontSize: '13px',
                  color: '#93C5FD',
                  margin: 0
                }}
              >
                {MEDIA_TABLE_SQL_SCHEMA}
              </pre>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};
