import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSiteImage } from '@/hooks/useSiteImages'
import {
  ChevronRight,
  Mail,
  Phone,
  MapPin,
  Instagram,
  User,
  Clock,
  Send,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
} from 'lucide-react'
import { HoneypotField, PrivacyConsentField } from '@/components/security/PrivacyConsentField'
import { TurnstileWidget } from '@/components/security/TurnstileWidget'
import { validatePublicFormSecurity } from '@/lib/security'

// ─── Validation Schema ───
const contactSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  subject: z.string().min(1, 'Please select a subject'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
})

type ContactFormData = z.infer<typeof contactSchema>

// ─── Scroll Reveal Hook ───
function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, visible }
}

// ─── FAQ Data ───
const faqs = [
  {
    question: 'How do I join Dublin Lions Basketball Club?',
    answer:
      'We welcome players of all skill levels. Fill out the membership form on our home page or contact our Club Secretary Jack Maguire. We offer trial sessions before you commit to a full season.',
  },
  {
    question: 'What are the membership fees?',
    answer:
      'Youth Member: \u20AC150/season. Adult Player: \u20AC250/season (or \u20AC50/month instalments). Supporter: \u20AC50/season. Fees cover training, match access, and club gear.',
  },
  {
    question: 'When and where do you train?',
    answer:
      'Training takes place at Col\u00E1iste Br\u00EDde in Clondalkin, Dublin 22. Men\u2019s team trains Tuesday and Thursday evenings. Women\u2019s team trains Monday and Wednesday evenings.',
  },
  {
    question: 'Do you offer sponsorship opportunities?',
    answer:
      'Yes! We partner with local businesses through jersey sponsorship, venue branding, and event partnerships. Contact us for a sponsorship pack.',
  },
  {
    question: 'Can I support the club without playing?',
    answer:
      'Absolutely. Our Supporter membership (\u20AC50/season) includes a season ticket to all home games, club newsletter, merchandise discount, and invites to club social events.',
  },
]

// ─── Contact Detail Items ───
const contactItems = [
  {
    icon: Mail,
    title: 'General Enquiries',
    lines: ['info@dublinlions.ie', 'We typically respond within 24 hours.'],
  },
  {
    icon: User,
    title: 'Membership Questions',
    lines: ['Jack Maguire, Club Secretary', 'membership@dublinlions.ie'],
  },
  {
    icon: Phone,
    title: 'Phone',
    lines: ['+353 1 234 5678'],
  },
  {
    icon: Clock,
    title: 'Training Times',
    lines: ['Tuesdays & Thursdays', '19:00 \u2014 21:00'],
  },
  {
    icon: MapPin,
    title: 'Home Venue',
    lines: ['Col\u00E1iste Br\u00EDde', 'New Road, Clondalkin', 'Dublin 22, Ireland'],
  },
  {
    icon: Instagram,
    title: 'Follow the Pride',
    lines: [
      '@dublinlionsbc on Instagram',
      'Facebook: Dublin Lions Basketball Club',
    ],
  },
]

// ─── FAQ Accordion Component ───
function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="space-y-3">
      {faqs.map((faq, i) => {
        const isOpen = openIndex === i
        return (
          <div
            key={i}
            className={`bg-white rounded-lg shadow-sm overflow-hidden transition-all duration-200 ${
              isOpen ? 'border-l-[3px] border-l-electric-blue' : 'border-l-[3px] border-l-transparent'
            }`}
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center justify-between p-5 text-left"
            >
              <span className="font-inter font-semibold text-base text-deep-navy pr-4">
                {faq.question}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            <div
              className="overflow-hidden transition-all duration-300 ease-out"
              style={{ maxHeight: isOpen ? '200px' : '0px' }}
            >
              <p className="px-5 pb-5 font-inter text-base text-slate-700 leading-relaxed">
                {faq.answer}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main Page ───
export default function Contact() {
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [submitError, setSubmitError] = useState('')
  const [formStartedAt] = useState(() => Date.now())
  const [honeypot, setHoneypot] = useState('')
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const venueImg = useSiteImage('venue')

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  })

  const onSubmit = async (data: ContactFormData) => {
    setSubmitError('')
    const security = validatePublicFormSecurity({
      honeypot,
      formStartedAt,
      rateLimitKey: `contact:${data.email.toLowerCase()}`,
      privacyAccepted,
      turnstileToken,
      maxAttempts: 5,
    })
    if (!security.ok) {
      setSubmitState('error')
      setSubmitError(security.error)
      return
    }

    setSubmitState('loading')
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500))
    console.log('Form submitted:', data)
    setSubmitState('success')
    setTurnstileToken('')
    setTimeout(() => {
      setSubmitState('idle')
      reset()
      setPrivacyAccepted(false)
    }, 3000)
  }

  const heroReveal = useScrollReveal()
  const formReveal = useScrollReveal()
  const detailsReveal = useScrollReveal()
  const mapReveal = useScrollReveal()
  const overlayReveal = useScrollReveal()
  const faqReveal = useScrollReveal()

  return (
    <div className="min-h-[100dvh]">
      {/* Hero */}
      <section className="relative h-48 md:h-64 bg-deep-navy flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={venueImg}
            alt="Venue"
            className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 hero-gradient-overlay" />
        </div>
        <div
          ref={heroReveal.ref}
          className={`section-reveal ${heroReveal.visible ? 'visible' : ''} relative text-center px-4 z-10`}
        >
          <nav className="font-inter text-sm text-slate-400 mb-4">
            <Link to="/" className="hover:text-electric-blue transition-colors">Home</Link>
            <ChevronRight className="inline w-4 h-4 mx-1" />
            <span className="text-slate-300">Contact</span>
          </nav>
          <h1 className="font-oswald font-bold text-4xl md:text-5xl lg:text-6xl text-white tracking-tight">
            Contact the Pride
          </h1>
          <p className="font-inter text-base text-slate-300 max-w-xl mx-auto mt-4">
            We\u2019d love to hear from you. Membership, sponsorship, or just saying hello.
          </p>
        </div>
      </section>

      {/* Contact Form + Details */}
      <section className="bg-soft-white py-16 md:py-24">
        <div className="max-w-7xl mx-auto px-4 md:px-8 lg:px-12">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
            {/* Left \u2014 Contact Form */}
            <div
              ref={formReveal.ref}
              className={`section-reveal ${formReveal.visible ? 'visible' : ''} lg:col-span-3 bg-white rounded-2xl shadow-xl p-8 md:p-10`}
            >
              {submitState === 'success' ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="font-oswald font-bold text-2xl text-deep-navy">
                    Message Sent!
                  </h3>
                  <p className="font-inter text-base text-slate-600 mt-2">
                    We\u2019ll get back to you within 24 hours.
                  </p>
                </div>
              ) : (
                <>
                  <h2 className="font-oswald font-bold text-2xl text-deep-navy">
                    Send a Message
                  </h2>
                  <p className="font-inter text-base text-slate-600 mt-2">
                    Fill out the form below and we\u2019ll get back to you within 24 hours.
                  </p>

                  <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5 relative">
                    <HoneypotField value={honeypot} onChange={setHoneypot} />
                    {/* Name */}
                    <div>
                      <label className="font-inter font-medium text-sm text-slate-700 block mb-2">
                        Full Name
                      </label>
                      <input
                        {...register('name')}
                        type="text"
                        placeholder="e.g. Sarah O'Brien"
                        className={`w-full bg-white border ${
                          errors.name ? 'border-red-400 ring-2 ring-red-400/20' : 'border-slate-300'
                        } rounded px-4 py-3 font-inter text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-colors`}
                      />
                      {errors.name && (
                        <p className="flex items-center gap-1 mt-1.5 font-inter text-sm text-red-500">
                          <AlertCircle className="w-4 h-4" />
                          {errors.name.message}
                        </p>
                      )}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="font-inter font-medium text-sm text-slate-700 block mb-2">
                        Email Address
                      </label>
                      <input
                        {...register('email')}
                        type="email"
                        placeholder="sarah@example.com"
                        className={`w-full bg-white border ${
                          errors.email ? 'border-red-400 ring-2 ring-red-400/20' : 'border-slate-300'
                        } rounded px-4 py-3 font-inter text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-colors`}
                      />
                      {errors.email && (
                        <p className="flex items-center gap-1 mt-1.5 font-inter text-sm text-red-500">
                          <AlertCircle className="w-4 h-4" />
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="font-inter font-medium text-sm text-slate-700 block mb-2">
                        Phone Number <span className="text-slate-400">(optional)</span>
                      </label>
                      <input
                        {...register('phone')}
                        type="tel"
                        placeholder="+353 1 234 5678"
                        className="w-full bg-white border border-slate-300 rounded px-4 py-3 font-inter text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-colors"
                      />
                    </div>

                    {/* Subject */}
                    <div>
                      <label className="font-inter font-medium text-sm text-slate-700 block mb-2">
                        What is this about?
                      </label>
                      <div className="relative">
                        <select
                          {...register('subject')}
                          className={`w-full bg-white border ${
                            errors.subject ? 'border-red-400 ring-2 ring-red-400/20' : 'border-slate-300'
                          } rounded px-4 py-3 font-inter text-base text-slate-800 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-colors appearance-none`}
                        >
                          <option value="">Select a topic</option>
                          <option value="general">General Enquiry</option>
                          <option value="membership">Membership / Registration</option>
                          <option value="sponsorship">Sponsorship Opportunity</option>
                          <option value="press">Press / Media</option>
                          <option value="venue">Venue Hire</option>
                          <option value="other">Other</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                      </div>
                      {errors.subject && (
                        <p className="flex items-center gap-1 mt-1.5 font-inter text-sm text-red-500">
                          <AlertCircle className="w-4 h-4" />
                          {errors.subject.message}
                        </p>
                      )}
                    </div>

                    {/* Message */}
                    <div>
                      <label className="font-inter font-medium text-sm text-slate-700 block mb-2">
                        Your Message
                      </label>
                      <textarea
                        {...register('message')}
                        rows={6}
                        placeholder="Tell us what's on your mind..."
                        className={`w-full bg-white border ${
                          errors.message ? 'border-red-400 ring-2 ring-red-400/20' : 'border-slate-300'
                        } rounded px-4 py-3 font-inter text-base text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 transition-colors resize-none`}
                      />
                      {errors.message && (
                        <p className="flex items-center gap-1 mt-1.5 font-inter text-sm text-red-500">
                          <AlertCircle className="w-4 h-4" />
                          {errors.message.message}
                        </p>
                      )}
                    </div>

                    <PrivacyConsentField checked={privacyAccepted} onChange={setPrivacyAccepted} tone="light" />
                    <TurnstileWidget onVerify={setTurnstileToken} onExpire={() => setTurnstileToken('')} theme="light" />

                    {submitError && (
                      <p className="flex items-center gap-1 font-inter text-sm text-red-500">
                        <AlertCircle className="w-4 h-4" />
                        {submitError}
                      </p>
                    )}

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={submitState === 'loading'}
                      className="w-full bg-electric-blue text-white font-inter font-semibold text-base uppercase tracking-widest px-8 py-4 rounded hover:bg-blue-400 hover:scale-[1.01] hover:shadow-lg transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitState === 'loading' ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          Send Message
                          <Send className="w-[18px] h-[18px]" />
                        </>
                      )}
                    </button>

                    <p className="font-inter text-xs text-slate-500 mt-4 text-center">
                      Your information will only be used to respond to your enquiry. We never share your data.
                    </p>
                  </form>
                </>
              )}
            </div>

            {/* Right \u2014 Contact Details */}
            <div
              ref={detailsReveal.ref}
              className={`section-reveal ${detailsReveal.visible ? 'visible' : ''} lg:col-span-2 space-y-8`}
              style={{ transitionDelay: '200ms' }}
            >
              {contactItems.map((item, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-full flex items-center justify-center shrink-0">
                    <item.icon className="w-6 h-6 text-electric-blue" />
                  </div>
                  <div>
                    <h3 className="font-inter font-semibold text-lg text-deep-navy">
                      {item.title}
                    </h3>
                    {item.lines.map((line, j) => (
                      <p
                        key={j}
                        className={`font-inter mt-1 ${
                          j === item.lines.length - 1 && item.title !== 'Phone'
                            ? 'text-sm text-slate-500'
                            : 'text-base text-slate-700'
                        }`}
                      >
                        {line}
                      </p>
                    ))}
                    {item.title === 'Follow the Pride' && (
                      <a
                        href="https://instagram.com/dublinlionsbc"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-inter font-semibold text-sm text-electric-blue mt-2 hover:underline"
                      >
                        Visit Instagram
                        <ChevronRight className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="relative h-80 md:h-96 bg-slate-200 overflow-hidden">
        <div
          ref={mapReveal.ref}
          className={`section-reveal ${mapReveal.visible ? 'visible' : ''} w-full h-full`}
        >
          <img
            src={venueImg}
            alt="Map location"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/10" />
        </div>

        {/* Map Overlay Card */}
        <div
          ref={overlayReveal.ref}
          className={`section-reveal ${overlayReveal.visible ? 'visible' : ''} absolute bottom-6 left-6 bg-white rounded-xl shadow-xl p-5 max-w-xs z-10`}
          style={{ transitionDelay: '300ms' }}
        >
          <h3 className="font-inter font-semibold text-lg text-deep-navy">
            Col\u00E1iste Br\u00EDde
          </h3>
          <p className="font-inter text-sm text-slate-700 mt-1">
            New Road, Clondalkin
          </p>
          <p className="font-inter text-sm text-slate-700">Dublin 22, Ireland</p>
          <a
            href="https://maps.google.com/?q=Col%C3%A1iste+Br%C3%ADde+Clondalkin"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-inter font-semibold text-sm text-electric-blue mt-3 hover:underline"
          >
            Open in Google Maps
            <ChevronRight className="w-4 h-4" />
          </a>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="bg-soft-white py-16 md:py-20">
        <div className="max-w-3xl mx-auto px-4 md:px-8">
          <div
            ref={faqReveal.ref}
            className={`section-reveal ${faqReveal.visible ? 'visible' : ''} text-center mb-10`}
          >
            <h2 className="font-oswald font-bold text-3xl md:text-4xl text-deep-navy">
              Frequently Asked Questions
            </h2>
            <p className="font-inter text-base text-slate-600 mt-4">
              Quick answers to common questions.
            </p>
          </div>

          <div className="mt-10">
            <FAQAccordion />
          </div>
        </div>
      </section>
    </div>
  )
}
