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
  streamUrl2?: string;
  streamUrl3?: string;
  streamUrl4?: string;
  streamUrl5?: string;
  channelName: string;
  authCookie?: string;
  isM3UPlaylist?: boolean;
  forceProxy?: boolean;
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
  isM3UPlaylist,
  forceProxy
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
  const [showServers, setShowServers] = useState(false);
  const [qualityLevels, setQualityLevels] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1);
  const [currentServer, setCurrentServer] = useState(1);
  const [isLive, setIsLive] = useState(true);
  const [useProxy, setUseProxy] = useState(false);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const servers = [
    { url: streamUrl, label: 'Server 1' },
    streamUrl2 && { url: streamUrl2, label: 'Server 2' },
    streamUrl3 && { url: streamUrl3, label: 'Server 3' },
    streamUrl4 && { url: streamUrl4, label: 'Server 4' },
    streamUrl5 && { url: streamUrl5, label: 'Server 5' },
  ].filter(Boolean) as { url: string; label: string }[];

  useEffect(() => setIsClient(true), []);

  const isHLSStream = (url: string): boolean => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('.m3u8') || 
           lowerUrl.includes('.m3u') || 
           lowerUrl.includes('application/x-mpegurl') ||
           lowerUrl.includes('application/vnd.apple.mpegurl');
  };

  // Main Player Initialization Logic (This part is correct and remains)
  useEffect(() => {
    if (!videoRef.current || !isClient) return;

    const videoElement = videoRef.current;
    const currentStreamUrl = servers[currentServer - 1].url;
    const shouldUseProxy = forceProxy || useProxy;

    let sourceUrl: string;
    if (shouldUseProxy) {
      let proxyUrl = `/api/proxy?url=${encodeURIComponent(currentStreamUrl)}`;
      if (authCookie) {
        proxyUrl += `&cookie=${encodeURIComponent(authCookie)}`;
      }
      sourceUrl = proxyUrl;
    } else {
      sourceUrl = currentStreamUrl;
    }

    console.log(`Loading stream. Server: ${currentServer}, URL: ${currentStreamUrl}, Proxy: ${shouldUseProxy}`);
    
    setError(null);
    setIsLoading(true);

    const playVideo = () => {
      videoElement.play().catch(e => {
        console.warn('Autoplay prevented:', e);
        setPlaying(false);
      });
    };

    if (isHLSStream(currentStreamUrl) || isM3UPlaylist) {
      if (Hls.isSupported()) {
        const hls = new Hls({ debug: false, enableWorker: true });
        hlsRef.current = hls;

        hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
          console.log('Manifest parsed successfully.');
          setIsLoading(false);
          setQualityLevels(hls.levels.map((l, i) => ({ height: l.height, level: i, bitrate: l.bitrate })));
          setCurrentQuality(hls.currentLevel);
          setIsLive(data.levels[0]?.details?.live ?? true);
          playVideo();
        });

        hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => setCurrentQuality(data.level));
        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('HLS Error:', data);
          if (data.fatal) {
            if (data.type === Hls.ErrorTypes.NETWORK_ERROR && !shouldUseProxy) {
              console.log('Direct connection failed. Retrying with proxy...');
              setUseProxy(true);
            } else if (currentServer < servers.length) {
              console.log(`Server ${currentServer} failed. Trying next server...`);
              setCurrentServer(prev => prev + 1);
              setUseProxy(false);
            } else {
              setError('Unable to play this stream from any server.');
              setIsLoading(false);
            }
          }
        });

        hls.loadSource(sourceUrl);
        hls.attachMedia(videoElement);
      } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        videoElement.src = sourceUrl;
        videoElement.addEventListener('loadedmetadata', () => { setIsLoading(false); playVideo(); });
      }
    } else {
      videoElement.src = sourceUrl;
      videoElement.addEventListener('loadedmetadata', () => { setIsLoading(false); playVideo(); });
    }
    
    const genericErrorHandler = () => {
      if (currentServer < servers.length) {
        setCurrentServer(prev => prev + 1);
        setUseProxy(false);
      } else {
        setError('An error occurred while trying to play this video.');
        setIsLoading(false);
      }
    };
    videoElement.addEventListener('error', genericErrorHandler);

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      videoElement.removeEventListener('error', genericErrorHandler);
      videoElement.src = '';
    };

  }, [isClient, currentServer, useProxy, forceProxy]);

  const handleRetry = () => {
    setCurrentServer(1);
    setUseProxy(false);
    setError(null);
  };
  
  // **FIXED**: Restored correct controls visibility logic
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

    const handlePlayerClick = (event: MouseEvent) => {
      // Prevent click on controls from toggling visibility
      if ((event.target as HTMLElement).closest('.custom-controls, .center-controls, .top-controls')) {
        return;
      }
      if (showControls) {
        hideControls();
      } else {
        showControlsTemporarily();
      }
    };

    const handleMouseMove = () => showControlsTemporarily();
    
    playerElement.addEventListener('click', handlePlayerClick);
    playerElement.addEventListener('mousemove', handleMouseMove);
    playerElement.addEventListener('mouseleave', hideControls);
    
    controlsTimeoutRef.current = setTimeout(hideControls, 3000);

    return () => {
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      playerElement.removeEventListener('click', handlePlayerClick);
      playerElement.removeEventListener('mousemove', handleMouseMove);
      playerElement.removeEventListener('mouseleave', hideControls);
    };
  }, [showControls]);

  // Time and buffer update logic
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => setIsLoading(false);
    const updateTime = () => {
      setCurrentTime(video.currentTime);
      setDuration(video.duration);
      if (video.buffered.length > 0) {
        setBuffered((video.buffered.end(video.buffered.length - 1) / video.duration) * 100);
      }
    };
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('playing', onPlaying);
    video.addEventListener('timeupdate', updateTime);
    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('timeupdate', updateTime);
    };
  }, []);
  
  // Fullscreen and PiP handlers
  useEffect(() => {
    const handleFullscreenChange = () => setFullscreen(!!document.fullscreenElement);
    const handlePiPChange = () => setPip(!!document.pictureInPictureElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('enterpictureinpicture', handlePiPChange);
    document.addEventListener('leavepictureinpicture', handlePiPChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('enterpictureinpicture', handlePiPChange);
      document.removeEventListener('leavepictureinpicture', handlePiPChange);
    };
  }, []);

  const handlePlayPause = () => {
    if (videoRef.current) {
      videoRef.current.paused ? videoRef.current.play().catch(console.error) : videoRef.current.pause();
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
      if (!document.fullscreenElement) await playerWrapperRef.current.requestFullscreen();
      else await document.exitFullscreen();
    } catch (error) { console.error('Fullscreen error:', error); }
  };
  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (document.pictureInPictureEnabled) await videoRef.current.requestPictureInPicture();
    } catch (error) { console.error('PiP error:', error); }
  };
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !videoRef.current || isLive) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * duration;
  };
  const handleQualityChange = (level: number) => {
    if (hlsRef.current) hlsRef.current.currentLevel = level;
    setShowQuality(false); setShowSettings(false);
  };
  const handleServerChange = (serverIndex: number) => {
    if (serverIndex !== currentServer) {
      setCurrentServer(serverIndex);
      setUseProxy(false);
    }
    setShowServers(false); setShowSettings(false);
  };
  const toggleSettings = () => {
    if (showSettings) {
      setShowSettings(false); setShowQuality(false); setShowServers(false);
    } else {
      setShowSettings(true);
    }
  };
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };
  const getQualityLabel = (level: QualityLevel): string => {
    if (level.height >= 2160) return '4K';
    if (level.height >= 1080) return '1080p';
    if (level.height >= 720) return '720p';
    if (level.height >= 480) return '480p';
    return `${level.height}p`;
  };

  if (!isClient) {
    return <div className="video-player"><div className="video-wrapper bg-black" /></div>;
  }

  // **FIXED**: Restored correct JSX structure
  return (
    <div 
      ref={playerWrapperRef} 
      className={`video-player ${showControls ? 'show-controls' : ''} ${playing ? 'playing' : 'paused'} ${pip ? 'pip-active' : ''}`}
      onDoubleClick={toggleFullscreen}
    >
      <div className="video-wrapper">
        {error ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white p-4 text-center">
            <h3 className="text-xl font-semibold mb-2">Stream Error</h3>
            <p className="mb-4 text-sm">{error}</p>
            <button onClick={handleRetry} className="play-btn flex items-center gap-2">
              <RotateIcon size={18} /> Retry
            </button>
          </div>
        ) : (
          <video ref={videoRef} muted playsInline width="100%" height="100%" style={{ objectFit: 'contain' }} crossOrigin="anonymous" />
        )}
        
        {isLoading && !error && (
          <div className="player-loading-indicator show">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading {servers[currentServer - 1]?.label || 'Stream'}...</div>
          </div>
        )}

        {!error && (
          <>
            <div className="top-controls">
              <div className="player-title">{channelName}</div>
              {isLive && <div className="live-indicator">LIVE</div>}
            </div>

            <div className="center-controls">
              <button className="center-play-btn" onClick={handlePlayPause}>
                {playing ? <PauseIcon /> : <PlayIcon />}
              </button>
            </div>
            
            <div className="custom-controls">
              {!isLive && (
                <div ref={progressRef} className="progress-container" onClick={handleSeek}>
                  <div className="progress-buffered" style={{ width: `${buffered}%` }} />
                  <div className="progress-bar" style={{ width: `${(currentTime / duration) * 100}%` }} />
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
                  {!isLive && <div className="time-display">{formatTime(currentTime)} / {formatTime(duration)}</div>}
                </div>
                
                <div className="controls-right">
                  {(qualityLevels.length > 0 || servers.length > 1) && (
                    <div className="relative">
                      <button className={`control-button ${showSettings ? 'active' : ''}`} onClick={toggleSettings}><SettingsIcon /></button>
                      {showSettings && (
                        <div className="quality-menu" style={{ display: 'block' }}>
                          <div className="quality-menu-header">Settings</div>
                          {qualityLevels.length > 0 && <div className="quality-option" onClick={() => { setShowQuality(true); setShowServers(false); }}><span>Quality</span><span className="text-xs">{currentQuality === -1 ? 'Auto' : getQualityLabel(qualityLevels[currentQuality])}</span></div>}
                          {servers.length > 1 && <div className="quality-option" onClick={() => { setShowServers(true); setShowQuality(false); }}><span>Server</span><span className="text-xs">{servers[currentServer - 1]?.label}</span></div>}
                        </div>
                      )}
                      {showQuality && (
                        <div className="quality-menu" style={{ display: 'block', right: '120px' }}>
                          <div className="quality-menu-header">Quality</div>
                          <div className={`quality-option ${currentQuality === -1 ? 'active' : ''}`} onClick={() => handleQualityChange(-1)}><span>Auto</span>{currentQuality === -1 && <CheckIcon size={16} />}</div>
                          {qualityLevels.map((level) => (<div key={level.level} className={`quality-option ${currentQuality === level.level ? 'active' : ''}`} onClick={() => handleQualityChange(level.level)}><span>{getQualityLabel(level)}</span>{currentQuality === level.level && <CheckIcon size={16} />}</div>))}
                        </div>
                      )}
                      {showServers && (
                        <div className="quality-menu" style={{ display: 'block', right: '120px' }}>
                          <div className="quality-menu-header">Select Server</div>
                          {servers.map((server, index) => (<div key={index} className={`quality-option ${currentServer === index + 1 ? 'active' : ''}`} onClick={() => handleServerChange(index + 1)}><span>{server.label}</span>{currentServer === index + 1 && <CheckIcon size={16} />}</div>))}
                        </div>
                      )}
                    </div>
                  )}
                  {document.pictureInPictureEnabled && <button className="control-button" onClick={togglePiP} title="Picture in Picture"><PipIcon /></button>}
                  <button className="control-button" onClick={toggleFullscreen}>{fullscreen ? <FullscreenExitIcon /> : <FullscreenEnterIcon />}</button>
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
