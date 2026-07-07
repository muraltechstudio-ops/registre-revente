import { Toaster } from 'react-hot-toast'
import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Toaster
        position="bottom-right"
        gutter={12}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1C2B24',
            color: '#F7F5EF',
            fontSize: '0.875rem',
            borderRadius: '0.75rem',
            fontFamily: 'ui-monospace, monospace',
            padding: '12px 16px',
          },
          success: { iconTheme: { primary: '#5B8C6A', secondary: '#F7F5EF' } },
          error: { iconTheme: { primary: '#A8432F', secondary: '#F7F5EF' } },
        }}
      />
    </>
  )
}
