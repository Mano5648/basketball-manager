import { useEffect, useState } from 'react'
import { HERO_CONFIG } from '@/lib/heroMedia'

type ClubVideoBackgroundProps = {
  className?: string
  overlay?: 'hero' | 'portal' | 'subtle'
  showCourtLines?: boolean
}

const VIDEO_SOURCES = [HERO_CONFIG.videoUrl, ...HERO_CONFIG.videoFallbackUrls]

/** Full-bleed basketball club video with image fallback */
export default function ClubVideoBackground({
  className = '',
  overlay = 'hero',
  showCourtLines = false,
}: ClubVideoBackgroundProps) {
  const poster = HERO_CONFIG.posterUrl
  const [reducedMotion, setReducedMotion] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [sourceIndex, setSourceIndex] = useState(0)
  const videoSrc = VIDEO_SOURCES[sourceIndex] ?? VIDEO_SOURCES[0]
  const useVideo = HERO_CONFIG.background === 'video'

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReducedMotion(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const showVideo = useVideo && !reducedMotion

  const onVideoError = () => {
    setVideoReady(false)
    setSourceIndex((i) => (i < VIDEO_SOURCES.length - 1 ? i + 1 : i))
  }

  const overlayClass =
    overlay === 'portal'
      ? 'club-video-overlay club-video-overlay--portal'
      : overlay === 'subtle'
        ? 'club-video-overlay club-video-overlay--subtle'
        : 'club-video-overlay club-video-overlay--hero'

  return (
    <div className={`club-video-root ${className}`} aria-hidden="true">
      {showVideo ? (
        <video
          key={videoSrc}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={poster}
          onLoadedData={() => setVideoReady(true)}
          onCanPlay={() => setVideoReady(true)}
          onError={onVideoError}
          className={`club-video ${videoReady ? 'club-video--ready' : ''}`}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      ) : null}

      {(!showVideo || !videoReady) && (
        <img src={poster} alt="" className="club-video-fallback" />
      )}

      <div className={overlayClass} />
      {showCourtLines && <div className="club-court-lines" />}
      <div className="club-video-grain" />
    </div>
  )
}
