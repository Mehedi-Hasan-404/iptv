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
  const playerWrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => setIsClient(true), []);

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

  if (!isClient) return <div className="video-player"><div className="video-wrapper bg-black" /></div>;

  return (
    <div ref={playerWrapperRef} className="video-player show-controls playing">
      <div className="video-wrapper">
        <ReactPlayer
          url={streamUrl}
          playing={playing}
          muted={muted}
          width="100%"
          height="100%"
          controls={false} // Use custom controls
        />
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
          {/* Progress bar can be added here if streams are not live */}
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
      </div>
    </div>
  );
};
export default VideoPlayer;
