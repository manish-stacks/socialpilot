import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  badgeText?: string;
  asLink?: boolean;
  href?: string;
  iconOnly?: boolean;
}

export function LogoMark({ className = '', size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0 drop-shadow-sm transition-transform duration-200 hover:scale-105', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="spMarkGrad" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#00c0f8" />
          <stop offset="45%" stopColor="#0072f5" />
          <stop offset="100%" stopColor="#7928ca" />
        </linearGradient>
        <linearGradient id="spInnerPlane" x1="20" y1="20" x2="70" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#e0effe" />
        </linearGradient>
        <filter id="spShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#0072f5" floodOpacity="0.25" />
        </filter>
      </defs>

      {/* S-Shaped Rounded Ribbon */}
      <path
        d="M 68 18 C 76 18 84 25 84 34 C 84 44 76 50 64 54 L 38 62 C 26 66 20 72 20 80 C 20 89 28 96 40 96 C 54 96 66 88 72 82 C 75 79 80 80 82 84 C 84 88 83 93 79 97 C 69 104 54 110 38 110 C 18 110 6 97 6 78 C 6 62 18 52 32 47 L 58 39 C 68 35 72 31 72 24 C 72 18 66 14 56 14 C 44 14 34 20 28 26 C 25 29 20 29 17 25 C 14 21 15 16 20 11 C 29 3 44 -2 58 -2"
        fill="none"
      />
      {/* Real geometric S shape */}
      <rect width="100" height="100" rx="28" fill="url(#spMarkGrad)" filter="url(#spShadow)" />
      
      {/* Paper Plane Icon embedded */}
      <path
        d="M 24 50 L 76 22 L 54 78 L 44 58 Z"
        fill="url(#spInnerPlane)"
        stroke="#ffffff"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M 76 22 L 44 58"
        stroke="#93c5fd"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Logo({
  className = '',
  size = 'md',
  showBadge = false,
  badgeText = 'AI',
  asLink = false,
  href = '/',
  iconOnly = false,
}: LogoProps) {
  const heights = {
    sm: 'h-7',
    md: 'h-9',
    lg: 'h-16',
    xl: 'h-14',
  };

  const imageSizes = {
    sm: { w: 120, h: 28 },
    md: { w: 150, h: 36 },
    lg: { w: 180, h: 50 },
    xl: { w: 220, h: 54 },
  };

  const content = iconOnly ? (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <Image
        src="/logo.png"
        alt="SocialPilot-AI"
        width={40}
        height={40}
        className="h-9 w-9 object-contain object-left"
        priority
      />
    </div>
  ) : (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <div className={cn('relative flex items-center', heights[size])}>
        <Image
          src="/logo.png"
          alt="SocialPilot-AI"
          width={imageSizes[size].w}
          height={imageSizes[size].h}
          className={cn('w-auto object-contain', heights[size])}
          priority
        />
      </div>
      {showBadge && (
        <span className="rounded-full bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-600 border border-blue-500/20 shadow-xs">
          {badgeText}
        </span>
      )}
    </div>
  );

  if (asLink) {
    return (
      <Link href={href} className="inline-flex items-center transition-opacity hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
