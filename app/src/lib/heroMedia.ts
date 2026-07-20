import { asset } from '@/hooks/useSiteImages'

/** Swap hero background + copy here — no component edits needed. */
export type HeroBackgroundMode = 'video' | 'image'

/** Mixkit free-license clips — youth club, coaching, team spirit */
const MIXKIT = {
  kidsOutdoor: 'https://assets.mixkit.co/videos/750/750-720.mp4',
  kidsOneOnOne: 'https://assets.mixkit.co/videos/747/747-720.mp4',
  teamHuddle: 'https://assets.mixkit.co/videos/4588/4588-720.mp4',
  playersTraining: 'https://assets.mixkit.co/videos/2277/2277-720.mp4',
  outdoorTraining: 'https://assets.mixkit.co/videos/2291/2291-720.mp4',
} as const

export const HERO_CONFIG = {
  /** 'video' = real-life loop, 'image' = static hero photo */
  background: 'video' as HeroBackgroundMode,
  /** Local file in public/ — youth players at an outdoor court (Mixkit #750) */
  videoUrl: asset('hero-basketball.mp4'),
  /** Tried in order if the local file fails to load */
  videoFallbackUrls: [
    MIXKIT.kidsOutdoor,
    MIXKIT.playersTraining,
    MIXKIT.teamHuddle,
    MIXKIT.outdoorTraining,
  ],
  /** Static image while video loads or when motion is reduced */
  posterUrl: asset('about-team-huddle.jpg'),
  headline: 'Dublin Lions',
  subheadline: 'Players, parents & community.',
}
