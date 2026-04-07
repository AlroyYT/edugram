import '../i18n'
import React, { useEffect, useState } from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { FileProvider } from '../context/FileContext';
import HomeButton from '../components/HomeButton';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { autoTranslate } from "../plugins/autoTranslate"
import { useRouter } from "next/router"

import '../styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Translate on initial mount if a language was previously selected
  useEffect(() => {
    if (!mounted) return
    const lang = localStorage.getItem("lang")
    if (lang && lang !== "en") {
      setTimeout(() => autoTranslate(lang), 800)
    }
  }, [mounted])

  // Re-apply translation on every client-side navigation
  useEffect(() => {
    const handleRouteChange = () => {
      const lang = localStorage.getItem("lang")
      if (lang && lang !== "en") {
        setTimeout(() => autoTranslate(lang), 300)
      }
    }
    router.events.on("routeChangeComplete", handleRouteChange)
    return () => router.events.off("routeChangeComplete", handleRouteChange)
  }, [router.events])

  if (!mounted) return null

  return (
    <FileProvider>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>AI Study Buddy</title>
      </Head>

      <LanguageSwitcher />

      <Component {...pageProps} />

      <HomeButton />
    </FileProvider>
  );
}

export default MyApp;