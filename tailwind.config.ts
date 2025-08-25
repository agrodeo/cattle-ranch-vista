import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				brand: {
					50: 'hsl(140 100% 97%)',   // #eafff3
					100: 'hsl(142 100% 89%)',  // #c8ffe1
					200: 'hsl(148 100% 79%)',  // #93ffca
					300: 'hsl(154 87% 69%)',   // #5ef5ad
					400: 'hsl(158 79% 55%)',   // #36e38f
					500: 'hsl(142 71% 45%)',   // #22c55e - primary
					600: 'hsl(142 76% 36%)',   // #16a34a
					700: 'hsl(142 72% 29%)',   // #12833d
					800: 'hsl(142 69% 24%)',   // #0f6832
					900: 'hsl(140 61% 17%)',   // #0a4b24
				},
				ink: {
					50: 'hsl(210 40% 98%)',    // #f8fafc
					100: 'hsl(210 40% 96%)',   // #f1f5f9
					200: 'hsl(214 32% 91%)',   // #e2e8f0
					300: 'hsl(213 27% 84%)',   // #cbd5e1
					400: 'hsl(215 20% 65%)',   // #94a3b8
					500: 'hsl(215 16% 47%)',   // #64748b
					600: 'hsl(215 19% 35%)',   // #475569
					700: 'hsl(215 25% 27%)',   // #334155
					800: 'hsl(217 33% 17%)',   // #1f2937
					900: 'hsl(222 84% 5%)',    // #0f172a
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				xl: '14px',
				'2xl': '20px'
			},
			boxShadow: {
				card: '0 6px 24px rgba(15,23,42,0.06)',
				'card-hover': '0 10px 30px rgba(15,23,42,0.10)',
				glow: '0 0 0 3px rgba(34,197,94,0.18)',
			},
			fontFamily: {
				sans: ['Inter', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
			},
			fontFeatureSettings: {
				'tnum': '"tnum"',
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
