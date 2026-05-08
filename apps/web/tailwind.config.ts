import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // 배경 — 크림 오프화이트 (책 페이지 분위기)
        canvas: {
          DEFAULT: '#FAF9F6',   // 메인 배경
          subtle: '#F4F2EE',    // 카드 내부 구분 영역
          muted: '#EDEBE6',     // 비활성 영역
        },

        // 브랜드 — 앱 아이콘의 딥그린/민트 톤
        primary: {
          50:  '#F0FDF5',
          100: '#DCFCE7',
          200: '#BFE8CC',
          300: '#93D7AE',
          400: '#69C38F',
          500: '#56B783',
          600: '#2F704F',
          700: '#285F45',
          900: '#193B2D',
          DEFAULT: '#2F704F',
          foreground: '#FFFFFF',
        },

        // 상태 배지 — 채도 낮춘 자연색
        available: {
          bg:   '#ECFDF5',
          text: '#065F46',
          dot:  '#10B981',
        },
        waiting: {
          bg:   '#FFFBEB',
          text: '#92400E',
          dot:  '#F59E0B',
        },
        unavailable: {
          bg:   '#F9FAFB',
          text: '#6B7280',
          dot:  '#D1D5DB',
        },

        // 중립
        border: '#E5E2DC',
        input:  '#F0EDE8',
        ring:   '#2F704F',

        // 텍스트 계층
        foreground:       '#1C1917',  // 주 텍스트 (warm black)
        'muted-foreground': '#78716C', // 보조 텍스트
        'subtle-foreground': '#A8A29E', // 플레이스홀더
      },

      fontFamily: {
        sans: ['Pretendard', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },

      fontSize: {
        '2xs': ['11px', { lineHeight: '16px' }],
        xs:   ['12px', { lineHeight: '18px' }],
        sm:   ['14px', { lineHeight: '22px' }],
        base: ['16px', { lineHeight: '26px' }],
        lg:   ['18px', { lineHeight: '28px' }],
        xl:   ['20px', { lineHeight: '30px' }],
        '2xl':['24px', { lineHeight: '34px', letterSpacing: '-0.02em' }],
        '3xl':['30px', { lineHeight: '40px', letterSpacing: '-0.02em' }],
        '4xl':['36px', { lineHeight: '46px', letterSpacing: '-0.03em' }],
      },

      borderRadius: {
        sm:  '6px',
        DEFAULT: '10px',
        md:  '10px',
        lg:  '14px',
        xl:  '18px',
        '2xl': '24px',
        full: '9999px',
      },

      boxShadow: {
        'card':    '0 1px 3px rgba(28,25,23,0.06), 0 1px 2px rgba(28,25,23,0.04)',
        'card-md': '0 4px 12px rgba(28,25,23,0.08), 0 2px 4px rgba(28,25,23,0.04)',
        'card-hover': '0 8px 24px rgba(28,25,23,0.10), 0 3px 8px rgba(28,25,23,0.06)',
        'input':   '0 1px 2px rgba(28,25,23,0.04) inset',
        'none':    'none',
      },

      spacing: {
        '4.5': '18px',
        '13':  '52px',
        '15':  '60px',
        '18':  '72px',
      },

      transitionTimingFunction: {
        'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
}

export default config
