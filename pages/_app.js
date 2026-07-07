import { Toaster } from 'react-hot-toast'
import { AnimatePresence } from 'framer-motion'
import { Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import '../styles/globals.css'

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export default function App({ Component, pageProps, router }) {
  return (
    <div className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} font-sans`}>
      <AnimatePresence mode="wait" initial={false}>
        <Component key={router.pathname} {...pageProps} />
      </AnimatePresence>
      <Toaster
        position="bottom-right"
        gutter={10}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1B1E25',
            color: '#F4F5F7',
            fontSize: '0.8rem',
            borderRadius: '0.5rem',
            fontFamily: 'var(--font-mono), monospace',
            padding: '12px 16px',
            border: '1px solid #2A2E38',
          },
          success: { iconTheme: { primary: '#00E5A0', secondary: '#0A0B0D' } },
          error: { iconTheme: { primary: '#FF5C72', secondary: '#0A0B0D' } },
        }}
      />
    </div>
  )
}
