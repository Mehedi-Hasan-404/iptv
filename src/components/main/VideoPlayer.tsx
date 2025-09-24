'use client';
import { useState, useRef, useEffect } from 'react';
import Hls from 'hls.js';
import { PauseIcon, PlayIcon, FullscreenEnterIcon, FullscreenExitIcon, VolumeMaxIcon, VolumeMuteIcon, RotateIcon } from './Icons';

interface VideoPlayerProps {
  streamUrl: string;
  channelName: string;
  authCookie?: string;
}

const VideoPlayer = ({ streamUrl, channelName, authCookie }: VideoPlayerProps) => {
  const [isClient, setIsClient] = useState(false);
  const playerWrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (!playing || error) {
      setShowControls(true);
      return;
    }

    const hideControls = () => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    };

    const showAndResetTimeout = () => {
      setShowControls(true);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      controlsTimeoutRef.current = setTimeout(hideControls, 3000);
    };

    controlsTimeoutRef.current = setTimeout(hideControls, 3000);

    const playerElement = playerWrapperRef.current;
    if (playerElement) {
      playerElement.addEventListener('mousemove', showAndResetTimeout);
      playerElement.addEventListener('mouseenter', showAndResetTimeout);
      playerElement.addEventListener('mouseleave', hideControls);
    }
    
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (playerElement) {
        playerElement.removeEventListener('mousemove', showAndResetTimeout);
        playerElement.removeEventListener('mouseenter', showAndResetTimeout);
        playerElement.removeEventListener('mouseleave', hideControls);
      }
    };
  }, [playing, error]);

  const initializePlayer = () => {
    if (!videoRef.current || !isClient) return;

    const videoElement = videoRef.current;
    
    console.log('Initializing player with URL:', streamUrl);

    setError(null);
    setIsLoading(true);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    videoElement.src = '';
    videoElement.load();
    setPlaying(false);

    // Check if URL ends with .m3u8 or contains m3u8
    const isHLS = streamUrl.includes('.m3u8') || streamUrl.includes('m3u8');
    
    // For non-HLS streams, try direct playback first
    if (!isHLS) {
      console.log('Attempting direct playback for non-HLS stream');
      
      videoElement.src = streamUrl;
      
      const handleCanPlay = () => {
        console.log('Direct stream can play');
        setIsLoading(false);
        videoElement.play().catch(e => {
          console.warn('Autoplay prevented:', e);
          setPlaying(false);
        });
      };

      const handleError = (e: Event) => {
        console.error('Direct playback error:', e);
        // If direct playback fails, try HLS
        console.log('Direct playback failed, trying HLS...');
        tryHLSPlayback();
      };

      videoElement.addEventListener('canplay', handleCanPlay);
      videoElement.addEventListener('error', handleError);
      
      // Try to load metadata
      videoElement.load();

      return () => {
        videoElement.removeEventListener('canplay', handleCanPlay);
        videoElement.removeEventListener('error', handleError);
      };
    } else {
      // For HLS streams
      tryHLSPlayback();
    }
  };

  const tryHLSPlayback = () => {
    if (!videoRef.current) return;
    
    const videoElement = videoRef.current;
    
    if (Hls.isSupported()) {
      console.log('Using HLS.js for playback');
      
      const hls = new Hls({
        debug: true, // Enable debug for troubleshooting
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
        testBandwidth: false, // Disable bandwidth test for problematic streams
        startLevel: -1, // Auto start level
        xhrSetup: function(xhr, url) {
          // Set timeout for requests
          xhr.timeout = 30000;
          
          if (authCookie) {
            xhr.setRequestHeader('Cookie', authCookie);
          }
          
          // Add headers that might be needed
          xhr.setRequestHeader('Accept', '*/*');
        }
      });

      hlsRef.current = hls;
      
      // Attach error handlers before loading
      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error:', data);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Network error details:', data.details);
              if (retryCount < 3) {
                setTimeout(() => {
                  console.log('Retrying...');
                  hls.startLoad();
                  setRetryCount(prev => prev + 1);
                }, 2000);
              } else {
                setError(`Network error: ${data.details}. The stream might be unavailable.`);
                setIsLoading(false);
              }
              break;
              
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Media error, attempting recovery');
              hls.recoverMediaError();
              break;
              
            default:
              setError(`Stream error: ${data.details || 'Unknown error'}.`);
              setIsLoading(false);
              hls.destroy();
              break;
          }
        }
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log('Manifest parsed, levels:', data.levels);
        setIsLoading(false);
        videoElement.play().catch(e => {
          console.warn('Autoplay prevented:', e);
          setPlaying(false);
        });
      });

      hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
        console.log('Level loaded:', data.details);
        setIsLoading(false);
        setRetryCount(0);
      });

      // Load the source
      hls.loadSource(streamUrl);
      hls.attachMedia(videoElement);
      
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      console.log('Using native HLS support');
      videoElement.src = streamUrl;
      videoElement.load();
    } else {
      setIsLoading(false);
      setError('Your browser does not support this stream format.');
    }
  };

  useEffect(() => {
    const cleanup = initializePlayer();
    return () => {
      cleanup?.();
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [streamUrl, authCookie, isClient]);

  const handleRetry = () => {
    setRetryCount(0);
    initializePlayer();
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play().then(() => {
          setPlaying(true);
        }).catch(e => {
          console.error('Play error:', e);
          setError('Unable to play stream. Click play to try again.');
        });
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

  // Add event listeners to video element
  useEffect(() => {
    if (!videoRef.current) return;
    
    const videoElement = videoRef.current;
    
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => setIsLoading(false);
    const onCanPlay = () => setIsLoading(false);
    const onLoadStart = () => console.log('Load started');
    const onLoadedData = () => console.log('Data loaded');

    videoElement.addEventListener('play', onPlay);
    videoElement.addEventListener('pause', onPause);
    videoElement.addEventListener('waiting', onWaiting);
    videoElement.addEventListener('playing', onPlaying);
    videoElement.addEventListener('canplay', onCanPlay);
    videoElement.addEventListener('loadstart', onLoadStart);
    videoElement.addEventListener('loadeddata', onLoadedData);

    return () => {
      videoElement.removeEventListener('play', onPlay);
      videoElement.removeEventListener('pause', onPause);
      videoElement.removeEventListener('waiting', onWaiting);
      videoElement.removeEventListener('playing', onPlaying);
      videoElement.removeEventListener('canplay', onCanPlay);
      videoElement.removeEventListener('loadstart', onLoadStart);
      videoElement.removeEventListener('loadeddata', onLoadedData);
    };
  }, [isClient]);

  if (!isClient) {
    return <div className="video-player"><div className="video-wrapper bg-black" /></div>;
  }
  
  return (
    <div 
      ref={playerWrapperRef} 
      className={`video-player ${showControls ? 'show-controls' : ''} ${playing ? 'playing' : 'paused'}`}
      onDoubleClick={toggleFullscreen}
    >
      <div className="video-wrapper">
        {error ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-black text-white p-4 text-center">
            <div className="max-w-md">
              <h3 className="text-xl font-semibold mb-2">Stream Error</h3>
              <p className="mb-4 text-sm">{error}</p>
              <div className="text-xs text-gray-400 mb-4">
                <p>Stream URL: {streamUrl}</p>
                <p>Type: {streamUrl.includes('.m3u8') ? 'HLS' : 'Direct'}</p>
              </div>
              <div className="flex gap-2 justify-center">
                <button onClick={handleRetry} className="play-btn flex items-center gap-2">
                  <RotateIcon size={18} /> Retry
                </button>
                <button onClick={() => window.location.reload()} className="play-btn flex items-center gap-2">
                  <RotateIcon size={18} /> Reload Page
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
                  {retryCount > 0 ? `Retrying... (${retryCount}/3)` : 'Loading stream...'}
                </div>
            </div>
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
