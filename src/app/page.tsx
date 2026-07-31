'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Building2, 
  Home, 
  Shield, 
  TrendingUp, 
  Users, 
  CheckCircle,
  ArrowRight,
  Phone,
  Mail,
  MapPin,
  Star
} from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';

interface Building {
  id: string;
  name: string;
  address: string;
  totalUnits: number;
  availableUnits: number;
  image?: string;
}

function formatBuildingAddress(b: { addressLine1?: string; city?: string; state?: string; postalCode?: string; address?: string }): string {
  if (b.address) return b.address;
  const parts = [b.addressLine1, b.city, b.state, b.postalCode].filter(Boolean);
  return parts.length ? parts.join(', ') : '';
}

export default function LandingPage() {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBuildings();
  }, []);

  const fetchBuildings = async () => {
    try {
      const response = await fetch('/api/buildings');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          // Handle both response formats: { data: { buildings: [] } } or { data: [] }
          const raw = result.data.buildings || result.data || [];
          const buildingsArray: Building[] = raw.slice(0, 6).map((b: Record<string, unknown>) => ({
            id: String(b.id),
            name: String(b.name ?? ''),
            address: formatBuildingAddress(b as Parameters<typeof formatBuildingAddress>[0]),
            totalUnits: Number(b.totalUnits) || 0,
            availableUnits: Number(b.vacantUnits) || 0,
            image: b.image as string | undefined,
          }));
          setBuildings(buildingsArray);
        }
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Building2,
      title: 'Premium Properties',
      description: 'Carefully curated selection of high-quality residential and commercial properties'
    },
    {
      icon: Shield,
      title: 'Secure & Reliable',
      description: 'Advanced security systems and 24/7 property management support'
    },
    {
      icon: TrendingUp,
      title: 'Great Value',
      description: 'Competitive pricing with flexible payment options and transparent fees'
    },
    {
      icon: Users,
      title: 'Community First',
      description: 'Building thriving communities with excellent tenant services'
    }
  ];

  const stats = [
    { value: buildings.length || '10+', label: 'Properties' },
    { value: '500+', label: 'Happy Tenants' },
    { value: '98%', label: 'Occupancy Rate' },
    { value: '24/7', label: 'Support' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Header/Navigation */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center" aria-label="Alfonso Property Management System">
              <BrandLogo variant="full" height={36} priority className="max-w-[10rem] sm:max-w-none" />
            </Link>
            <nav className="hidden md:flex items-center space-x-8">
              <a href="#properties" className="text-gray-900 hover:text-blue-600 transition">Properties</a>
              <a href="#features" className="text-gray-900 hover:text-blue-600 transition">Features</a>
              <a href="#about" className="text-gray-900 hover:text-blue-600 transition">About</a>
              <a href="#contact" className="text-gray-900 hover:text-blue-600 transition">Contact</a>
            </nav>
            <div className="flex items-center space-x-4">
              <Link 
                href="/auth/tenant/signin"
                className="text-gray-900 hover:text-blue-600 transition font-medium"
              >
                Tenant Login
              </Link>
              <Link 
                href="/auth/admin/signin"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
              >
                Admin Login
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-50 via-white to-blue-50 py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">
                Find Your Perfect
                <span className="text-blue-600"> Home</span> Today
              </h1>
              <p className="text-xl text-gray-900 mb-8 leading-relaxed">
                Discover premium properties with modern amenities, professional management, 
                and a community you'll love to call home.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <a 
                  href="#properties"
                  className="bg-blue-600 text-white px-8 py-4 rounded-lg hover:bg-blue-700 transition font-semibold text-center flex items-center justify-center group"
                >
                  Browse Properties
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition" />
                </a>
                <Link 
                  href="/auth/tenant/signin"
                  className="bg-white text-blue-600 border-2 border-blue-600 px-8 py-4 rounded-lg hover:bg-blue-50 transition font-semibold text-center"
                >
                  Tenant Portal
                </Link>
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-600 rounded-2xl transform rotate-3"></div>
                <div className="relative bg-white rounded-2xl shadow-2xl p-8 transform -rotate-1">
                  <div className="grid grid-cols-2 gap-6">
                    {stats.map((stat, index) => (
                      <div key={index} className="text-center">
                        <div className="text-3xl font-bold text-blue-600 mb-1">{stat.value}</div>
                        <div className="text-sm text-gray-900">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Why Choose Alfonso Property Management System?</h2>
            <p className="text-xl text-gray-900 max-w-2xl mx-auto">
              Experience the difference with our comprehensive property management services
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="p-6 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200 hover:shadow-lg transition group"
              >
                <div className="bg-blue-100 w-14 h-14 rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-600 transition">
                  <feature.icon className="h-7 w-7 text-blue-600 group-hover:text-white transition" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-900">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Properties Section */}
      <section id="properties" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Featured Properties</h2>
            <p className="text-xl text-gray-900 max-w-2xl mx-auto">
              Explore our carefully selected properties in prime locations
            </p>
          </div>

          {loading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white rounded-xl shadow-md overflow-hidden animate-pulse">
                  <div className="h-48 bg-gray-200"></div>
                  <div className="p-6">
                    <div className="h-6 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : buildings.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {buildings.map((building) => (
                <div 
                  key={building.id}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition group"
                >
                  <div className="relative h-48 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                    <Building2 className="h-20 w-20 text-blue-600 opacity-50" />
                    <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full text-sm font-semibold text-blue-600">
                      {building.availableUnits || 0} Available
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition">
                      {building.name}
                    </h3>
                    <div className="flex items-center text-gray-900 mb-3">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span className="text-sm">{building.address}</span>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                      <div className="flex items-center text-gray-900">
                        <Home className="h-4 w-4 mr-2" />
                        <span className="text-sm">{building.totalUnits} Units</span>
                      </div>
                      <a 
                        href="#contact"
                        className="text-blue-600 font-semibold text-sm hover:underline flex items-center"
                      >
                        Inquire
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-900 text-lg">Properties coming soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What Our Tenants Say</h2>
            <p className="text-xl text-gray-900 max-w-2xl mx-auto">
              Don't just take our word for it
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: 'Maria Santos',
                role: 'Tenant since 2023',
                text: 'The best property management I\'ve experienced. Responsive, professional, and truly care about their tenants.'
              },
              {
                name: 'John Dela Cruz',
                role: 'Tenant since 2022',
                text: 'Beautiful property, great amenities, and an amazing community. I couldn\'t ask for more!'
              },
              {
                name: 'Ana Garcia',
                role: 'Tenant since 2024',
                text: 'From the application process to move-in, everything was seamless. Highly recommended!'
              }
            ].map((testimonial, index) => (
              <div key={index} className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                <div className="flex mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="text-gray-900 mb-4 italic">&ldquo;{testimonial.text}&rdquo;</p>
                <div>
                  <div className="font-semibold text-gray-900">{testimonial.name}</div>
                  <div className="text-sm text-gray-900">{testimonial.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="about" className="py-20 bg-gradient-to-br from-blue-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Find Your New Home?</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join hundreds of satisfied tenants who have found their perfect property with us
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="#properties"
              className="bg-white text-blue-600 px-8 py-4 rounded-lg hover:bg-gray-100 transition font-semibold inline-flex items-center justify-center"
            >
              View Properties
              <ArrowRight className="ml-2 h-5 w-5" />
                </a>
                <a
              href="#contact"
              className="bg-blue-800 text-white px-8 py-4 rounded-lg hover:bg-blue-900 transition font-semibold"
            >
              Contact Us
            </a>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Get In Touch</h2>
            <p className="text-xl text-gray-900 max-w-2xl mx-auto">
              Have questions? We're here to help
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="bg-blue-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Phone</h3>
              <p className="text-gray-900">+63 (2) 1234-5678</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Email</h3>
              <p className="text-gray-900">info@parenta.com</p>
            </div>
            <div className="text-center">
              <div className="bg-blue-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Location</h3>
              <p className="text-gray-900">Manila, Philippines</p>
            </div>
          </div>
        </div>
      </section>

        {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="mb-4">
                <BrandLogo variant="full" height={40} />
              </div>
              <p className="text-sm">
                Professional property management services for modern living.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#properties" className="hover:text-blue-500 transition">Properties</a></li>
                <li><a href="#features" className="hover:text-blue-500 transition">Features</a></li>
                <li><a href="#about" className="hover:text-blue-500 transition">About Us</a></li>
                <li><a href="#contact" className="hover:text-blue-500 transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">For Tenants</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/auth/tenant/signin" className="hover:text-blue-500 transition">Tenant Login</Link></li>
                <li><a href="#properties" className="hover:text-blue-500 transition">Available Units</a></li>
                <li><a href="#" className="hover:text-blue-500 transition">Payment Portal</a></li>
                <li><a href="#" className="hover:text-blue-500 transition">Maintenance Request</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Management</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/auth/admin/signin" className="hover:text-blue-500 transition">Admin Login</Link></li>
                <li><Link href="/auth/admin/signin" className="hover:text-blue-500 transition">Staff Portal</Link></li>
                <li><a href="#" className="hover:text-blue-500 transition">Reports</a></li>
                <li><a href="#" className="hover:text-blue-500 transition">Analytics</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; {new Date().getFullYear()} Alfonso Property Management System. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
