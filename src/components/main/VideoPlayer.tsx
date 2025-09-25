// /src/components/main/VideoPlayer.tsx
'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { 
  PauseIcon, 
  PlayIcon, 
  FullscreenEnterIcon, 
  FullscreenExitIcon, 
  VolumeMaxIcon, 
  VolumeMuteIcon, 
  RotateIcon,
  PipIcon,
  SettingsIcon,
  CheckIcon
} from './Icons';

interface VideoPlayerProps {
  streamUrl: string;
  channelName: string;
  authCookie?: string;
  isM3UPlaylist?: boolean;
}

interface QualityLevel {
  height: number;
  level: number;
  bitrate: number;
}

const VideoPlayer = ({ 
  streamUrl, 
  channelName, 
  authCookie,
  isM3UPlaylist 
}: VideoPlayerProps) => {
  const [isClient, setIsClient] = useState(false);
  const playerWrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [pip, setPip] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showQuality, setShowQuality] = useState(false);
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1);
  const [isLive, setIsLive] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => setIsClient(true), []);

  // Controls visibility logic
  useEffect(() => {
    const playerElement = playerWrapperRef.current;
    if (!playerElement) return;

    const hideControls = () => {
      if (!showSettings && !showQuality) {
        setShowControls(false);
      }
    };

    const showControlsTemporarily = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (!showSettings && !showQuality) {
        controlsTimeoutRef.current = setTimeout(hideControls, 3000);
      }
    };

    const handleMouseMove = () => {
      showControlsTemporarily();
    };

    const handleMouseLeave = () => {
      if (!showSettings && !showQuality) {
        hideControls();
      }
    };

    // Initial timeout to hide controls
    controlsTimeoutRef.current = setTimeout(hideControls, 3000);

    playerElement.addEventListener('mousemove', handleMouseMove);
    playerElement.addEventListener('mouseenter', handleMouseMove);
    playerElement.addEventListener('mouseleave', handleMouseLeave);
    playerElement.addEventListener('touchstart', handleMouseMove);

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      playerElement.removeEventListener('mousemove', handleMouseMove);
      playerElement.removeEventListener('mouseenter', handleMouseMove);
      playerElement.removeEventListener('mouseleave', handleMouseLeave);
      playerElement.removeEventListener('touchstart', handleMouseMove);
    };
  }, [showControls, showSettings, showQuality]);

  // Update time and buffer
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration);
      
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const bufferedAmount = (bufferedEnd / video.duration) * 100;
        setBuffered(bufferedAmount);
      }
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateTime);
    video.addEventListener('progress', updateTime);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateTime);
      video.removeEventListener('progress', updateTime);
    };
  }, []);

  const initializePlayer = useCallback(() => {
    if (!videoRef.current || !isClient) return;

    const videoElement = videoRef.current;
    
    // Always use proxy to avoid CORS issues
    let finalUrl = `/api/proxy?url=${encodeURIComponent(streamUrl)}`;
    if (authCookie) {
      finalUrl += `&cookie=${encodeURIComponent(authCookie)}`;
    }

    console.log('Initializing player with proxied URL');

    setError(null);
    setIsLoading(true);

    // Clean up previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    videoElement.src = '';
    videoElement.load();

    const isHLSStream = streamUrl.toLowerCase().includes('.m3u8') || 
                       streamUrl.toLowerCase().includes('.m3u') || 
                       isM3UPlaylist;

    if (isHLSStream) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          debug: false,
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 600,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,
          highBufferWatchdogPeriod: 2,
          nudgeOffset: 0.1,
          nudgeMaxRetry: 3,
          maxFragLookUpTolerance: 0.25,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: Infinity,
          liveDurationInfinity: true,
          preferManagedMediaSource: true,
        });

        hlsRef.current = hls;
        
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS Error:', data);
          
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                setError('Network error: Unable to load the stream.');
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.error('Fatal media error, trying to recover');
                hls.recoverMediaError();
                break;
              default:
                setError('An error occurred while loading the stream.');
                hls.destroy();
                break;
            }
            setIsLoading(false);
          }
        });

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          console.log('Manifest parsed successfully');
          setIsLoading(false);
          
          const levels = hls.levels.map((level, index) => ({
            height: level.height,
            level: index,
            bitrate: level.bitrate
          }));
          setQualityLevels(levels);
          setCurrentQuality(hls.currentLevel);
          setIsLive(data.levels[0]?.details?.live !== false);
          
          videoElement.play().then(() => {
            setPlaying(true);
          }).catch(e => {
            console.warn('Autoplay prevented:', e);
            setPlaying(false);
          });
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
          setCurrentQuality(data.level);
        });

        hls.loadSource(finalUrl);
        hls.attachMedia(videoElement);

      } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        console.log('Using native HLS support');
        videoElement.src = finalUrl;
        videoElement.addEventListener('loadedmetadata', () => {
          setIsLoading(false);
          videoElement.play().then(() => {
            setPlaying(true);
          }).catch(e => {
            console.warn('Autoplay prevented:', e);
            setPlaying(false);
          });
        });
      }
    } else {
      // Direct stream (non-HLS)
      console.log('Using direct video playback');
      videoElement.src = finalUrl;
      videoElement.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        videoElement.play().then(() => {
          setPlaying(true);
        }).catch(e => {
          console.warn('Autoplay prevented:', e);
          setPlaying(false);
        });
      });
    }

    const handleError = (e: Event) => {
      console.error('Video error:', e);
      setError('Unable to play this stream. It might be offline or unavailable.');
      setIsLoading(false);
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => setIsLoading(false);
    const onCanPlay = () => setIsLoading(false);

    videoElement.addEventListener('error', handleError);
    videoElement.addEventListener('play', onPlay);
    videoElement.addEventListener('pause', onPause);
    videoElement.addEventListener('waiting', onWaiting);
    videoElement.addEventListener('playing', onPlaying);
    videoElement.addEventListener('canplay', onCanPlay);

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      videoElement.removeEventListener('error', handleError);
      videoElement.removeEventListener('play', onPlay);
      videoElement.removeEventListener('pause', onPause);
      videoElement.removeEventListener('waiting', onWaiting);
      videoElement.removeEventListener('playing', onPlaying);
      videoElement.removeEventListener('canplay', onCanPlay);
    };
  }, [streamUrl, authCookie, isClient, isM3UPlaylist]);

  useEffect(() => {
    const cleanup = initializePlayer();
    return () => {
      cleanup?.();
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [initializePlayer]);

  const handleRetry = () => {
    initializePlayer();
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().catch(console.error);
      } else {
        videoRef.current.pause();
      }
    }
  };

  const handleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setMuted(videoRef.current.muted);
    }
  };

  const toggleFullscreen = async () => {
    if (!playerWrapperRef.current) return;
    
    try {
      if (!document.fullscreenElement) {
        await playerWrapperRef.current.requestFullscreen();
        try {
          // @ts-ignore
          if (screen.orientation && typeof screen.orientation.lock === 'function') {
            // @ts-ignore
            await screen.orientation.lock('landscape');
          }
        } catch (e) {
          console.log('Orientation lock not supported');
        }
        setFullscreen(true);
      } else {
        await document.exitFullscreen();
        try {
          // @ts-ignore
          if (screen.orientation && typeof screen.orientation.unlock === 'function') {
            // @ts-ignore
            screen.orientation.unlock();
          }
        } catch (e) {
          console.log('Orientation unlock not supported');
        }
        setFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setPip(false);
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
        setPip(true);
      }
    } catch (error) {
      console.error('PiP error:', error);
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !videoRef.current || isLive) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const newTime = pos * duration;
    
    videoRef.current.currentTime = newTime;
  };

  const handleQualityChange = (level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
      setCurrentQuality(level);
      setShowQuality(false);
      setShowSettings(false);
    }
  };

  const toggleSettings = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowSettings(!showSettings);
    setShowQuality(false);
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getQualityLabel = (level: QualityLevel): string => {
    if (level.height >= 2160) return '4K';
    if (level.height >= 1440) return '1440p';
    if (level.height >= 1080) return '1080p';
    if (level.height >= 720) return '720p';
    if (level.height >= 480) return '480p';
    if (level.height >= 360) return '360p';
    return `${level.height}p`;
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };

    const handlePiPChange = () => {
      setPip(!!document.pictureInPictureElement);
    };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('enterpictureinpicture', handlePiPChange);
    document.addEventListener('leavepictureinpicture', handlePiPChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('enterpictureinpicture', handlePiPChange);
      document.removeEventListener('leavepictureinpicture', handlePiPChange);
    };
  }, []);

  if (!isClient) {
    return <div className="video-player"><div className="video-wrapper bg-black" /></div>;
  }
  
  return (
    <div 
      ref={playerWrapperRef} 
      className={`video-player ${showControls ? 'show-controls' : ''} ${playing ? 'playing' : 'paused'} ${pip ? 'pip-active' : ''}`}
      onDoubleClick={toggleFullscreen}
    >
      <div className="video-wrapper">
        {error ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white p-4 text-center">
            <div className="max-w-md">
              <h3 className="text-xl font-semibold mb-2">Stream Error</h3>
              <p className="mb-4 text-sm">{error}</p>
              <button onClick={handleRetry} className="play-btn flex items-center gap-2">
                <RotateIcon size={18} /> Retry
              </button>
            </div>
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
            crossOrigin="anonymous"
          />
        )}
        
        {isLoading && !error && (
          <div className="player-loading-indicator show">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading stream...</div>
          </div>
        )}

        {/* Center play button - follows inactivity rules */}
        {!error && (
          <div className="center-controls">
            <button 
              className="center-play-btn" 
              onClick={handlePlayPause}
            >
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
          </div>
        )}
        
        {!error && (
          <>
            <div className="top-controls">
              <div className="player-title">{channelName}</div>
              {isLive && <div className="live-indicator">LIVE</div>}
            </div>
            
            <div className="custom-controls">
              {/* Progress bar - only show for non-live content */}
              {!isLive && (
                <div 
                  ref={progressRef}
                  className="progress-container"
                  onClick={handleSeek}
                >
                  <div 
                    className="progress-buffered" 
                    style={{ width: `${buffered}%` }}
                  />
                  <div 
                    className="progress-bar" 
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
              )}
              
              <div className="controls-bottom">
                <div className="controls-left">
                  <button className="control-button" onClick={handlePlayPause}>
                    {playing ? <PauseIcon /> : <PlayIcon />}
                  </button>
                  <button className="control-button" onClick={handleMute}>
                    {muted ? <VolumeMuteIcon /> : <VolumeMaxIcon />}
                  </button>
                  {!isLive && (
                    <div className="time-display">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </div>
                  )}
                </div>
                
                <div className="controls-right">
                  {/* Settings button - only show when quality levels are available */}
                  {qualityLevels.length > 0 && (
                    <div className="relative">
                      <button 
                        className={`control-button ${showSettings ? 'active' : ''}`}
                        onClick={toggleSettings}
                      >
                        <SettingsIcon />
                      </button>
                      
                      {/* Settings menu */}
                      {showSettings && (
                        <div className="quality-menu" style={{ display: 'block' }}>
                          <div className="quality-menu-header">Settings</div>
                          
                          {/* Quality option */}
                          <div 
                            className="quality-option"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowQuality(!showQuality);
                            }}
                          >
                            <span>Quality</span>
                            <span className="text-xs">
                              {currentQuality === -1 ? 'Auto' : getQualityLabel(qualityLevels[currentQuality])}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Quality submenu */}
                      {showQuality && (
                        <div className="quality-menu" style={{ display: 'block', right: '160px' }}>
                          <div className="quality-menu-header">Quality</div>
                          <div 
                            className={`quality-option ${currentQuality === -1 ? 'active' : ''}`}
                            onClick={() => handleQualityChange(-1)}
                          >
                            <span>Auto</span>
                            {currentQuality === -1 && <CheckIcon size={16} />}
                          </div>
                          {qualityLevels.map((level) => (
                            <div 
                              key={level.level}
                              className={`quality-option ${currentQuality === level.level ? 'active' : ''}`}
                              onClick={() => handleQualityChange(level.level)}
                            >
                              <span>{getQualityLabel(level)}</span>
                              {currentQuality === level.level && <CheckIcon size={16} />}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* PiP button */}
                  {document.pictureInPictureEnabled && (
                    <button 
                      className="control-button" 
                      onClick={togglePiP}
                      title="Picture in Picture"
                    >
                      <PipIcon />
                    </button>
                  )}
                  
                  {/* Fullscreen button */}
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
