'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { PauseIcon, PlayIcon, FullscreenEnterIcon, FullscreenExitIcon, VolumeMaxIcon, VolumeMuteIcon, RotateCw } from './Icons';

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

  // Controls visibility logic
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
      playerElement.addEventListener('touchstart', showAndResetTimeout);
    }
    
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (playerElement) {
        playerElement.removeEventListener('mousemove', showAndResetTimeout);
        playerElement.removeEventListener('mouseenter', showAndResetTimeout);
        playerElement.removeEventListener('mouseleave', hideControls);
        playerElement.removeEventListener('touchstart', showAndResetTimeout);
      }
    };
  }, [playing, error]);

  const initializePlayer = useCallback(() => {
    if (!videoRef.current || !isClient) return;

    const videoElement = videoRef.current;
    
    // Build the proxied URL with optional cookie
    let proxiedUrl = `/api/proxy?url=${encodeURIComponent(streamUrl)}`;
    if (authCookie) {
      proxiedUrl += `&cookie=${encodeURIComponent(authCookie)}`;
    }

    console.log('Initializing player with URL:', proxiedUrl);
    if (authCookie) {
      console.log('Authentication cookie provided');
    }

    setError(null);
    setIsLoading(true);

    // Clean up previous instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    videoElement.src = '';
    videoElement.load();
    setPlaying(false);

    if (Hls.isSupported()) {
      const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        maxBufferSize: 60 * 1000 * 1000, // 60 MB
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
      hls.loadSource(proxiedUrl);
      hls.attachMedia(videoElement);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('Manifest parsed successfully');
        setIsLoading(false);
        videoElement.play().catch(e => {
          console.warn('Autoplay prevented:', e);
          if (e.name === "NotAllowedError") {
            setPlaying(false);
          }
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error:', data);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Fatal network error encountered, details:', data.details);
              
              if (data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR) {
                setError('Unable to load stream. This might be due to authentication issues or the stream being offline.');
                setIsLoading(false);
              } else if (data.details === Hls.ErrorDetails.FRAG_LOAD_ERROR) {
                setError('Unable to load video segments. Authentication might be required or expired.');
                setIsLoading(false);
              } else {
                if (retryCount < 3) {
                  setTimeout(() => {
                    console.log('Attempting to recover from network error...');
                    hls.startLoad();
                    setRetryCount(prev => prev + 1);
                  }, 2000);
                } else {
                  setError('Network error: Unable to load the stream. Please check your connection or authentication.');
                  setIsLoading(false);
                }
              }
              break;
              
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Fatal media error encountered, details:', data.details);
              hls.recoverMediaError();
              break;
              
            default:
              setError(`Stream error: ${data.details || 'Unknown error'}. The stream might be offline or require authentication.`);
              setIsLoading(false);
              hls.destroy();
              break;
          }
        } else {
          console.warn('Non-fatal HLS error:', data.details);
        }
      });

      hls.on(Hls.Events.LEVEL_LOADED, () => {
        console.log('Level loaded');
        setIsLoading(false);
        setRetryCount(0);
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
        setRetryCount(0);
      });

    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      console.log('Using native HLS support');
      videoElement.src = proxiedUrl;
      
      const handleLoadedMetadata = () => {
        setIsLoading(false);
        videoElement.play().catch(e => {
          console.warn('Native play prevented:', e);
          if (e.name === "NotAllowedError") {
            setPlaying(false);
          }
        });
      };

      const handleError = () => {
        console.error('Native video error');
        const videoError = videoElement.error;
        let errorMessage = 'Unable to play this stream.';
        
        if (videoError) {
          switch (videoError.code) {
            case videoError.MEDIA_ERR_NETWORK:
              errorMessage = 'Network error while loading the stream. Authentication might be required.';
              break;
            case videoError.MEDIA_ERR_DECODE:
              errorMessage = 'Unable to decode the stream.';
              break;
            case videoError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorMessage = 'Stream format not supported or authentication failed.';
              break;
          }
        }
        
        setIsLoading(false);
        setPlaying(false);
        setError(errorMessage);
      };

      videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      videoElement.addEventListener('error', handleError);

      return () => {
        videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        videoElement.removeEventListener('error', handleError);
      };
    } else {
      setIsLoading(false);
      setError('Your browser does not support HLS streaming.');
    }

    // Video element event listeners
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setIsLoading(true);
    const onPlaying = () => setIsLoading(false);
    const onCanPlay = () => setIsLoading(false);
    const onError = () => {
      setIsLoading(false);
      const videoError = videoElement.error;
      if (videoError && videoError.code === MediaError.MEDIA_ERR_NETWORK) {
        setError('Network error. The stream might require authentication or be unavailable.');
      } else {
        setError('Video playback error. The stream might be unavailable.');
      }
    };

    videoElement.addEventListener('play', onPlay);
    videoElement.addEventListener('pause', onPause);
    videoElement.addEventListener('waiting', onWaiting);
    videoElement.addEventListener('playing', onPlaying);
    videoElement.addEventListener('canplay', onCanPlay);
    videoElement.addEventListener('error', onError);

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      videoElement.removeEventListener('play', onPlay);
      videoElement.removeEventListener('pause', onPause);
      videoElement.removeEventListener('waiting', onWaiting);
      videoElement.removeEventListener('playing', onPlaying);
      videoElement.removeEventListener('canplay', onCanPlay);
      videoElement.removeEventListener('error', onError);
    };
  }, [streamUrl, authCookie, isClient, retryCount]);

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

  const toggleFullscreen = () => {
    if (!playerWrapperRef.current) return;
    
    if (!document.fullscreenElement) {
      playerWrapperRef.current.requestFullscreen().catch(console.error);
      setFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.error);
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

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
              {authCookie && (
                <p className="text-xs text-gray-400 mb-4">
                  Note: This stream requires authentication. Make sure the authentication cookie is valid and not expired.
                </p>
              )}
              <div className="flex gap-2 justify-center">
                <button onClick={handleRetry} className="play-btn flex items-center gap-2">
                  <RotateCw size={18} /> Retry
                </button>
                <button onClick={() => window.location.reload()} className="play-btn flex items-center gap-2">
                  <RotateCw size={18} /> Reload Page
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
