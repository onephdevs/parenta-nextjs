'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Building2,
  Shield,
  TrendingUp,
  Users,
  ArrowRight,
  MapPin,
  Star,
  ChevronDown,
  Plus,
  MessageSquare,
  CheckCircle2,
  X,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { HomeContactForm } from '@/components/features/HomeContactForm';
import type { PublicPortfolioPayload } from '@/lib/api/public-portfolio';

interface PortfolioStats {
  propertyCount: number;
  totalUnits: number;
  occupancyRate: number;
  availableUnits: number;
}

interface FeaturedProperty {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  address: string;
  totalUnits: number;
  availableUnits: number;
  startingRent: number | null;
  imageUrl: string | null;
}

interface LandingPageClientProps {
  initialPortfolio?: PublicPortfolioPayload | null;
}

function formatPhp(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(amount);
}

function locationLabel(p: FeaturedProperty): string {
  const parts = [p.city, p.state].filter(Boolean);
  if (parts.length) return parts.join(', ');
  return p.address || 'Location TBA';
}

export default function LandingPageClient({
  initialPortfolio = null,
}: LandingPageClientProps) {
  const [stats, setStats] = useState<PortfolioStats | null>(initialPortfolio?.stats ?? null);
  const [properties, setProperties] = useState<FeaturedProperty[]>(
    initialPortfolio?.properties ?? []
  );
  const [propertiesWithAvailability, setPropertiesWithAvailability] = useState(
    initialPortfolio?.propertiesWithAvailability ?? 0
  );
  const [totalProperties, setTotalProperties] = useState(
    initialPortfolio?.totalProperties ?? 0
  );
  const [loading, setLoading] = useState(!initialPortfolio);
  const [loginOpen, setLoginOpen] = useState(false);
  const [heroContact, setHeroContact] = useState('');
  const [heroSubmitting, setHeroSubmitting] = useState(false);
  const [heroError, setHeroError] = useState<string | null>(null);
  const [inquirySuccessOpen, setInquirySuccessOpen] = useState(false);
  const loginRef = useRef<HTMLDivElement>(null);
  const formStartedAt = useRef(Date.now());

  useEffect(() => {
    // Prefer client clock at mount so static/SSR prerender timestamps are not reused.
    formStartedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (initialPortfolio) return;
    fetchPortfolio();
  }, [initialPortfolio]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (loginRef.current && !loginRef.current.contains(e.target as Node)) {
        setLoginOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!inquirySuccessOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setInquirySuccessOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [inquirySuccessOpen]);

  const fetchPortfolio = async () => {
    try {
      const response = await fetch('/api/public/portfolio');
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setStats(result.data.stats);
          setProperties(result.data.properties || []);
          setPropertiesWithAvailability(result.data.propertiesWithAvailability || 0);
          setTotalProperties(result.data.totalProperties || 0);
        }
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Building2,
      title: 'Premium Properties',
      description: 'Carefully curated selection of high-quality residential and commercial properties',
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Advanced security systems and 24/7 property management support',
    },
    {
      icon: TrendingUp,
      title: 'Great Value',
      description: 'Competitive pricing with flexible payment options and transparent fees',
    },
    {
      icon: Users,
      title: 'Community First',
      description: 'Building thriving communities with excellent tenant services',
    },
  ];

  const featuredWithAvailability = properties.filter((p) => p.availableUnits > 0);
  const featuredCards = featuredWithAvailability.slice(0, 2);
  const availableForForm = featuredWithAvailability.map((p) => ({
    id: p.id,
    name: p.name,
    availableUnits: p.availableUnits,
  }));
  const heroImage =
    properties.find((p) => p.imageUrl)?.imageUrl || '/brand/rectangle-15.png';

  const submitHeroInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    const contact = heroContact.trim();
    if (!contact) {
      setHeroError('Please enter your email or phone number');
      return;
    }
    setHeroError(null);
    setHeroSubmitting(true);
    try {
      const response = await fetch('/api/public/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact,
          source: 'hero_banner',
          formStartedAt: formStartedAt.current,
          formElapsedMs: Date.now() - formStartedAt.current,
          hp_confirm: '',
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) {
        setHeroError(
          typeof result.error === 'string'
            ? result.error
            : 'Unable to send your inquiry. Please try again.'
        );
        return;
      }
      setHeroContact('');
      setInquirySuccessOpen(true);
      formStartedAt.current = Date.now();
    } catch {
      setHeroError('Unable to send your inquiry. Please try again.');
    } finally {
      setHeroSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center" aria-label="Alfonso Properties">
              <BrandLogo
                variant="full"
                height={36}
                priority
                className="max-w-[12rem] brightness-0 invert sm:max-w-none"
              />
            </Link>
            <nav className="hidden items-center gap-8 md:flex">
              <a href="#properties" className="text-sm text-white/65 transition hover:text-white">
                Properties
              </a>
              <a href="#features" className="text-sm text-white/65 transition hover:text-white">
                Why us
              </a>
              <a href="#reviews" className="text-sm text-white/65 transition hover:text-white">
                Reviews
              </a>
              <a href="#contact" className="text-sm text-white/65 transition hover:text-white">
                Contact
              </a>
            </nav>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="relative" ref={loginRef}>
                <button
                  type="button"
                  onClick={() => setLoginOpen((o) => !o)}
                  aria-expanded={loginOpen}
                  aria-haspopup="menu"
                  className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white"
                >
                  Log in
                  <ChevronDown
                    className={`h-4 w-4 text-white/50 transition ${loginOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                {loginOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-2 w-48 overflow-hidden rounded-2xl border border-white/10 bg-[#111] py-1 shadow-xl"
                  >
                    <Link
                      href="/auth/tenant/signin"
                      role="menuitem"
                      className="block px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-white"
                      onClick={() => setLoginOpen(false)}
                    >
                      Tenant portal
                    </Link>
                    <Link
                      href="/auth/admin/signin"
                      role="menuitem"
                      className="block px-4 py-2.5 text-sm text-white/45 hover:bg-white/5 hover:text-white/80"
                      onClick={() => setLoginOpen(false)}
                    >
                      Staff login
                    </Link>
                  </div>
                )}
              </div>
              <a
                href="#contact"
                className="inline-flex items-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-100"
              >
                Inquire
              </a>
            </div>
          </div>
        </div>
      </header>

      <section className="relative isolate min-h-[min(88vh,52rem)] overflow-hidden bg-black">
        {/* eslint-disable-next-line @next/next/no-img-element -- dynamic portfolio / brand fallback */}
        <img
          src={heroImage}
          alt=""
          className="absolute inset-0 h-full w-full object-cover object-[68%_center]"
        />
        <div
          className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/15"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40" aria-hidden />

        <div className="relative mx-auto flex min-h-[min(88vh,52rem)] max-w-7xl items-center px-4 py-20 sm:px-6 lg:px-8">
          <div className="w-full max-w-xl lg:max-w-2xl">
            <p className="mb-4 text-sm font-semibold tracking-[0.2em] text-white/70 uppercase">
              Alfonso Properties
            </p>
            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Find your next home — we&apos;ll help you get there
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-white/75 sm:text-xl">
              Browse available units and send a quick inquiry. Our team will follow up to match you
              with a place you&apos;ll love to call home.
            </p>

            <form
              onSubmit={submitHeroInquiry}
              className="mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row sm:items-stretch"
            >
              <label htmlFor="hero-contact" className="sr-only">
                Email or phone
              </label>
              <input
                id="hero-contact"
                type="text"
                inputMode="email"
                value={heroContact}
                onChange={(e) => {
                  setHeroContact(e.target.value);
                  if (heroError) setHeroError(null);
                }}
                placeholder="Email or phone number"
                autoComplete="email"
                disabled={heroSubmitting}
                className="min-h-12 flex-1 rounded-full border-0 bg-white px-5 text-sm text-gray-900 shadow-lg outline-none placeholder:text-gray-400 focus:ring-2 focus:ring-white/50 disabled:opacity-70"
              />
              <button
                type="submit"
                disabled={heroSubmitting}
                className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-gray-900 transition hover:bg-gray-100 disabled:opacity-70"
              >
                {heroSubmitting ? 'Sending…' : 'Inquire'}
              </button>
            </form>
            {heroError && (
              <p className="mt-2 text-sm text-red-300" role="alert">
                {heroError}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <a
                href="#properties"
                className="inline-flex items-center gap-1.5 font-medium text-white/85 underline-offset-4 hover:underline"
              >
                See available units
                <ArrowRight className="h-4 w-4" />
              </a>
              <span className="hidden text-white/30 sm:inline" aria-hidden>
                ·
              </span>
              <Link
                href="/auth/tenant/signin"
                className="font-medium text-white/55 underline-offset-4 hover:text-white hover:underline"
              >
                Already a tenant? Log in
              </Link>
            </div>

            {stats && (
              <p className="mt-8 text-sm text-white/45">
                {stats.availableUnits > 0
                  ? `${stats.availableUnits} unit${stats.availableUnits === 1 ? '' : 's'} available across ${stats.propertyCount} ${stats.propertyCount === 1 ? 'property' : 'properties'}`
                  : `${stats.propertyCount} ${stats.propertyCount === 1 ? 'property' : 'properties'} under management`}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* After hero: black continues; one inset green card (not full-bleed sheets) */}
      <section id="features" className="bg-black px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#143d32] via-[#0c2e26] to-[#071a16] p-8 sm:rounded-[2rem] sm:p-12 lg:p-16">
          <div className="max-w-3xl">
            <p className="text-3xl font-semibold tracking-tight sm:text-4xl lg:text-[2.75rem] lg:leading-tight">
              <span className="text-white">Live where it feels right.</span>{' '}
              <span className="text-white/40">
                Managed properties, clear pricing, and a portal that makes renting simpler.
              </span>
            </p>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">
              Professional management with a modern tenant experience — from finding a unit to paying
              rent and requesting maintenance.
            </p>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-white/10 bg-black/25 p-5 transition hover:border-white/20 hover:bg-black/35"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/5">
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Seamless dark continuum — blends darker toward the footer */}
      <section
        id="properties"
        className="bg-gradient-to-b from-black via-[#070b12] to-[#050a14] px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Featured properties
              </h2>
              <p className="mt-3 text-lg text-white/55">
                Explore units with current availability.
              </p>
            </div>
            <a
              href="#contact"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-white/70 underline-offset-4 hover:text-white hover:underline"
            >
              Ask about a unit
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="animate-pulse overflow-hidden rounded-3xl border border-white/10 bg-white/5"
                >
                  <div className="h-52 bg-white/10" />
                  <div className="space-y-3 p-6">
                    <div className="h-5 w-2/3 rounded bg-white/10" />
                    <div className="h-4 w-1/2 rounded bg-white/10" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredCards.length > 0 ? (
            <>
              <div className="grid gap-6 md:grid-cols-3">
                {featuredCards.map((building) => {
                  const lowAvailability = building.availableUnits <= 1;
                  return (
                    <div
                      key={building.id}
                      className="group overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] transition hover:border-white/25"
                    >
                      <div className="relative h-52 bg-[#1a1a1a]">
                        {building.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- dynamic API/blob paths
                          <img
                            src={building.imageUrl}
                            alt={building.name}
                            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Building2 className="h-14 w-14 text-white/20" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <div
                          className={`absolute top-4 left-4 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm ${
                            lowAvailability ? 'bg-white/90 text-gray-900' : 'bg-white text-gray-900'
                          }`}
                        >
                          {building.availableUnits} unit
                          {building.availableUnits === 1 ? '' : 's'} available
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-semibold text-white">{building.name}</h3>
                        <div className="mt-2 flex items-center text-white/45">
                          <MapPin className="mr-2 h-4 w-4 shrink-0" />
                          <span className="text-sm">{locationLabel(building)}</span>
                        </div>
                        {building.startingRent != null && building.startingRent > 0 && (
                          <p className="mt-4 text-lg font-semibold text-white">
                            {formatPhp(building.startingRent)}
                            <span className="text-sm font-normal text-white/45"> /mo starting</span>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}

                <a
                  href="#contact"
                  className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/20 bg-transparent p-8 text-center transition hover:border-white/40 hover:bg-white/[0.03]"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/15">
                    <Plus className="h-5 w-5 text-white/70" />
                  </div>
                  <p className="text-sm text-white/55">
                    More listings added regularly —{' '}
                    <span className="font-semibold text-white">get notified →</span>
                  </p>
                </a>
              </div>
              <p className="mt-10 text-center text-sm text-white/35">
                Showing {featuredCards.length} of {totalProperties}{' '}
                {totalProperties === 1 ? 'property' : 'properties'}
                {propertiesWithAvailability > 0 ? ' with current availability' : ''}
              </p>
            </>
          ) : (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] py-16 text-center">
              <Building2 className="mx-auto mb-4 h-14 w-14 text-white/25" />
              <p className="text-lg text-white">Properties coming soon</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-white/45">
                {totalProperties > 0
                  ? `We manage ${totalProperties} ${totalProperties === 1 ? 'property' : 'properties'} — check back for availability, or leave an inquiry below.`
                  : "Leave an inquiry below and we'll reach out when units open up."}
              </p>
              <a
                href="#contact"
                className="mt-6 inline-flex items-center text-sm font-semibold text-white underline-offset-4 hover:underline"
              >
                Get in touch
                <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </div>
          )}
        </div>
      </section>

      <section
        id="reviews"
        className="bg-gradient-to-b from-[#050a14] to-[#03060c] px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">What our tenants say</h2>
            <p className="mt-3 text-lg text-white/55">Real feedback from real residents.</p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <div className="mb-4 flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-4 w-4 fill-current text-white" />
                ))}
              </div>
              <p className="mb-6 text-white/80 italic">
                &ldquo;Quick response on my maintenance request and the online payment made rent so
                much easier.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-semibold text-gray-900"
                  aria-hidden
                >
                  TB
                </div>
                <div>
                  <div className="font-semibold text-white">Tiffa B.</div>
                  <div className="text-sm text-white/40">Tenant since 2026</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/15 p-8 text-center">
              <MessageSquare className="mb-3 h-8 w-8 text-white/25" />
              <p className="text-sm text-white/40">More reviews coming as our community grows.</p>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="bg-black px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Get in touch</h2>
            <p className="mt-3 text-lg text-white/55">
              Interested in a unit? Leave your name and email — we&apos;ll follow up.
            </p>
          </div>

          <div className="mx-auto max-w-xl">
            <HomeContactForm availableBuildings={availableForForm} variant="dark" />
          </div>
        </div>
      </section>

      {/* Shopify-style footer */}
      <footer className="border-t border-white/10 bg-black">
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-10 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            <div>
              <div className="mb-6">
                <BrandLogo variant="full" height={36} className="brightness-0 invert" />
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-white/45">
                Professional property management for modern living.
              </p>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold text-white">Alfonso Properties</h4>
              <ul className="space-y-3 text-sm text-white/55">
                <li>
                  <a href="#properties" className="transition hover:text-white">
                    Properties
                  </a>
                </li>
                <li>
                  <a href="#features" className="transition hover:text-white">
                    Why us
                  </a>
                </li>
                <li>
                  <a href="#reviews" className="transition hover:text-white">
                    Reviews
                  </a>
                </li>
                <li>
                  <a href="#contact" className="transition hover:text-white">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold text-white">For tenants</h4>
              <ul className="space-y-3 text-sm text-white/55">
                <li>
                  <a href="#contact" className="transition hover:text-white">
                    Send an inquiry
                  </a>
                </li>
                <li>
                  <Link href="/auth/tenant/signin" className="transition hover:text-white">
                    Tenant login
                  </Link>
                </li>
                <li>
                  <Link href="/auth/tenant/signin" className="transition hover:text-white">
                    Payments
                  </Link>
                </li>
                <li>
                  <Link href="/auth/tenant/signin" className="transition hover:text-white">
                    Maintenance
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold text-white">Support</h4>
              <ul className="space-y-3 text-sm text-white/55">
                <li>
                  <a href="#contact" className="transition hover:text-white">
                    Get in touch
                  </a>
                </li>
                <li>
                  <a href="#properties" className="transition hover:text-white">
                    Available units
                  </a>
                </li>
                <li>
                  <Link href="/auth/admin/signin" className="transition hover:text-white">
                    Staff login
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-14 flex flex-col gap-4 border-t border-white/10 pt-8 text-sm text-white/40 sm:flex-row sm:items-center sm:justify-between">
            <p>
              &copy; {new Date().getFullYear()} Alfonso Properties. All rights reserved.
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <a href="#contact" className="transition hover:text-white">
                Privacy
              </a>
              <a href="#contact" className="transition hover:text-white">
                Terms
              </a>
              <Link href="/auth/admin/signin" className="transition hover:text-white">
                Staff
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {inquirySuccessOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="inquiry-success-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Close"
            onClick={() => setInquirySuccessOpen(false)}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-br from-[#143d32] via-[#0c2e26] to-[#071a16] p-8 shadow-2xl sm:p-10">
            <button
              type="button"
              onClick={() => setInquirySuccessOpen(false)}
              className="absolute top-4 right-4 rounded-full p-2 text-white/50 transition hover:bg-white/10 hover:text-white"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full border border-white/15 bg-black/25">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
            <h2 id="inquiry-success-title" className="text-2xl font-semibold tracking-tight text-white">
              Inquiry sent
            </h2>
            <p className="mt-3 text-base leading-relaxed text-white/60">
              Thanks for reaching out. We received your inquiry and will get back to you soon.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setInquirySuccessOpen(false)}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-gray-900 transition hover:bg-gray-100"
              >
                Done
              </button>
              <a
                href="#properties"
                onClick={() => setInquirySuccessOpen(false)}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-white/25 px-5 text-sm font-semibold text-white transition hover:border-white/50 hover:bg-white/5"
              >
                Browse units
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
