'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Building2,
  Shield,
  TrendingUp,
  Users,
  ArrowRight,
  MapPin,
  Star,
  Plus,
  MessageSquare,
  CheckCircle2,
  X,
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { HomeContactForm } from '@/components/features/HomeContactForm';
import { NearbyAmenitiesSection } from '@/components/features/nearby/NearbyAmenitiesSection';
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
  latitude: number | null;
  longitude: number | null;
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

/** Customer landing — light modern palette, sharp hierarchy, glanceable CTAs. */
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
  const [heroContact, setHeroContact] = useState('');
  const [heroSubmitting, setHeroSubmitting] = useState(false);
  const [heroError, setHeroError] = useState<string | null>(null);
  const [inquirySuccessOpen, setInquirySuccessOpen] = useState(false);
  const formStartedAt = useRef(Date.now());

  useEffect(() => {
    formStartedAt.current = Date.now();
  }, []);

  useEffect(() => {
    if (initialPortfolio) return;
    void fetchPortfolio();
  }, [initialPortfolio]);

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
      description:
        'Carefully curated residential units with clear photos and pricing.',
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Responsive management and a portal built for day-to-day living.',
    },
    {
      icon: TrendingUp,
      title: 'Great Value',
      description: 'Transparent fees and competitive rents you can compare at a glance.',
    },
    {
      icon: Users,
      title: 'Community First',
      description: 'From move-in to maintenance — support that stays close.',
    },
  ];

  const featuredWithAvailability = properties.filter((p) => p.availableUnits > 0);
  const featuredCards = featuredWithAvailability.slice(0, 2);
  const availableForForm = featuredWithAvailability.map((p) => ({
    id: p.id,
    name: p.name,
    availableUnits: p.availableUnits,
  }));
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
    <div className="landing-page min-h-screen bg-[#F8FAFC] font-[family-name:var(--font-lato)] text-[#111827]">
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center" aria-label="Alfonso Properties">
              <BrandLogo
                variant="full"
                height={36}
                priority
                className="max-w-[12rem] sm:max-w-none"
              />
            </Link>
            <nav className="hidden items-center gap-8 md:flex">
              <a
                href="#properties"
                className="text-sm font-medium text-[#6B7280] transition hover:text-[#111827]"
              >
                Properties
              </a>
              <a
                href="#nearby"
                className="text-sm font-medium text-[#6B7280] transition hover:text-[#111827]"
              >
                Nearby
              </a>
              <a
                href="#features"
                className="text-sm font-medium text-[#6B7280] transition hover:text-[#111827]"
              >
                Why us
              </a>
              <a
                href="#reviews"
                className="text-sm font-medium text-[#6B7280] transition hover:text-[#111827]"
              >
                Reviews
              </a>
              <a
                href="#contact"
                className="text-sm font-medium text-[#6B7280] transition hover:text-[#111827]"
              >
                Contact
              </a>
            </nav>
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/auth/signin"
                className="inline-flex items-center rounded-xl px-3.5 py-2 text-sm font-medium text-[#6B7280] transition hover:bg-slate-100 hover:text-[#111827]"
              >
                Log in
              </Link>
              <a
                href="#contact"
                className="inline-flex items-center rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1D4ED8]"
              >
                Inquire
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Hero: copy on the left, full room on the right, soft white blend (not property photos). */}
      <section className="landing-hero-fade relative isolate min-h-[calc(100dvh-4rem)] overflow-hidden bg-[#F8FAFC]">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <Image
            src="/brand/hero-room.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-[68%_center]"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, #F8FAFC 0%, rgba(248,250,252,0.92) 28%, rgba(248,250,252,0.55) 46%, rgba(248,250,252,0.18) 64%, transparent 82%)',
            }}
          />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="w-full max-w-xl lg:max-w-[32rem] xl:max-w-xl">
            <p className="mb-3 font-[family-name:var(--font-geist-sans)] text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl">
              Alfonso Properties
            </p>
            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-[#111827] sm:text-5xl lg:text-[3.25rem]">
              Find your next home —{' '}
              <span className="text-[#0EA5E9]">we&apos;ll help you get there</span>
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-[#6B7280] sm:text-xl">
              Browse available units and send a quick inquiry. Our team follows up to match you
              with a place you&apos;ll love.
            </p>

            <form
              onSubmit={submitHeroInquiry}
              className="landing-hero-float mt-8 flex w-full max-w-lg flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-2 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.45)] sm:flex-row sm:items-stretch"
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
                className="min-h-12 flex-1 rounded-xl border-0 bg-transparent px-4 text-sm text-[#111827] outline-none placeholder:text-[#9CA3AF] focus:ring-0 disabled:opacity-70"
              />
              <button
                type="submit"
                disabled={heroSubmitting}
                className="inline-flex min-h-12 shrink-0 items-center justify-center rounded-xl bg-[#2563EB] px-6 text-sm font-semibold text-white transition hover:bg-[#1D4ED8] disabled:opacity-70"
              >
                {heroSubmitting ? 'Sending…' : 'Inquire'}
              </button>
            </form>
            {heroError && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {heroError}
              </p>
            )}

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              <a
                href="#properties"
                className="inline-flex items-center gap-1.5 font-semibold text-[#2563EB] underline-offset-4 hover:underline"
              >
                See available units
                <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                href="/auth/signin"
                className="font-medium text-[#6B7280] underline-offset-4 hover:text-[#111827] hover:underline"
              >
                Already a tenant? Log in
              </Link>
            </div>

            {stats && (
              <p className="mt-8 text-sm text-[#6B7280]">
                {stats.availableUnits > 0
                  ? `${stats.availableUnits} unit${stats.availableUnits === 1 ? '' : 's'} available across ${stats.propertyCount} ${stats.propertyCount === 1 ? 'property' : 'properties'}`
                  : `${stats.propertyCount} ${stats.propertyCount === 1 ? 'property' : 'properties'} under management`}
              </p>
            )}
          </div>
        </div>
      </section>

      <section id="features" className="bg-white px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <h2 className="text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl">
              Live where it feels right
            </h2>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-[#6B7280]">
              Managed properties, clear pricing, and a portal that makes renting simpler — from
              finding a unit to paying rent and requesting maintenance.
            </p>
          </div>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="min-w-0">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-[#111827]">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section
        id="properties"
        className="bg-[radial-gradient(ellipse_at_top,rgba(37,99,235,0.06),transparent_55%)] bg-[#F8FAFC] px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <h2 className="text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl">
                Featured properties
              </h2>
              <p className="mt-3 text-lg text-[#6B7280]">
                Explore units with current availability.
              </p>
            </div>
            <a
              href="#contact"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2563EB] underline-offset-4 hover:underline"
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
                  className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white"
                >
                  <div className="h-52 bg-slate-100" />
                  <div className="space-y-3 p-6">
                    <div className="h-5 w-2/3 rounded bg-slate-100" />
                    <div className="h-4 w-1/2 rounded bg-slate-100" />
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
                    <a
                      key={building.id}
                      href="#contact"
                      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                    >
                      <div className="relative h-52 bg-slate-100">
                        {building.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element -- dynamic API/blob paths
                          <img
                            src={building.imageUrl}
                            alt={building.name}
                            className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Building2 className="h-14 w-14 text-slate-300" />
                          </div>
                        )}
                        <div
                          className={`absolute top-4 left-4 rounded-lg px-3 py-1 text-xs font-semibold shadow-sm ${
                            lowAvailability
                              ? 'bg-amber-50 text-amber-900'
                              : 'bg-white text-[#111827]'
                          }`}
                        >
                          {building.availableUnits} unit
                          {building.availableUnits === 1 ? '' : 's'} available
                        </div>
                      </div>
                      <div className="p-6">
                        <h3 className="text-xl font-semibold text-[#111827]">{building.name}</h3>
                        <div className="mt-2 flex items-center text-[#6B7280]">
                          <MapPin className="mr-2 h-4 w-4 shrink-0 text-[#0EA5E9]" />
                          <span className="text-sm">{locationLabel(building)}</span>
                        </div>
                        {building.startingRent != null && building.startingRent > 0 && (
                          <p className="mt-4 text-lg font-semibold text-[#111827]">
                            {formatPhp(building.startingRent)}
                            <span className="text-sm font-normal text-[#6B7280]">
                              {' '}
                              /mo starting
                            </span>
                          </p>
                        )}
                      </div>
                    </a>
                  );
                })}

                <a
                  href="#contact"
                  className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/60 p-8 text-center transition hover:border-[#2563EB]/40 hover:bg-white"
                >
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
                    <Plus className="h-5 w-5" />
                  </div>
                  <p className="text-sm text-[#6B7280]">
                    More listings added regularly —{' '}
                    <span className="font-semibold text-[#2563EB]">get notified →</span>
                  </p>
                </a>
              </div>
              <p className="mt-10 text-center text-sm text-[#9CA3AF]">
                Showing {featuredCards.length} of {totalProperties}{' '}
                {totalProperties === 1 ? 'property' : 'properties'}
                {propertiesWithAvailability > 0 ? ' with current availability' : ''}
              </p>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
              <Building2 className="mx-auto mb-4 h-14 w-14 text-slate-300" />
              <p className="text-lg font-semibold text-[#111827]">Properties coming soon</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-[#6B7280]">
                {totalProperties > 0
                  ? `We manage ${totalProperties} ${totalProperties === 1 ? 'property' : 'properties'} — check back for availability, or leave an inquiry below.`
                  : "Leave an inquiry below and we'll reach out when units open up."}
              </p>
              <a
                href="#contact"
                className="mt-6 inline-flex items-center text-sm font-semibold text-[#2563EB] underline-offset-4 hover:underline"
              >
                Get in touch
                <ArrowRight className="ml-1 h-4 w-4" />
              </a>
            </div>
          )}
        </div>
      </section>

      <NearbyAmenitiesSection
        properties={properties.map((p) => ({
          id: p.id,
          name: p.name,
          city: p.city,
          state: p.state,
          address: p.address,
          availableUnits: p.availableUnits,
          latitude: p.latitude ?? null,
          longitude: p.longitude ?? null,
        }))}
      />

      <section id="reviews" className="bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl">
              What our tenants say
            </h2>
            <p className="mt-3 text-lg text-[#6B7280]">Real feedback from real residents.</p>
          </div>
          <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-6">
              <div className="mb-4 flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star key={star} className="h-4 w-4 fill-[#0EA5E9] text-[#0EA5E9]" />
                ))}
              </div>
              <p className="mb-6 text-[#374151] italic">
                &ldquo;Quick response on my maintenance request and the online payment made rent so
                much easier.&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2563EB] text-sm font-semibold text-white"
                  aria-hidden
                >
                  TB
                </div>
                <div>
                  <div className="font-semibold text-[#111827]">Tiffa B.</div>
                  <div className="text-sm text-[#6B7280]">Tenant since 2026</div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 p-8 text-center">
              <MessageSquare className="mb-3 h-8 w-8 text-slate-300" />
              <p className="text-sm text-[#6B7280]">More reviews coming as our community grows.</p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="contact"
        className="bg-[radial-gradient(ellipse_at_bottom,rgba(14,165,233,0.08),transparent_55%)] bg-[#F8FAFC] px-4 py-20 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[#111827] sm:text-4xl">
              Get in touch
            </h2>
            <p className="mt-3 text-lg text-[#6B7280]">
              Interested in a unit? Leave your name and email — we&apos;ll follow up.
            </p>
          </div>

          <div className="mx-auto max-w-xl">
            <HomeContactForm availableBuildings={availableForForm} variant="light" />
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 pt-16 pb-10 sm:px-6 lg:px-8">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            <div>
              <div className="mb-6">
                <BrandLogo variant="full" height={36} />
              </div>
              <p className="max-w-xs text-sm leading-relaxed text-[#6B7280]">
                Professional property management for modern living.
              </p>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold text-[#111827]">Alfonso Properties</h4>
              <ul className="space-y-3 text-sm text-[#6B7280]">
                <li>
                  <a href="#properties" className="transition hover:text-[#2563EB]">
                    Properties
                  </a>
                </li>
                <li>
                  <a href="#nearby" className="transition hover:text-[#2563EB]">
                    Nearby
                  </a>
                </li>
                <li>
                  <a href="#features" className="transition hover:text-[#2563EB]">
                    Why us
                  </a>
                </li>
                <li>
                  <a href="#reviews" className="transition hover:text-[#2563EB]">
                    Reviews
                  </a>
                </li>
                <li>
                  <a href="#contact" className="transition hover:text-[#2563EB]">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold text-[#111827]">For tenants</h4>
              <ul className="space-y-3 text-sm text-[#6B7280]">
                <li>
                  <a href="#contact" className="transition hover:text-[#2563EB]">
                    Send an inquiry
                  </a>
                </li>
                <li>
                  <Link href="/auth/signin" className="transition hover:text-[#2563EB]">
                    Tenant login
                  </Link>
                </li>
                <li>
                  <Link href="/auth/signin" className="transition hover:text-[#2563EB]">
                    Payments
                  </Link>
                </li>
                <li>
                  <Link href="/auth/signin" className="transition hover:text-[#2563EB]">
                    Maintenance
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 text-sm font-semibold text-[#111827]">Support</h4>
              <ul className="space-y-3 text-sm text-[#6B7280]">
                <li>
                  <a href="#contact" className="transition hover:text-[#2563EB]">
                    Get in touch
                  </a>
                </li>
                <li>
                  <a href="#properties" className="transition hover:text-[#2563EB]">
                    Available units
                  </a>
                </li>
                <li>
                  <Link href="/auth/signin" className="transition hover:text-[#2563EB]">
                    Staff login
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-14 flex flex-col gap-4 border-t border-slate-200 pt-8 text-sm text-[#9CA3AF] sm:flex-row sm:items-center sm:justify-between">
            <p>
              &copy; {new Date().getFullYear()} Alfonso Properties. All rights reserved.
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <a href="#contact" className="transition hover:text-[#2563EB]">
                Privacy
              </a>
              <a href="#contact" className="transition hover:text-[#2563EB]">
                Terms
              </a>
              <Link href="/auth/signin" className="transition hover:text-[#2563EB]">
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
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            aria-label="Close"
            onClick={() => setInquirySuccessOpen(false)}
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-xl sm:p-10">
            <button
              type="button"
              onClick={() => setInquirySuccessOpen(false)}
              className="absolute top-4 right-4 rounded-xl p-2 text-[#6B7280] transition hover:bg-slate-100 hover:text-[#111827]"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-[#EFF6FF] text-[#2563EB]">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2
              id="inquiry-success-title"
              className="text-2xl font-semibold tracking-tight text-[#111827]"
            >
              Inquiry sent
            </h2>
            <p className="mt-3 text-base leading-relaxed text-[#6B7280]">
              Thanks for reaching out. We received your inquiry and will get back to you soon.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setInquirySuccessOpen(false)}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-[#2563EB] px-5 text-sm font-semibold text-white transition hover:bg-[#1D4ED8]"
              >
                Done
              </button>
              <a
                href="#properties"
                onClick={() => setInquirySuccessOpen(false)}
                className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-[#111827] transition hover:border-slate-300 hover:bg-slate-50"
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
