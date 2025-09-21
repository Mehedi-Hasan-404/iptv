// src/components/main/Icons.tsx
'use client';

// This file serves as a central hub for all icons used in the main application.
// We are using the 'lucide-react' library for a consistent and modern icon set.
// By re-exporting them here, we can easily swap out the icon library in the future
// without having to change the import paths in every single component.

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
} from 'lucide-react';

// Navigation and General UI Icons
export const HomeIcon = Home;
export const SettingsIcon = Settings;
export const SearchIcon = Search;
export const XIcon = X; // For the 'clear search' button
export const LogOutIcon = LogOut;

// Logo Icon
export const LogoIcon = Tv; // Using the 'Tv' icon as the main app logo

// Video Player Control Icons
export const PlayIcon = Play;
export const PauseIcon = Pause;
export const VolumeMaxIcon = Volume2;
export const VolumeMuteIcon = VolumeX;
export const FullscreenEnterIcon = Maximize;
export const FullscreenExitIcon = Minimize;
export const RotateIcon = RotateCw;
export const PipIcon = PictureInPicture;
