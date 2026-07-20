import { motion, useReducedMotion } from 'motion/react'
import { HERO_CONFIG } from '@/lib/heroMedia'
import { easeOut } from '@/components/motion/presets'

export default function HeroHeadline({ className = '' }: { className?: string }) {
  const words = HERO_CONFIG.headline.split(' ')
  const reduceMotion = useReducedMotion()
  const headlineDelay = 0.35

  return (
    <div className={className}>
      <motion.p
        className="font-inter text-[11px] md:text-xs uppercase tracking-[0.32em] text-warn-400/90 mb-5"
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1, ease: easeOut }}
      >
        Basketball Club
      </motion.p>

      <h1
        className="ldf-headline text-white"
        style={{ fontSize: 'clamp(3rem, 8vw, 6.5rem)' }}
      >
        {words.map((word, i) => (
          <motion.span
            key={`${word}-${i}`}
            className="inline-block mr-[0.22em] overflow-hidden pb-[0.06em]"
            initial={reduceMotion ? false : { opacity: 0, y: '120%', rotateX: 40 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 0.9, delay: headlineDelay + i * 0.12, ease: easeOut }}
            style={{ transformOrigin: '50% 100%', perspective: 800 }}
          >
            {word}
          </motion.span>
        ))}
      </h1>

      <motion.span
        className="mx-auto mt-6 block h-[3px] w-16 rounded-full bg-gradient-to-r from-warn-500 via-warn-400 to-lions-400"
        initial={reduceMotion ? false : { opacity: 0, scaleX: 0 }}
        animate={{ opacity: 1, scaleX: 1 }}
        transition={{ duration: 0.7, delay: headlineDelay + words.length * 0.12 + 0.15, ease: easeOut }}
        style={{ transformOrigin: 'center' }}
        aria-hidden
      />

      <motion.p
        className="mt-7 font-inter text-lg md:text-xl text-white/80 max-w-md mx-auto leading-relaxed"
        initial={reduceMotion ? false : { opacity: 0, y: 18, filter: 'blur(6px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{
          duration: 0.75,
          delay: headlineDelay + words.length * 0.12 + 0.35,
          ease: easeOut,
        }}
      >
        {HERO_CONFIG.subheadline}
      </motion.p>
    </div>
  )
}
