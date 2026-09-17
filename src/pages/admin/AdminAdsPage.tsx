import React, { useState, useEffect, useRef } from 'react';
import { api } from '../../services/api';
import { useApp } from '../../context/AppContext';
import {
  Megaphone,
  Save,
  Loader2,
  Play,
  Upload,
  Image as ImageIcon,
  Video as VideoIcon,
  Clock,
  FastForward,
  CheckCircle2,
  Eye,
  X,
  Trash2,
  Check
} from 'lucide-react';

interface AdminAdsPageProps {
  onNavigateTab: (tab: string, param?: string) => void;
}

export const AdminAdsPage: React.FC<AdminAdsPageProps> = () => {
  const { showToast } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Advertisement State
  const [enabled, setEnabled] = useState(false);
  const [type, setType] = useState<'IMAGE' | 'VIDEO'>('IMAGE');
  const [mediaUrl, setMediaUrl] = useState('');
  const [durationSeconds, setDurationSeconds] = useState(10);
  const [skipEnabled, setSkipEnabled] = useState(true);
  const [skipAfterSeconds, setSkipAfterSeconds] = useState(5);
  const [title, setTitle] = useState('Advertisement');
  const [clickUrl, setClickUrl] = useState('');

  // Interactive Test Simulator State
  const [isSimulating, setIsSimulating] = useState(false);
  const [simRemaining, setSimRemaining] = useState(10);
  const [simElapsed, setSimElapsed] = useState(0);
  const [simCompleted, setSimCompleted] = useState(false);
  const simTimerRef = useRef<number | null>(null);

  // Media Library State
  const [mediaLibrary, setMediaLibrary] = useState<any[]>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const urlDropdownRef = useRef<HTMLDivElement>(null);
  const [showUrlDropdown, setShowUrlDropdown] = useState(false);

  const fetchMediaLibrary = async () => {
    try {
      setLoadingLibrary(true);
      const items = await api.admin.getAdMediaLibrary();
      setMediaLibrary(items);
    } catch {
      // Ignore
    } finally {
      setLoadingLibrary(false);
    }
  };

  const fetchAdSettings = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getAdsConfig();
      if (res) {
        setEnabled(Boolean(res.enabled));
        setType(res.type === 'VIDEO' ? 'VIDEO' : 'IMAGE');
        setMediaUrl(res.mediaUrl || '');
        setDurationSeconds(Number(res.durationSeconds) || 10);
        setSkipEnabled(Boolean(res.skipEnabled));
        setSkipAfterSeconds(Number(res.skipAfterSeconds) || 5);
        setTitle(res.title || 'Advertisement');
        setClickUrl(res.clickUrl || '');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to load advertisement configuration.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdSettings();
    fetchMediaLibrary();
  }, []);

  // Close URL dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (urlDropdownRef.current && !urlDropdownRef.current.contains(e.target as Node)) {
        setShowUrlDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Handle Media File Upload via existing upload button (automatically saved to My Library)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);

    // Strictly validate media types
    if (type === 'IMAGE') {
      for (const file of fileList) {
        if (!file.type.startsWith('image/')) {
          showToast(`File "${file.name}" is not an image file. Photo/Image Advertisement accepts images only.`, 'error');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
      }
    } else {
      for (const file of fileList) {
        if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|webm|mov|m4v)$/i)) {
          showToast(`File "${file.name}" is not a video file. Video Advertisement accepts videos only.`, 'error');
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }
      }
    }

    try {
      setUploading(true);
      const res = await api.admin.uploadAdMedia(fileList, type);
      if (res.library) {
        setMediaLibrary(res.library);
      }
      if (res.added && res.added.length > 0) {
        setMediaUrl(res.added[0].url);
        showToast(
          `${fileList.length} ${type === 'IMAGE' ? 'image(s)' : 'video(s)'} uploaded and saved to My Library!`,
          'success'
        );
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to upload ad media.', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Media Item Deletion with safe handling for active ad
  const handleDeleteMedia = async (e: React.MouseEvent, id: string, name: string, itemUrl: string) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete "${name}" from My Library?`)) {
      return;
    }
    try {
      const res = await api.admin.deleteAdMedia(id);
      if (res.library) {
        setMediaLibrary(res.library);
      } else {
        setMediaLibrary(prev => prev.filter(item => item.id !== id));
      }

      // Safe handling: if deleted item is current active ad URL, clear it safely
      if (mediaUrl.trim() === itemUrl.trim()) {
        setMediaUrl('');
        showToast(`"${name}" was deleted. Active ad URL cleared safely.`, 'info');
      } else {
        showToast(`"${name}" removed from My Library.`, 'info');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to delete media item from library.', 'error');
    }
  };

  // Handle Save
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (skipEnabled && skipAfterSeconds > durationSeconds) {
      showToast('Skip delay cannot be longer than total ad duration.', 'error');
      return;
    }

    try {
      setSaving(true);
      await api.admin.updateAdsConfig({
        enabled,
        type,
        mediaUrl: mediaUrl.trim(),
        durationSeconds: Math.max(1, Number(durationSeconds)),
        skipEnabled,
        skipAfterSeconds: Math.max(0, Number(skipAfterSeconds)),
        title: title.trim(),
        clickUrl: clickUrl.trim()
      });
      showToast('Advertisement configuration saved successfully!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to save advertisement settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Simulator controls
  const startSimulation = () => {
    if (!mediaUrl.trim()) {
      showToast('Please enter an ad image or video URL before testing.', 'error');
      return;
    }
    setIsSimulating(true);
    setSimRemaining(durationSeconds);
    setSimElapsed(0);
    setSimCompleted(false);

    if (simTimerRef.current) clearInterval(simTimerRef.current);

    simTimerRef.current = window.setInterval(() => {
      setSimElapsed(prev => {
        const nextElapsed = prev + 1;
        const nextRemaining = durationSeconds - nextElapsed;
        if (nextRemaining <= 0) {
          if (simTimerRef.current) clearInterval(simTimerRef.current);
          setSimRemaining(0);
          setSimCompleted(true);
        } else {
          setSimRemaining(nextRemaining);
        }
        return nextElapsed;
      });
    }, 1000);
  };

  const closeSimulation = () => {
    if (simTimerRef.current) clearInterval(simTimerRef.current);
    setIsSimulating(false);
  };

  useEffect(() => {
    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '12px', color: '#9CA3AF' }}>
        <Loader2 className="animate-spin" size={28} style={{ color: 'var(--brand-gold, #F5C518)' }} />
        <span>Loading advertisement configuration...</span>
      </div>
    );
  }

  const canSkipNow = skipEnabled && simElapsed >= skipAfterSeconds;
  const skipCountdown = Math.max(0, skipAfterSeconds - simElapsed);
  const currentLibraryItems = mediaLibrary.filter(m => m.type === type);

  return (
    <div style={{ padding: '32px 24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: 'rgba(245, 197, 24, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--brand-gold, #F5C518)'
            }}
          >
            <Megaphone size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.02em', margin: 0 }}>
              Advertisement / Ads Control
            </h1>
            <p style={{ fontSize: '14px', color: '#9CA3AF', margin: '4px 0 0' }}>
              Configure master ad status, formats, custom durations, and skip options for pre-roll playback before movies and series episodes.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* CARD 1: MASTER TOGGLE */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface, #12121A)',
            borderRadius: '16px',
            border: enabled ? '1px solid rgba(245, 197, 24, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                Pre-roll Advertisement System
              </h2>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: enabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.15)',
                  color: enabled ? '#4ADE80' : '#F87171',
                  border: enabled ? '1px solid #22C55E' : '1px solid #EF4444'
                }}
              >
                {enabled ? 'ENABLED (ADS ACTIVE)' : 'DISABLED (ADS OFF)'}
              </span>
            </div>
            <p style={{ fontSize: '13px', color: '#9CA3AF', margin: '6px 0 0' }}>
              When enabled, the configured ad will display once before a movie or series episode starts playback.
            </p>
          </div>

          <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: '12px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: enabled ? 'var(--brand-gold, #F5C518)' : '#6B7280' }}>
              {enabled ? 'Ads ON' : 'Ads OFF'}
            </span>
            <input
              type="checkbox"
              checked={enabled}
              onChange={e => setEnabled(e.target.checked)}
              style={{
                width: '24px',
                height: '24px',
                accentColor: 'var(--brand-gold, #F5C518)',
                cursor: 'pointer'
              }}
            />
          </label>
        </div>

        {/* CARD 2: AD TYPE & MEDIA */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface, #12121A)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Advertisement Format & Media
          </h2>

          {/* Ad Type Selector: Image vs Video */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#9CA3AF', marginBottom: '8px' }}>
              Advertisement Media Type
            </label>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setType('IMAGE')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  borderRadius: '10px',
                  border: type === 'IMAGE' ? '1px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.12)',
                  backgroundColor: type === 'IMAGE' ? 'rgba(245, 197, 24, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  color: type === 'IMAGE' ? 'var(--brand-gold, #F5C518)' : '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <ImageIcon size={18} />
                <span>IMAGE Advertisement</span>
              </button>

              <button
                type="button"
                onClick={() => setType('VIDEO')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  borderRadius: '10px',
                  border: type === 'VIDEO' ? '1px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.12)',
                  backgroundColor: type === 'VIDEO' ? 'rgba(245, 197, 24, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                  color: type === 'VIDEO' ? 'var(--brand-gold, #F5C518)' : '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <VideoIcon size={18} />
                <span>VIDEO Advertisement</span>
              </button>
            </div>
          </div>

          {/* Media URL & Upload */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#9CA3AF', marginBottom: '8px' }}>
              Media Source ({type === 'IMAGE' ? 'Photo / Image URL or Upload' : 'Video URL or MP4/WebM Upload'})
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: '260px', position: 'relative' }}>
                <input
                  type="text"
                  value={mediaUrl}
                  onChange={e => setMediaUrl(e.target.value)}
                  onFocus={() => setShowUrlDropdown(true)}
                  onClick={() => setShowUrlDropdown(true)}
                  placeholder={type === 'IMAGE' ? 'https://example.com/ad-poster.jpg' : 'https://example.com/ad-spot.mp4'}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                    border: showUrlDropdown ? '1px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.15s'
                  }}
                />

                {/* Dropdown Options directly beneath URL field */}
                {showUrlDropdown && (
                  <div
                    ref={urlDropdownRef}
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      right: 0,
                      backgroundColor: '#161622',
                      borderRadius: '10px',
                      border: '1px solid var(--brand-gold, #F5C518)',
                      boxShadow: '0 12px 36px rgba(0,0,0,0.85)',
                      maxHeight: '260px',
                      overflowY: 'auto',
                      zIndex: 100,
                      padding: '8px'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 8px',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        marginBottom: '6px'
                      }}
                    >
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          color: 'var(--brand-gold, #F5C518)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em'
                        }}
                      >
                        Select from {type === 'IMAGE' ? 'Photo' : 'Video'} My Library ({currentLibraryItems.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowUrlDropdown(false)}
                        style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', padding: '2px' }}
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {currentLibraryItems.length === 0 ? (
                      <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#9CA3AF' }}>
                        No {type === 'IMAGE' ? 'photos' : 'videos'} saved in My Library yet. Click &quot;Upload Media&quot; to add.
                      </div>
                    ) : (
                      currentLibraryItems.map(item => {
                        const isSelected = mediaUrl.trim() === item.url.trim();
                        return (
                          <div
                            key={item.id}
                            onMouseDown={e => {
                              e.preventDefault();
                              setMediaUrl(item.url);
                              setShowUrlDropdown(false);
                              showToast(`Selected "${item.name}" from library.`, 'info');
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              backgroundColor: isSelected ? 'rgba(245, 197, 24, 0.15)' : 'transparent',
                              cursor: 'pointer',
                              transition: 'background-color 0.15s'
                            }}
                            onMouseEnter={e => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                            }}
                            onMouseLeave={e => {
                              if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <div
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                backgroundColor: '#000',
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              {item.type === 'IMAGE' ? (
                                <img
                                  src={item.url}
                                  alt={item.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                <VideoIcon size={18} color="var(--brand-gold, #F5C518)" />
                              )}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div
                                style={{
                                  fontSize: '13px',
                                  fontWeight: 700,
                                  color: isSelected ? 'var(--brand-gold, #F5C518)' : '#FFFFFF',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {item.name}
                              </div>
                              <div style={{ fontSize: '11px', color: '#6B7280' }}>
                                {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Permanent'}
                              </div>
                            </div>
                            {isSelected && (
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  fontSize: '11px',
                                  fontWeight: 800,
                                  color: 'var(--brand-gold, #F5C518)'
                                }}
                              >
                                <Check size={14} />
                                <span>Active</span>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={type === 'IMAGE' ? 'image/*' : 'video/*'}
                multiple
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 18px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: uploading ? 'not-allowed' : 'pointer'
                }}
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                <span>Upload Media</span>
              </button>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* MY LIBRARY (Dedicated for active ad type: IMAGE or VIDEO)                 */}
          {/* ========================================================================= */}
          <div
            style={{
              marginTop: '8px',
              padding: '16px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}
          >
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {type === 'IMAGE' ? (
                  <ImageIcon size={18} color="var(--brand-gold, #F5C518)" />
                ) : (
                  <VideoIcon size={18} color="var(--brand-gold, #F5C518)" />
                )}
                <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#FFFFFF', margin: 0 }}>
                  My Library
                </h3>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    color: '#9CA3AF'
                  }}
                >
                  {currentLibraryItems.length} {type === 'IMAGE' ? 'image(s)' : 'video(s)'} saved
                </span>
              </div>

              <span style={{ fontSize: '12px', color: '#9CA3AF' }}>
                Click any item to use as active ad • One-click selection
              </span>
            </div>

            {loadingLibrary ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#9CA3AF' }}>
                <Loader2 size={18} className="animate-spin" style={{ margin: '0 auto 6px' }} />
                <span style={{ fontSize: '12px' }}>Loading library...</span>
              </div>
            ) : currentLibraryItems.length === 0 ? (
              <div
                style={{
                  padding: '24px',
                  textAlign: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.01)',
                  borderRadius: '10px',
                  border: '1px dashed rgba(255, 255, 255, 0.1)',
                  color: '#6B7280'
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#FFFFFF', marginBottom: '4px' }}>
                  No {type === 'IMAGE' ? 'images' : 'videos'} in My Library yet
                </div>
                <div style={{ fontSize: '12px', color: '#9CA3AF' }}>
                  Upload files using the &quot;Upload Media&quot; button above. They will be permanently stored here.
                </div>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                  gap: '12px'
                }}
              >
                {currentLibraryItems.map(item => {
                  const isActive = mediaUrl.trim() === item.url.trim();
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        setMediaUrl(item.url);
                        showToast(`Selected "${item.name}" as active ${type === 'IMAGE' ? 'Photo' : 'Video'} Ad!`, 'info');
                      }}
                      style={{
                        backgroundColor: isActive ? 'rgba(245, 197, 24, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '10px',
                        border: isActive ? '2px solid var(--brand-gold, #F5C518)' : '1px solid rgba(255, 255, 255, 0.08)',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={e => {
                        if (!isActive) e.currentTarget.style.borderColor = 'rgba(245, 197, 24, 0.4)';
                      }}
                      onMouseLeave={e => {
                        if (!isActive) e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      }}
                    >
                      {/* Preview Media */}
                      <div
                        style={{
                          height: '110px',
                          backgroundColor: '#0A0A10',
                          position: 'relative',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          overflow: 'hidden'
                        }}
                      >
                        {item.type === 'IMAGE' ? (
                          <img
                            src={item.url}
                            alt={item.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : (
                          <>
                            <video
                              src={item.url}
                              preload="metadata"
                              muted
                              playsInline
                              style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                            />
                            <div
                              style={{
                                position: 'absolute',
                                inset: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'rgba(0, 0, 0, 0.3)'
                              }}
                            >
                              <div
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  backgroundColor: 'rgba(0, 0, 0, 0.65)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: 'var(--brand-gold, #F5C518)',
                                  border: '1px solid rgba(245, 197, 24, 0.4)'
                                }}
                              >
                                <Play size={14} style={{ marginLeft: '2px' }} />
                              </div>
                            </div>
                          </>
                        )}

                        {isActive && (
                          <div
                            style={{
                              position: 'absolute',
                              top: '6px',
                              left: '6px',
                              backgroundColor: 'var(--brand-gold, #F5C518)',
                              color: '#000000',
                              padding: '2px 6px',
                              borderRadius: '5px',
                              fontSize: '9.5px',
                              fontWeight: 800,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '3px',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
                              zIndex: 2
                            }}
                          >
                            <Check size={11} strokeWidth={3} />
                            <span>ACTIVE AD</span>
                          </div>
                        )}
                      </div>

                      {/* Bottom Info & Delete Button at right corner */}
                      <div
                        style={{
                          padding: '8px 10px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px'
                        }}
                      >
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              color: isActive ? 'var(--brand-gold, #F5C518)' : '#FFFFFF',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                            title={item.name}
                          >
                            {item.name}
                          </div>
                          <div style={{ fontSize: '10.5px', color: '#6B7280' }}>
                            {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : 'Permanent'}
                          </div>
                        </div>

                        {/* Delete button at the right corner */}
                        <button
                          type="button"
                          onClick={e => handleDeleteMedia(e, item.id, item.name, item.url)}
                          title="Delete from My Library"
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            color: '#EF4444',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.25)')}
                          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)')}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Ad Label & Clickthrough URL */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#9CA3AF', marginBottom: '6px' }}>
                Ad Header / Sponsor Label
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Advertisement, Sponsored, Special Offer"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, color: '#9CA3AF', marginBottom: '6px' }}>
                Optional Clickthrough URL
              </label>
              <input
                type="text"
                value={clickUrl}
                onChange={e => setClickUrl(e.target.value)}
                placeholder="https://brand-sponsor.com"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Live Preview Container */}
          {mediaUrl.trim() && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Eye size={16} color="var(--brand-gold, #F5C518)" />
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#FFFFFF' }}>Live Media Preview</span>
              </div>
              <div
                style={{
                  maxHeight: '260px',
                  maxWidth: '460px',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  backgroundColor: '#000000',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {type === 'IMAGE' ? (
                  <img
                    src={mediaUrl}
                    alt="Ad Preview"
                    style={{ maxWidth: '100%', maxHeight: '260px', objectFit: 'contain' }}
                    onError={() => showToast('Failed to load image preview from URL.', 'error')}
                  />
                ) : (
                  <video
                    src={mediaUrl}
                    controls
                    style={{ maxWidth: '100%', maxHeight: '260px' }}
                  />
                )}
              </div>
            </div>
          )}

        </div>

        {/* CARD 3: DURATION & SKIP TIMERS */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface, #12121A)',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          <h2 style={{ fontSize: '16px', fontWeight: 800, color: '#FFFFFF', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Timing & Skip Configuration
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px' }}>
            {/* Total Duration */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#9CA3AF', marginBottom: '6px' }}>
                <Clock size={16} />
                <span>Ad Duration (Seconds)</span>
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={durationSeconds}
                onChange={e => setDurationSeconds(Math.max(1, parseInt(e.target.value, 10) || 1))}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  outline: 'none'
                }}
              />
              <span style={{ fontSize: '12px', color: '#6B7280', display: 'block', marginTop: '4px' }}>
                Total time the advertisement stays on screen before content plays.
              </span>
            </div>

            {/* Skip Toggle & Delay */}
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
                <input
                  type="checkbox"
                  checked={skipEnabled}
                  onChange={e => setSkipEnabled(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--brand-gold, #F5C518)' }}
                />
                <span style={{ fontSize: '14px', fontWeight: 700, color: skipEnabled ? '#FFFFFF' : '#6B7280' }}>
                  Enable Skip Ad Button
                </span>
              </label>

              {skipEnabled && (
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#9CA3AF', marginBottom: '6px' }}>
                    <FastForward size={16} />
                    <span>Skip Available After (Seconds)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={durationSeconds}
                    value={skipAfterSeconds}
                    onChange={e => setSkipAfterSeconds(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.12)',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                  <span style={{ fontSize: '12px', color: '#6B7280', display: 'block', marginTop: '4px' }}>
                    User must watch this many seconds before the Skip Ad button unlocks.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CARD 4: SIMULATOR & ACTIONS */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <button
            type="button"
            onClick={startSimulation}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            <Play size={16} color="var(--brand-gold, #F5C518)" />
            <span>Launch Interactive Simulator</span>
          </button>

          <button
            type="submit"
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 28px',
              borderRadius: '10px',
              backgroundColor: 'var(--brand-gold, #F5C518)',
              border: 'none',
              color: '#000000',
              fontSize: '15px',
              fontWeight: 800,
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            <span>Save Advertisement Settings</span>
          </button>
        </div>
      </form>

      {/* INTERACTIVE TEST SIMULATOR MODAL */}
      {isSimulating && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 4000,
            backgroundColor: 'rgba(0, 0, 0, 0.88)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px'
          }}
        >
          <div
            style={{
              maxWidth: '720px',
              width: '100%',
              backgroundColor: '#0E0E14',
              borderRadius: '20px',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              overflow: 'hidden',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.9)',
              position: 'relative'
            }}
          >
            {/* Top Bar with close */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                backgroundColor: 'rgba(255, 255, 255, 0.03)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 800,
                    padding: '3px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(245, 197, 24, 0.2)',
                    color: 'var(--brand-gold, #F5C518)'
                  }}
                >
                  SIMULATOR
                </span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#FFFFFF' }}>
                  {title} • {simRemaining}s remaining
                </span>
              </div>

              <button
                onClick={closeSimulation}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#9CA3AF',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Simulated Player Stage */}
            <div
              style={{
                height: '380px',
                position: 'relative',
                backgroundColor: '#000000',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden'
              }}
            >
              {simCompleted ? (
                <div style={{ textAlign: 'center', padding: '24px' }}>
                  <CheckCircle2 size={48} color="#4ADE80" style={{ margin: '0 auto 12px' }} />
                  <h3 style={{ fontSize: '20px', fontWeight: 800, color: '#FFFFFF', margin: '0 0 6px' }}>
                    Ad Finished!
                  </h3>
                  <p style={{ fontSize: '14px', color: '#9CA3AF', margin: '0 0 16px' }}>
                    Movie / Episode video playback starts immediately now.
                  </p>
                  <button
                    onClick={startSimulation}
                    style={{
                      padding: '8px 18px',
                      borderRadius: '8px',
                      backgroundColor: 'var(--brand-gold, #F5C518)',
                      border: 'none',
                      color: '#000000',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Test Again
                  </button>
                </div>
              ) : (
                <>
                  {type === 'IMAGE' ? (
                    <img
                      src={mediaUrl}
                      alt="Simulator Ad"
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      onError={() => {
                        showToast('Simulator: unable to load image URL.', 'error');
                      }}
                    />
                  ) : (
                    <video
                      src={mediaUrl}
                      autoPlay
                      muted
                      playsInline
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                  )}

                  {/* Top Ad Badge */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '16px',
                      left: '16px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      backgroundColor: 'rgba(0, 0, 0, 0.75)',
                      backdropFilter: 'blur(8px)',
                      color: '#FFFFFF',
                      fontSize: '12px',
                      fontWeight: 800,
                      border: '1px solid rgba(255, 255, 255, 0.15)'
                    }}
                  >
                    <span>{title} • {simRemaining}s</span>
                  </div>

                  {/* Bottom Skip Button */}
                  {skipEnabled && (
                    <div style={{ position: 'absolute', bottom: '16px', right: '16px' }}>
                      {canSkipNow ? (
                        <button
                          onClick={() => {
                            if (simTimerRef.current) clearInterval(simTimerRef.current);
                            setSimCompleted(true);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '10px 18px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(0, 0, 0, 0.85)',
                            border: '1px solid var(--brand-gold, #F5C518)',
                            color: 'var(--brand-gold, #F5C518)',
                            fontSize: '14px',
                            fontWeight: 800,
                            cursor: 'pointer',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                          }}
                        >
                          <span>Skip Ad</span>
                          <FastForward size={16} />
                        </button>
                      ) : (
                        <div
                          style={{
                            padding: '8px 14px',
                            borderRadius: '8px',
                            backgroundColor: 'rgba(0, 0, 0, 0.75)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            color: '#9CA3AF',
                            fontSize: '12px',
                            fontWeight: 700
                          }}
                        >
                          Skip in {skipCountdown}s
                        </div>
                      )}
                    </div>
                  )}

                  {/* Bottom Progress Bar */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: '4px',
                      backgroundColor: 'rgba(255, 255, 255, 0.15)'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${Math.min(100, (simElapsed / durationSeconds) * 100)}%`,
                        backgroundColor: 'var(--brand-gold, #F5C518)',
                        transition: 'width 1s linear'
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
