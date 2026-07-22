import { useEffect, useRef, useState } from 'react'
import { HERO_CONFIG } from '@/lib/heroMedia'

type ClubVideoBackgroundProps = {
  className?: string
  overlay?: 'hero' | 'portal' | 'subtle'
  showCourtLines?: boolean
}

const VIDEO_SOURCES = [HERO_CONFIG.videoUrl, ...HERO_CONFIG.videoFallbackUrls]

/** Full-bleed basketball club video with image fallback + resilient playback:
 *  - Resumes when the tab returns to the foreground (browsers stall bg tabs).
 *  - Retries play() on stalled / suspended / paused events.
 *  - Rotates through fallback sources on hard errors.
 *  - Lightweight interval (every 4 s) nudges the video back into play if it
 *    silently stopped (mobile power-saving, autoplay policy re-arms, etc.).
 */
export default function ClubVideoBackground({
  className = '',
  overlay = 'hero',
  showCourtLines = false,
}: ClubVideoBackgroundProps) {
  const poster = HERO_CONFIG.posterUrl
  const [reducedMotion, setReducedMotion] = useState(false)
  const [videoReady, setVideoReady] = useState(false)
  const [sourceIndex, setSourceIndex] = useState(0)
  const videoRef = useRef<HTMLVideoElement | null>(null)
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

  // Keep the video playing even when the browser stalls it (backgrounded tab,
  // autoplay policy retry, mobile power-save). Any silent pause is nudged back
  // into play() automatically. This is what fixes the "video freezes from time
  // to time" complaint on the Home hero.
  useEffect(() => {
    if (!showVideo) return
    const v = videoRef.current
    if (!v) return

    const tryPlay = () => {
      // muted + playsInline means the promise resolves silently in all modern
      // browsers; swallow rejections (e.g. still-suspended tab) — the next
      // tick will retry.
      const p = v.play()
      if (p && typeof p.catch === 'function') p.catch(() => {})
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') tryPlay()
    }

    const keepAlive = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      // Video reports ended even when looping is on if the source stalled.
      if (v.paused || v.ended || v.readyState < 2) tryPlay()
    }, 4000)

    document.addEventListener('visibilitychange', onVisibility)
    v.addEventListener('stalled', tryPlay)
    v.addEventListener('suspend', tryPlay)
    v.addEventListener('pause', tryPlay)
    v.addEventListener('waiting', tryPlay)

    // Nudge once on mount so we start playing even if autoplay was deferred.
    tryPlay()

    return () => {
      window.clearInterval(keepAlive)
      document.removeEventListener('visibilitychange', onVisibility)
      v.removeEventListener('stalled', tryPlay)
      v.removeEventListener('suspend', tryPlay)
      v.removeEventListener('pause', tryPlay)
      v.removeEventListener('waiting', tryPlay)
    }
  }, [showVideo, videoSrc])

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
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          onLoadedData={() => setVideoReady(true)}
          onCanPlay={() => setVideoReady(true)}
          onError={onVideoError}
          className={`club-video ${videoReady ? 'club-video--ready' : ''}`}
        >
          <source src={videoSrc} type="video/mp4" />
        </video>
      ) : (
        // Only show the poster image when we're NOT trying to play the video
        // (reduced motion / image mode). This avoids the "other image" flashing
        // in for a beat on refresh before the video takes over.
        <img src={poster} alt="" className="club-video-fallback" />
      )}

      <div className={overlayClass} />
      {showCourtLines && <div className="club-court-lines" />}
      <div className="club-video-grain" />
    </div>
  )
}
