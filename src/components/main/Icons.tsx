'use client';

import {
  Home,
  Settings,
  Tv,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Search,
  X,
  RotateCw,
  PictureInPicture,
  LogOut,
  Check,
} from 'lucide-react';

// Navigation and General UI Icons
export const HomeIcon = Home;
export const SettingsIcon = Settings;
export const SearchIcon = Search;
export const XIcon = X;
export const LogOutIcon = LogOut;
export const CheckIcon = Check;

// Logo Icon
export const LogoIcon = Tv;

// Video Player Control Icons
export const PlayIcon = Play;
export const PauseIcon = Pause;
export const VolumeMaxIcon = Volume2;
export const VolumeMuteIcon = VolumeX;
export const FullscreenEnterIcon = Maximize;
export const FullscreenExitIcon = Minimize;
export const RotateIcon = RotateCw;
export const PipIcon = PictureInPicture;

// Export RotateCw as well for backward compatibility
export { RotateCw };
