import React from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { FileProvider } from '../context/FileContext';
import '../styles/globals.css';



function MyApp({ Component, pageProps }: AppProps) {
  return (
    <FileProvider>
      <Head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500&display=swap" rel="stylesheet" />
        <title>AI Study Buddy</title>
      </Head>
      <Component {...pageProps} />
    </FileProvider>
  );
}

export default MyApp;
