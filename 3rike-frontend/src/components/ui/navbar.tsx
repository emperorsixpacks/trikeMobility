import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, user, logout } = useAuth();

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "How it works", href: "#how-it-works" },
    { label: "FAQs", href: "#faqs" },
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Lock body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const scrollTo = (href: string) => {
    const id = href.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    setIsOpen(false);
  };

  return (
    <>
      <div className="fixed top-0 left-0 w-full z-50 px-4 lg:px-[78px] pt-4">
        <div
          className={`mx-auto flex h-20 justify-between items-center px-6 lg:px-10 rounded-2xl border border-[#E2F490] transition-all duration-300 ${
            scrolled
              ? "bg-white/50 backdrop-blur-md shadow-sm"
              : "bg-[#F5F5F0]"
          }`}
        >
          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0 cursor-pointer">
            <img
              src="/new_3rike_logo.png"
              alt="3riKE Logo"
              className="h-16 w-auto object-contain"
            />
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-12">
            {navLinks.map(({ label, href }) => (
              <a
                key={href}
                href={href}
                onClick={(e) => {
                  e.preventDefault();
                  scrollTo(href);
                }}
                className="text-[#1A1A1A] text-lg font-medium hover:text-[#829E04] transition-colors cursor-pointer"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Auth Buttons — Desktop */}
          {isAuthenticated ? (
            <div className="hidden lg:flex items-center gap-6">
              <Link
                to={`/${user?.role || 'driver'}`}
                className="text-[#1A1A1A] text-lg font-medium hover:text-[#829E04] transition-colors cursor-pointer"
              >
                Dashboard
              </Link>
              <button
                type="button"
                onClick={logout}
                className="bg-[#829E04] text-white text-lg font-medium px-8 py-3 cursor-pointer hover:bg-[#6f8703] transition-colors"
              >
                Log out
              </button>
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-6">
              <Link
                to="/login"
                className="text-[#1A1A1A] text-lg font-medium hover:text-[#829E04] transition-colors cursor-pointer"
              >
                Log in
              </Link>
              <button
                type="button"
                onClick={() => navigate("/role-select")}
                className="bg-[#829E04] text-white text-lg font-medium px-8 py-3 cursor-pointer hover:bg-[#6f8703] transition-colors"
              >
                Sign up
              </button>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden h-10 w-10 flex items-center justify-center cursor-pointer"
          >
            {isOpen ? (
              <X className="text-black h-6 w-6" />
            ) : (
              <img src="burger.svg" alt="Menu" className="w-7 h-7" />
            )}
          </button>
        </div>
      </div>

      {/* Full-screen Mobile Menu */}
      <div
        className={`fixed inset-0 z-40 bg-[#F5F5F0] flex flex-col transition-all duration-500 ease-in-out lg:hidden ${
          isOpen
            ? "opacity-100 visible"
            : "opacity-0 invisible"
        }`}
      >
        {/* Spacer for navbar */}
        <div className="h-28" />

        {/* Nav Links */}
        <div className="flex-1 flex flex-col items-center justify-center gap-2 px-8">
          {navLinks.map(({ label, href }, index) => (
            <button
              key={href}
              type="button"
              onClick={() => scrollTo(href)}
              className="text-[#1A1A1A] text-4xl font-bold hover:text-[#829E04] transition-all duration-300 cursor-pointer py-4"
              style={{
                transitionDelay: isOpen ? `${index * 100 + 100}ms` : '0ms',
                transform: isOpen ? 'translateY(0)' : 'translateY(30px)',
                opacity: isOpen ? 1 : 0,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Bottom CTA / Auth */}
        <div
          className="px-8 pb-12 flex flex-col gap-4"
          style={{
            transitionDelay: isOpen ? '400ms' : '0ms',
            transform: isOpen ? 'translateY(0)' : 'translateY(20px)',
            opacity: isOpen ? 1 : 0,
            transition: 'all 0.4s ease-out',
          }}
        >
          {isAuthenticated ? (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate(`/${user?.role || 'driver'}`);
                }}
                className="border border-[#829E04] text-[#829E04] text-xl font-medium py-4 w-full cursor-pointer hover:bg-[#829E04]/10 transition-colors rounded-xl text-center"
              >
                Go to Dashboard
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  void logout();
                }}
                className="bg-[#829E04] text-white text-xl font-medium py-4 w-full cursor-pointer hover:bg-[#6f8703] transition-colors rounded-xl text-center"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/login");
                }}
                className="border border-[#829E04] text-[#829E04] text-xl font-medium py-4 w-full cursor-pointer hover:bg-[#829E04]/10 transition-colors rounded-xl text-center"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/role-select");
                }}
                className="bg-[#829E04] text-white text-xl font-medium py-4 w-full cursor-pointer hover:bg-[#6f8703] transition-colors rounded-xl text-center"
              >
                Sign up / Get Started
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
