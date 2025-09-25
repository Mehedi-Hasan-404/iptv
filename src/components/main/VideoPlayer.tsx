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

// Extend the existing Screen interface properly
declare global {
  interface Screen {
    orientation?: ScreenOrientation & {
      lock?: (orientation: string) => Promise<void>;
      unlock?: () => void;
    };
  }
}

interface VideoPlayerProps {
  streamUrl: string;
  streamUrl2?: string;
  streamUrl3?: string;
  streamUrl4?: string;
  streamUrl5?: string;
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
  streamUrl2, 
  streamUrl3, 
  streamUrl4, 
  streamUrl5, 
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
  const [retryCount, setRetryCount] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [showQuality, setShowQuality] = useState(false);
  const [showServers, setShowServers] = useState(false);
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1);
  const [currentServer, setCurrentServer] = useState(1);
  const [isLive, setIsLive] = useState(true);
  const [useProxy, setUseProxy] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  // Get all available servers
  const servers = [
    { url: streamUrl, label: 'Server 1' },
    streamUrl2 && { url: streamUrl2, label: 'Server 2' },
    streamUrl3 && { url: streamUrl3, label: 'Server 3' },
    streamUrl4 && { url: streamUrl4, label: 'Server 4' },
    streamUrl5 && { url: streamUrl5, label: 'Server 5' },
  ].filter(Boolean) as { url: string; label: string }[];

  useEffect(() => setIsClient(true), []);

  // Controls visibility logic
  useEffect(() => {
    const playerElement = playerWrapperRef.current;
    if (!playerElement) return;

    const hideControls = () => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
        setShowSettings(false);
        setShowQuality(false);
        setShowServers(false);
      }
    };

    const showControlsTemporarily = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(hideControls, 3000);
    };

    const handlePlayerClick = () => {
      if (showControls) {
        hideControls();
      } else {
        showControlsTemporarily();
      }
    };

    const handleMouseMove = () => {
      showControlsTemporarily();
    };

    const handleMouseLeave = () => {
      if (videoRef.current && !videoRef.current.paused) {
        setTimeout(hideControls, 1000);
      }
    };

    // Initial timeout to hide controls
    controlsTimeoutRef.current = setTimeout(hideControls, 3000);

    playerElement.addEventListener('click', handlePlayerClick);
    playerElement.addEventListener('mousemove', handleMouseMove);
    playerElement.addEventListener('mouseenter', handleMouseMove);
    playerElement.addEventListener('mouseleave', handleMouseLeave);
    playerElement.addEventListener('touchstart', handleMouseMove);

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      playerElement.removeEventListener('click', handlePlayerClick);
      playerElement.removeEventListener('mousemove', handleMouseMove);
      playerElement.removeEventListener('mouseenter', handleMouseMove);
      playerElement.removeEventListener('mouseleave', handleMouseLeave);
      playerElement.removeEventListener('touchstart', handleMouseMove);
    };
  }, [showControls]);

  // Update time and buffer
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration);
      
      // Update buffered amount
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

  const isHLSStream = (url: string): boolean => {
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('.m3u8') || 
           lowerUrl.includes('.m3u') || 
           lowerUrl.includes('application/x-mpegurl') ||
           lowerUrl.includes('application/vnd.apple.mpegurl');
  };

  const initializePlayer = useCallback(() => {
    if (!videoRef.current || !isClient) return;

    const videoElement = videoRef.current;
    const currentStreamUrl = servers[currentServer - 1].url;
    
    // Build proxy URL
    let proxyUrl = `/api/proxy?url=${encodeURIComponent(currentStreamUrl)}`;
    if (authCookie) {
      proxyUrl += `&cookie=${encodeURIComponent(authCookie)}`;
    }

    console.log('Initializing player with URL:', currentStreamUrl);
    console.log('Current server:', currentServer);

    setError(null);
    setIsLoading(true);
    setUseProxy(false);

    // Clean up previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    videoElement.src = '';
    videoElement.load();
    setPlaying(false);

    // Try direct playback first for ALL streams
    const tryDirectPlayback = () => {
      console.log('Trying direct playback...');
      
      if (isHLSStream(currentStreamUrl) || isM3UPlaylist) {
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
            xhrSetup: function(xhr: XMLHttpRequest) {
              xhr.withCredentials = false;
            }
          });

          hlsRef.current = hls;
          
          // Handle errors and fallback to proxy
          hls.on(Hls.Events.ERROR, (event, data) => {
            console.error('HLS Error:', data);
            
            // If it's a network error, try proxy
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR && !useProxy) {
              console.log('Network error with direct playback, trying proxy...');
              setUseProxy(true);
              hls.destroy();
              
              // Retry with proxy
              const proxyHls = new Hls({
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
                xhrSetup: function(xhr: XMLHttpRequest) {
                  xhr.withCredentials = false;
                }
              });
              
              hlsRef.current = proxyHls;
              proxyHls.loadSource(proxyUrl);
              proxyHls.attachMedia(videoElement);
              
              proxyHls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
                console.log('Manifest parsed successfully via proxy');
                setIsLoading(false);
                
                // Get quality levels
                const levels = proxyHls.levels.map((level, index) => ({
                  height: level.height,
                  level: index,
                  bitrate: level.bitrate
                }));
                setQualityLevels(levels);
                setCurrentQuality(proxyHls.currentLevel);
                
                // Check if it's a live stream
                setIsLive(data.levels[0]?.details?.live || true);
                
                videoElement.play().catch(e => {
                  console.warn('Autoplay prevented:', e);
                  if (e.name === "NotAllowedError") {
                    setPlaying(false);
                  }
                });
              });
              
              proxyHls.on(Hls.Events.ERROR, (event, data) => {
                console.error('HLS Error with proxy:', data);
                if (data.fatal) {
                  handleError();
                }
              });
              
              return;
            }
            
            if (data.fatal) {
              handleError();
            }
          });

          hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
            console.log('Manifest parsed successfully via direct playback');
            setIsLoading(false);
            
            // Get quality levels
            const levels = hls.levels.map((level, index) => ({
              height: level.height,
              level: index,
              bitrate: level.bitrate
            }));
            setQualityLevels(levels);
            setCurrentQuality(hls.currentLevel);
            
            // Check if it's a live stream
            setIsLive(data.levels[0]?.details?.live || true);
            
            videoElement.play().catch(e => {
              console.warn('Autoplay prevented:', e);
              if (e.name === "NotAllowedError") {
                setPlaying(false);
              }
            });
          });

          hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
            console.log('Quality level switched to:', data.level);
            setCurrentQuality(data.level);
          });

          hls.loadSource(currentStreamUrl);
          hls.attachMedia(videoElement);

        } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS support (Safari) - try direct first
          console.log('Using native HLS support (direct)');
          videoElement.src = currentStreamUrl;
        }
      } else {
        // Direct stream - try direct first
        console.log('Using direct video playback');
        videoElement.src = currentStreamUrl;
      }
    };

    // Handle errors and fallback to proxy
    const handleError = () => {
      if (!useProxy) {
        console.log('Direct playback failed, trying proxy...');
        setUseProxy(true);
        
        if (isHLSStream(currentStreamUrl) || isM3UPlaylist) {
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
              xhrSetup: function(xhr: XMLHttpRequest) {
                xhr.withCredentials = false;
              }
            });

            hlsRef.current = hls;
            hls.loadSource(proxyUrl);
            hls.attachMedia(videoElement);

            hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
              console.log('Manifest parsed successfully via proxy');
              setIsLoading(false);
              
              // Get quality levels
              const levels = hls.levels.map((level, index) => ({
                height: level.height,
                level: index,
                bitrate: level.bitrate
              }));
              setQualityLevels(levels);
              setCurrentQuality(hls.currentLevel);
              
              // Check if it's a live stream
              setIsLive(data.levels[0]?.details?.live || true);
              
              videoElement.play().catch(e => {
                console.warn('Autoplay prevented:', e);
                if (e.name === "NotAllowedError") {
                  setPlaying(false);
                }
              });
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
              console.error('HLS Error with proxy:', data);
              if (data.fatal) {
                finalHandleError();
              }
            });

          } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari) via proxy
            console.log('Using native HLS support via proxy');
            videoElement.src = proxyUrl;
          }
        } else {
          // Direct stream via proxy
          console.log('Using direct video playback via proxy');
          videoElement.src = proxyUrl;
        }
      } else {
        finalHandleError();
      }
    };

    const finalHandleError = () => {
      console.error('Video error');
      if (currentServer < servers.length && retryCount < 1) {
        console.log('Trying next server...');
        setCurrentServer(prev => prev + 1);
        setRetryCount(0);
        setUseProxy(false);
      } else {
        setError('Unable to play this stream from any server.');
        setIsLoading(false);
      }
    };

    const handleLoadedMetadata = () => {
      console.log('Video metadata loaded');
      setIsLoading(false);
      videoElement.play().catch(e => {
        console.warn('Play prevented:', e);
        if (e.name === "NotAllowedError") {
          setPlaying(false);
        }
      });
    };

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => setIsLoading(false);
    const onCanPlay = () => setIsLoading(false);

    // Start with direct playback
    tryDirectPlayback();

    // Add event listeners
    videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
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
      videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.removeEventListener('error', handleError);
      videoElement.removeEventListener('play', onPlay);
      videoElement.removeEventListener('pause', onPause);
      videoElement.removeEventListener('waiting', onWaiting);
      videoElement.removeEventListener('playing', onPlaying);
      videoElement.removeEventListener('canplay', onCanPlay);
    };
  }, [servers, currentServer, authCookie, isClient, retryCount, isM3UPlaylist, useProxy]);

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
    setRetryCount(0);
    setCurrentServer(1);
    setUseProxy(false);
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
        // Request fullscreen
        await playerWrapperRef.current.requestFullscreen();
        
        // Force landscape orientation on mobile with proper type checking
        if (screen?.orientation?.lock) {
          try {
            await screen.orientation.lock('landscape');
          } catch (e) {
            console.log('Orientation lock not supported');
          }
        }
        
        setFullscreen(true);
      } else {
        // Exit fullscreen
        await document.exitFullscreen();
        
        // Unlock orientation with proper type checking
        if (screen?.orientation?.unlock) {
          try {
            screen.orientation.unlock();
          } catch (e) {
            console.log('Orientation unlock not supported');
          }
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

  const handleServerChange = (serverIndex: number) => {
    setCurrentServer(serverIndex);
    setRetryCount(0);
    setShowServers(false);
    setShowSettings(false);
    setUseProxy(false);
  };

  const toggleSettings = () => {
    if (showSettings) {
      setShowSettings(false);
      setShowQuality(false);
      setShowServers(false);
    } else {
      setShowSettings(true);
      setShowQuality(false);
      setShowServers(false);
    }
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
              <div className="flex gap-2 justify-center">
                <button onClick={handleRetry} className="play-btn flex items-center gap-2">
                  <RotateIcon size={18} /> Retry All Servers
                </button>
              </div>
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
            <div className="loading-text">
              {useProxy ? 'Loading via proxy from' : 'Loading from'} {servers[currentServer - 1]?.label || 'Server'}...
            </div>
          </div>
        )}

        {/* Center play button - always visible when paused */}
        <div className="center-controls">
          <button 
            className="center-play-btn" 
            onClick={handlePlayPause}
            style={{ opacity: playing ? 0 : 1, pointerEvents: playing ? 'none' : 'auto' }}
          >
            {playing ? <PauseIcon /> : <PlayIcon />}
          </button>
        </div>
        
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
                  {/* Settings button - only show when quality levels are available or multiple servers */}
                  {(qualityLevels.length > 0 || servers.length > 1) && (
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
                          {qualityLevels.length > 0 && (
                            <div 
                              className="quality-option"
                              onClick={() => {
                                setShowQuality(!showQuality);
                                setShowServers(false);
                              }}
                            >
                              <span>Quality</span>
                              <span className="text-xs">
                                {currentQuality === -1 ? 'Auto' : getQualityLabel(qualityLevels[currentQuality])}
                              </span>
                            </div>
                          )}
                          
                          {/* Server option */}
                          {servers.length > 1 && (
                            <div 
                              className="quality-option"
                              onClick={() => {
                                setShowServers(!showServers);
                                setShowQuality(false);
                              }}
                            >
                              <span>Server</span>
                              <span className="text-xs">{servers[currentServer - 1]?.label}</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {/* Quality submenu */}
                      {showQuality && (
                        <div className="quality-menu" style={{ display: 'block', right: '120px' }}>
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
                      
                      {/* Server submenu */}
                      {showServers && (
                        <div className="quality-menu" style={{ display: 'block', right: '120px' }}>
                          <div className="quality-menu-header">Select Server</div>
                          {servers.map((server, index) => (
                            <div 
                              key={index}
                              className={`quality-option ${currentServer === index + 1 ? 'active' : ''}`}
                              onClick={() => handleServerChange(index + 1)}
                            >
                              <span>{server.label}</span>
                              {currentServer === index + 1 && <CheckIcon size={16} />}
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
