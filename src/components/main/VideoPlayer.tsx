'use client';
import { useState, useRef, useEffect } from 'react';
import Hls from 'hls.js';
import { PauseIcon, PlayIcon, FullscreenEnterIcon, FullscreenExitIcon, VolumeMaxIcon, VolumeMuteIcon } from './Icons';

interface VideoPlayerProps {
  streamUrl: string;
  channelName: string;
}

const VideoPlayer = ({ streamUrl, channelName }: VideoPlayerProps) => {
  const [isClient, setIsClient] = useState(false);
  const playerWrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // State for our custom controls
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (!videoRef.current || !isClient) return;

    const videoElement = videoRef.current;
    let hls: Hls | null = null;
    const proxiedUrl = `/api/proxy?url=${encodeURIComponent(streamUrl)}`;

    if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(proxiedUrl);
      hls.attachMedia(videoElement);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoElement.play().catch(() => {
          console.warn('User interaction may be needed to play video.');
        });
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('HLS.js Fatal Error:', data);
          setError('This stream could not be played. It might be offline or restricted.');
        }
      });
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // For native HLS support (like Safari)
      videoElement.src = proxiedUrl;
      videoElement.addEventListener('loadedmetadata', () => {
        videoElement.play();
      });
    }

    // Cleanup function to destroy the HLS instance when the component unmounts
    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [streamUrl, isClient]);
  
  // Functions to control the <video> element
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setPlaying(true);
      } else {
        videoRef.current.pause();
        setPlaying(false);
      }
    }
  };

  const handleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setMuted(videoRef.current.muted);
    }
  };

  const toggleFullscreen = () => {
    if (!playerWrapperRef.current) return;
    if (!document.fullscreenElement) {
      playerWrapperRef.current.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  if (!isClient) {
    return <div className="video-player"><div className="video-wrapper bg-black" /></div>;
  }
  
  return (
    <div ref={playerWrapperRef} className="video-player show-controls playing">
      <div className="video-wrapper">
        {error ? (
          <div className="w-full h-full flex items-center justify-center bg-black text-white p-4 text-center">
            <p>{error}</p>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            muted={muted}
            playsInline
            width="100%"
            height="100%"
            style={{ objectFit: 'contain' }}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
        )}
        
        {!error && (
          <>
            <div className="center-controls">
              <button className="center-play-btn" onClick={handlePlayPause}>
                {playing ? <PauseIcon /> : <PlayIcon />}
              </button>
            </div>
            <div className="top-controls">
              <div className="player-title">{channelName}</div>
              <div className="live-indicator">LIVE</div>
            </div>
            <div className="custom-controls">
              <div className="controls-bottom">
                <div className="controls-left">
                  <button className="control-button" onClick={handlePlayPause}>
                    {playing ? <PauseIcon /> : <PlayIcon />}
                  </button>
                  <button className="control-button" onClick={handleMute}>
                    {muted ? <VolumeMuteIcon /> : <VolumeMaxIcon />}
                  </button>
                </div>
                <div className="controls-right">
                  <button className="control-button" onClick={toggleFullscreen}>
                    {fullscreen ? <FullscreenExitIcon /> : <FullscreenEnterIcon />}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;
