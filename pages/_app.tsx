import React from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { FileProvider } from '../context/FileContext';
import '../styles/globals.css';
import { SessionProvider } from 'next-auth/react';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SessionProvider session={pageProps.session}>
      <FileProvider>
        <Head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>AI Study Buddy</title>
        </Head>
        <Component {...pageProps} />
      </FileProvider>
    </SessionProvider>
  );
}

export default MyApp;
