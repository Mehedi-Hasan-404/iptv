'use client';
import { useState, useRef, useEffect } from 'react';
import Hls from 'hls.js';
import { PauseIcon, PlayIcon, FullscreenEnterIcon, FullscreenExitIcon, VolumeMaxIcon, VolumeMuteIcon, RotateIcon } from './Icons'; // Added RotateIcon

interface VideoPlayerProps {
  streamUrl: string;
  channelName: string;
}

const VideoPlayer = ({ streamUrl, channelName }: VideoPlayerProps) => {
  const [isClient, setIsClient] = useState(false);
  const playerWrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // State for our custom controls
  const [playing, setPlaying] = useState(false); // Start as paused, or let HLS auto-play if user interaction allows
  const [muted, setMuted] = useState(true); // Muted by default for autoplay compliance
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // New loading state
  const [showControls, setShowControls] = useState(false); // Controls visibility
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => setIsClient(true), []);

  // Effect to hide controls after inactivity
  useEffect(() => {
    if (!playing || error) { // Always show controls if paused or error
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
      controlsTimeoutRef.current = setTimeout(hideControls, 3000); // Hide after 3 seconds
    };

    // Initial timeout
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


  useEffect(() => {
    if (!videoRef.current || !isClient) return;

    const videoElement = videoRef.current;
    let hls: Hls | null = null;
    const proxiedUrl = `/api/proxy?url=${encodeURIComponent(streamUrl)}`;

    setError(null); // Clear previous errors
    setIsLoading(true); // Start loading

    // Reset video state
    videoElement.src = '';
    videoElement.load();
    setPlaying(false);
    // setMuted(true); // Keep muted for potential autoplay

    if (Hls.isSupported()) {
      hls = new Hls({
        // Add HLS.js configuration here if needed, e.g., lowLatencyMode: true
      });
      hls.loadSource(proxiedUrl);
      hls.attachMedia(videoElement);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false); // Manifest loaded, stop loading indicator
        videoElement.play().catch(e => {
          console.warn('Video play prevented by browser:', e);
          // Only set playing to false if play() truly fails (user gesture required)
          if (e.name === "NotAllowedError") {
            setPlaying(false);
            // Optionally, show a "click to play" overlay
          }
        });
      });
      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          console.error('HLS.js Fatal Error:', data);
          setIsLoading(false);
          setPlaying(false);
          setError(`Stream error: ${data.details}. It might be offline or restricted.`);
          if (hls) {
            hls.destroy();
          }
        } else if (data.response?.code === 404) {
             console.warn('HLS.js Non-Fatal Error (404):', data);
             // Could retry here or try to switch quality
        }
      });
      hls.on(Hls.Events.BUFFER_APPENDED, () => {
        // This event signifies data has been appended to the media source buffer.
        // It's a good time to ensure loading state is false after initial buffer.
        setIsLoading(false);
      });
      hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
        // If a level (quality) is loaded, we are actively receiving data
        setIsLoading(false);
      });
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // For native HLS support (like Safari)
      videoElement.src = proxiedUrl;
      videoElement.addEventListener('loadedmetadata', () => {
        setIsLoading(false); // Metadata loaded, stop loading indicator
        videoElement.play().catch(e => {
          console.warn('Native video play prevented by browser:', e);
          if (e.name === "NotAllowedError") {
            setPlaying(false);
          }
        });
      });
      videoElement.addEventListener('error', (e) => {
        console.error('Native video error:', e);
        setIsLoading(false);
        setPlaying(false);
        setError('This stream could not be played natively. It might be offline or restricted.');
      });
    } else {
      setIsLoading(false);
      setError('Your browser does not support HLS streaming.');
    }

    // Event listeners for video element to update state
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onWaiting = () => setIsLoading(true); // Video is buffering
    const onPlaying = () => setIsLoading(false); // Video resumed playing after buffering
    const onCanPlay = () => setIsLoading(false); // Video is ready to play

    videoElement.addEventListener('play', onPlay);
    videoElement.addEventListener('pause', onPause);
    videoElement.addEventListener('waiting', onWaiting);
    videoElement.addEventListener('playing', onPlaying);
    videoElement.addEventListener('canplay', onCanPlay);

    // Cleanup function to destroy the HLS instance when the component unmounts
    return () => {
      if (hls) {
        hls.destroy();
      }
      videoElement.removeEventListener('play', onPlay);
      videoElement.removeEventListener('pause', onPause);
      videoElement.removeEventListener('waiting', onWaiting);
      videoElement.removeEventListener('playing', onPlaying);
      videoElement.removeEventListener('canplay', onCanPlay);
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [streamUrl, isClient]);
  
  // Functions to control the <video> element
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
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
    <div 
      ref={playerWrapperRef} 
      className={`video-player ${showControls ? 'show-controls' : ''} ${playing ? 'playing' : 'paused'}`}
      onDoubleClick={toggleFullscreen}
    >
      <div className="video-wrapper">
        {error ? (
          <div className="w-full h-full flex items-center justify-center bg-black text-white p-4 text-center">
            <p>{error}</p>
            <button onClick={() => window.location.reload()} className="play-btn mt-4 flex items-center gap-2">
              <RotateIcon size={18} /> Reload Page
            </button>
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
                <div className="loading-text">Loading stream...</div>
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
