'use client';
import { useState, useRef, useEffect } from 'react';
import ReactPlayer from 'react-player/lazy';
import { PauseIcon, PlayIcon, FullscreenEnterIcon, FullscreenExitIcon, VolumeMaxIcon, VolumeMuteIcon } from './Icons';

interface VideoPlayerProps {
  streamUrl: string;
  channelName: string;
}

const VideoPlayer = ({ streamUrl, channelName }: VideoPlayerProps) => {
  const [isClient, setIsClient] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const playerWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => setIsClient(true), []);

  // IMPORTANT: This creates the proxied URL to fix CORS errors.
  // It takes the original streamUrl and sends it through our own API.
  const proxiedUrl = `/api/proxy?url=${encodeURIComponent(streamUrl)}`;

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
  
  const handlePlayerError = (e: any) => {
      console.error('ReactPlayer Error:', e);
      setError('This stream could not be played. It may be offline or restricted.');
  };

  if (!isClient) {
    // Render a placeholder on the server to prevent hydration errors
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
          <ReactPlayer
            // We use the proxiedUrl here, NOT the original streamUrl
            url={proxiedUrl}
            playing={playing}
            muted={muted}
            width="100%"
            height="100%"
            controls={false}
            onError={handlePlayerError}
            config={{
              file: {
                // This forces the player to use hls.js for M3U8 files,
                // which provides the best HLS stream support.
                forceHLS: true,
              },
            }}
          />
        )}
        
        {!error && (
          <>
            <div className="center-controls">
              <button className="center-play-btn" onClick={() => setPlaying(!playing)}>
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
                  <button className="control-button" onClick={() => setPlaying(!playing)}>
                    {playing ? <PauseIcon /> : <PlayIcon />}
                  </button>
                  <button className="control-button" onClick={() => setMuted(!muted)}>
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
