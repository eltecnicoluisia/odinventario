import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#060913",
};

const basePath = process.env.GITHUB_PAGES === "true" ? "/odinventario" : "";

export const metadata: Metadata = {
  title: "ODINVENTARIO - Control Institucional & Bienes Nacionales",
  description: "Plataforma de última generación para inventario, activos fijos y bienes nacionales.",
  manifest: `${basePath}/manifest.json`,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "ODInventario",
  },
  icons: {
    icon: `${basePath}/icons/icon-192.png`,
    apple: `${basePath}/apple-touch-icon.png`,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <head>
        <link rel="manifest" href={`${basePath}/manifest.json`} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="ODInventario" />
        <link rel="apple-touch-icon" href={`${basePath}/apple-touch-icon.png`} />
      </head>
      <body className={`${inter.className} bg-background text-text min-h-screen antialiased selection:bg-blue-600 selection:text-white`}>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  var pfx = window.location.pathname.startsWith('/odinventario') ? '/odinventario' : '';
                  navigator.serviceWorker.register(pfx + '/sw.js', { scope: pfx + '/' }).then(
                    function(registration) {
                      console.log('[PWA] ServiceWorker registrado con éxito:', registration.scope);
                    },
                    function(err) {
                      console.log('[PWA] Error al registrar ServiceWorker:', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
