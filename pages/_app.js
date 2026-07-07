import { Toaster } from 'react-hot-toast'
import '../styles/globals.css'

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Toaster
        position="bottom-right"
        gutter={10}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#1C1715',
            color: '#FCF9F2',
            fontSize: '0.8rem',
            borderRadius: '0.625rem',
            fontFamily: 'monospace',
            padding: '12px 16px',
            border: '1px solid rgba(255,255,255,0.06)',
          },
          success: { iconTheme: { primary: '#C89B3C', secondary: '#FCF9F2' } },
          error: { iconTheme: { primary: '#A8432F', secondary: '#FCF9F2' } },
        }}
      />
    </>
  )
}
