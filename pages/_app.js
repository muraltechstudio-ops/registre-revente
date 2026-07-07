import { Toaster } from 'react-hot-toast'
import { AnimatePresence } from 'framer-motion'
import { Source_Serif_4, JetBrains_Mono, Inter } from 'next/font/google'
import '../styles/globals.css'

const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export default function App({ Component, pageProps, router }) {
  return (
    <div className={`${sourceSerif.variable} ${jetbrainsMono.variable} ${inter.variable} font-sans`}>
      <AnimatePresence mode="wait">
        <Component key={router.pathname} {...pageProps} />
      </AnimatePresence>
      <Toaster
        position="bottom-right"
        gutter={12}
        toastOptions={{
          duration: 3000,
          style: {
            background: 'rgba(28, 43, 36, 0.95)',
            backdropFilter: 'blur(12px)',
            color: '#F7F5EF',
            fontSize: '0.875rem',
            borderRadius: '0.75rem',
            fontFamily: 'var(--font-mono), monospace',
            border: '1px solid rgba(255,255,255,0.08)',
            padding: '12px 16px',
          },
          success: {
            iconTheme: { primary: '#5B8C6A', secondary: '#F7F5EF' },
          },
          error: {
            iconTheme: { primary: '#A8432F', secondary: '#F7F5EF' },
          },
        }}
      />
    </div>
  )
}
