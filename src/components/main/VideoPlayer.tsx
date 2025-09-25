// /src/components/main/SimpleVideoPlayer.tsx
'use client';
import { useRef, useEffect, useState } from 'react';
import Hls from 'hls.js';
import { 
  PauseIcon, 
  PlayIcon, 
  FullscreenEnterIcon, 
  FullscreenExitIcon, 
  VolumeMaxIcon, 
  VolumeMuteIcon,
  SettingsIcon
} from './Icons';

interface SimpleVideoPlayerProps {
  streamUrl: string;
  channelName: string;
}

const SimpleVideoPlayer = ({ streamUrl, channelName }: SimpleVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);
  const [showControls, setShowControls] = useState(false);
  const [showQuality, setShowQuality] = useState(false);
  const [qualities, setQualities] = useState<any[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1);

  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    
    // Use proxy for all streams
    const proxiedUrl = `/api/proxy?url=${encodeURIComponent(streamUrl)}`;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });

      hlsRef.current = hls;
      hls.loadSource(proxiedUrl);
      hls.attachMedia(video);
      
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play();
        setQualities(hls.levels);
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentQuality(data.level);
      });

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = proxiedUrl;
      video.play();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [streamUrl]);

  const togglePlay = () => {
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

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setMuted(videoRef.current.muted);
    }
  };

  const toggleFullscreen = () => {
    if (playerRef.current) {
      if (!document.fullscreenElement) {
        playerRef.current.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    }
  };

  const changeQuality = (level: number) => {
    if (hlsRef.current) {
      hlsRef.current.currentLevel = level;
      setShowQuality(false);
    }
  };

  return (
    <div 
      ref={playerRef}
      className="video-player"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <div className="video-wrapper">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full"
        />
        
        {showControls && (
          <div className="custom-controls">
            <div className="controls-bottom">
              <div className="controls-left">
                <button className="control-button" onClick={togglePlay}>
                  {playing ? <PauseIcon /> : <PlayIcon />}
                </button>
                <button className="control-button" onClick={toggleMute}>
                  {muted ? <VolumeMuteIcon /> : <VolumeMaxIcon />}
                </button>
              </div>
              
              <div className="controls-right">
                {qualities.length > 0 && (
                  <div className="relative">
                    <button 
                      className="control-button"
                      onClick={() => setShowQuality(!showQuality)}
                    >
                      <SettingsIcon />
                    </button>
                    
                    {showQuality && (
                      <div className="absolute bottom-8 right-0 bg-black/90 rounded p-2 text-sm">
                        <div 
                          className={`px-3 py-1 cursor-pointer hover:bg-white/20 ${currentQuality === -1 ? 'text-blue-400' : ''}`}
                          onClick={() => changeQuality(-1)}
                        >
                          Auto
                        </div>
                        {qualities.map((q, i) => (
                          <div 
                            key={i}
                            className={`px-3 py-1 cursor-pointer hover:bg-white/20 ${currentQuality === i ? 'text-blue-400' : ''}`}
                            onClick={() => changeQuality(i)}
                          >
                            {q.height}p
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                <button className="control-button" onClick={toggleFullscreen}>
                  <FullscreenEnterIcon />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimpleVideoPlayer;
