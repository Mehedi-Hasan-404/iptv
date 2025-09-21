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
            url={proxiedUrl}
            playing={playing}
            muted={muted}
            width="100%"
            height="100%"
            controls={false}
            onError={handlePlayerError}
            config={{
              file: {
                forceHLS: true,
                // --- START OF NEW CONFIG ---
                // This tells hls.js how to process the rewritten playlist
                hlsOptions: {
                  // This function will be called for every line in the M3U8
                  // It ensures our proxy is correctly prepended
                  url: proxiedUrl 
                },
                // --- END OF NEW CONFIG ---
              },
            }}
          />
        )}
        
        {/* The rest of your UI is unchanged */}
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
