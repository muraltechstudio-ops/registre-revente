import { Toaster } from 'react-hot-toast'
import { Source_Serif_4, JetBrains_Mono } from 'next/font/google'
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

export default function App({ Component, pageProps }) {
  return (
    <div className={`${sourceSerif.variable} ${jetbrainsMono.variable}`}>
      <Component {...pageProps} />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#1C2B24',
            color: '#F7F5EF',
            fontSize: '0.875rem',
            borderRadius: '0.375rem',
            fontFamily: 'var(--font-mono), monospace',
          },
          success: {
            iconTheme: { primary: '#3F6B4F', secondary: '#F7F5EF' },
          },
          error: {
            iconTheme: { primary: '#A8432F', secondary: '#F7F5EF' },
          },
        }}
      />
    </div>
  )
}
