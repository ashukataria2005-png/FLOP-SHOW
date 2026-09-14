import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  FastForward,
  ExternalLink,
  Volume2,
  VolumeX
} from 'lucide-react';
import { resolveMediaUrl } from '../../utils/mediaUrl';
import { API_BASE_URL } from '../../services/api';

export interface AdConfig {
  enabled: boolean;
  type: 'IMAGE' | 'VIDEO';
  mediaUrl: string;
  durationSeconds: number;
  skipEnabled: boolean;
  skipAfterSeconds: number;
  title?: string;
  clickUrl?: string;
}

interface AdPrerollProps {
  adConfig: AdConfig;
  onComplete: () => void;
  onClose: () => void;
}

export const AdPreroll: React.FC<AdPrerollProps> = ({
  adConfig,
  onComplete,
  onClose
}) => {
  const duration = Math.max(1, Number(adConfig.durationSeconds) || 10);
  const skipDelay = Math.max(0, Number(adConfig.skipAfterSeconds) || 0);

  const [remaining, setRemaining] = useState<number>(duration);
  const [elapsed, setElapsed] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hasFinishedRef = useRef<boolean>(false);
  const onCompleteRef = useRef(onComplete);

  // Keep latest onComplete callback ref without triggering effect re-runs
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Safe completion trigger: single-shot invocation
  const handleFinished = useCallback(() => {
    if (!hasFinishedRef.current) {
      hasFinishedRef.current = true;
      onCompleteRef.current();
    }
  }, []);

  // If no media URL or disabled, fail gracefully and start content immediately
  useEffect(() => {
    if (!adConfig.enabled || !adConfig.mediaUrl || !adConfig.mediaUrl.trim()) {
      handleFinished();
    }
  }, [adConfig.enabled, adConfig.mediaUrl, handleFinished]);

  // Stable Wall-Clock Countdown Timer
  useEffect(() => {
    if (hasFinishedRef.current) return;

    const startTime = Date.now();
    const totalDurationMs = duration * 1000;

    const timer = window.setInterval(() => {
      if (hasFinishedRef.current) {
        clearInterval(timer);
        return;
      }

      const elapsedMs = Date.now() - startTime;
      const elapsedSec = Math.floor(elapsedMs / 1000);
      const remainingSec = Math.max(0, duration - elapsedSec);

      setElapsed(elapsedSec);
      setRemaining(remainingSec);

      if (remainingSec <= 0 || elapsedMs >= totalDurationMs) {
        clearInterval(timer);
        handleFinished();
      }
    }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [duration, handleFinished]);

  const canSkip = Boolean(adConfig.skipEnabled && elapsed >= skipDelay);
  const skipCountdown = Math.max(0, skipDelay - elapsed);
  const resolvedMediaUrl = resolveMediaUrl(adConfig.mediaUrl, API_BASE_URL);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 5000,
        backgroundColor: '#07070A',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        userSelect: 'none'
      }}
    >
      {/* Top Controls Bar */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, transparent 100%)'
        }}
      >
        {/* Close / Exit Button */}
        <button
          onClick={onClose}
          title="Exit Player"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(0, 0, 0, 0.65)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            padding: '8px 14px',
            borderRadius: '8px',
            color: '#FFFFFF',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            backdropFilter: 'blur(8px)',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.65)')}
        >
          <ArrowLeft size={16} />
          <span>Exit</span>
        </button>

        {/* Ad Title & Countdown Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            padding: '8px 16px',
            borderRadius: '10px',
            border: '1px solid rgba(245, 197, 24, 0.3)',
            backdropFilter: 'blur(8px)'
          }}
        >
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.08em',
              color: 'var(--brand-gold, #F5C518)',
              textTransform: 'uppercase'
            }}
          >
            {adConfig.title || 'ADVERTISEMENT'}
          </span>
          <span style={{ fontSize: '13px', color: '#6B7280' }}>•</span>
          <span style={{ fontSize: '13px', fontWeight: 800, color: '#FFFFFF' }}>
            {remaining}s
          </span>
        </div>
      </div>

      {/* Center Media Stage */}
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        {adConfig.type === 'IMAGE' ? (
          <img
            src={resolvedMediaUrl}
            alt="Advertisement"
            style={{
              maxWidth: '90vw',
              maxHeight: '80vh',
              objectFit: 'contain',
              borderRadius: '12px',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8)'
            }}
            onError={() => {
              // Fail gracefully: if ad media fails to load, start requested content
              handleFinished();
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <video
              ref={videoRef}
              src={resolvedMediaUrl}
              autoPlay
              muted={isMuted}
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
              onError={() => {
                // Fail gracefully: if ad video fails to load or play, start content
                handleFinished();
              }}
            />

            {/* Mute/Unmute audio button for video ads */}
            <button
              onClick={() => {
                setIsMuted(prev => !prev);
                if (videoRef.current) {
                  videoRef.current.muted = !isMuted;
                }
              }}
              style={{
                position: 'absolute',
                bottom: '36px',
                left: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '8px',
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                backdropFilter: 'blur(8px)'
              }}
            >
              {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              <span>{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Bottom Bar: Action buttons & Progress */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)'
        }}
      >
        {/* Left: Sponsor clickthrough link if configured */}
        <div>
          {adConfig.clickUrl ? (
            <a
              href={adConfig.clickUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 18px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 700,
                textDecoration: 'none',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)')}
              onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)')}
            >
              <span>Visit Sponsor</span>
              <ExternalLink size={14} />
            </a>
          ) : (
            <div />
          )}
        </div>

        {/* Right: Skip Button or Countdown */}
        <div>
          {adConfig.skipEnabled && (
            <>
              {canSkip ? (
                <button
                  onClick={handleFinished}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 22px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    border: '1px solid var(--brand-gold, #F5C518)',
                    color: 'var(--brand-gold, #F5C518)',
                    fontSize: '14px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 6px 20px rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(8px)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = 'var(--brand-gold, #F5C518)';
                    e.currentTarget.style.color = '#000000';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.85)';
                    e.currentTarget.style.color = 'var(--brand-gold, #F5C518)';
                  }}
                >
                  <span>Skip Ad</span>
                  <FastForward size={16} />
                </button>
              ) : (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '10px 18px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.75)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    color: '#9CA3AF',
                    fontSize: '13px',
                    fontWeight: 700,
                    backdropFilter: 'blur(8px)'
                  }}
                >
                  <span>Skip in {skipCountdown}s</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Bottom Linear Progress Track */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '4px',
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          zIndex: 20
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(100, (elapsed / duration) * 100)}%`,
            backgroundColor: 'var(--brand-gold, #F5C518)',
            transition: 'width 1s linear'
          }}
        />
      </div>
    </div>
  );
};
