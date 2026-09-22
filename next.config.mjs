/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // next/image necesita un servidor para redimensionar imágenes; aquí no hay ninguno.
  images: { unoptimized: true },
  // Las rutas terminan en «/»: es lo que necesita la exportación estática (/documentos/ → documentos/index.html).
  trailingSlash: true,
  // Sin redirección automática de la barra final: el proxy de desarrollo reenvía rutas tal cual (p. ej. /watch, /oembed).
  skipTrailingSlashRedirect: true,
  // Oculta el indicador flotante de Next en dev: estorba al proyectar la demo.
  devIndicators: false,
  // Spotify exige abrir la app en 127.0.0.1 (no en localhost): se permite ese origen en desarrollo.
  allowedDevOrigins: ["127.0.0.1"],
  experimental: {
    // El paquete de íconos tiene miles de exports: sin esto el arranque en dev es lento.
    optimizePackageImports: ["@fluentui/react-icons"],
  },
};

// Next.js no admite `rewrites` junto con `output: "export"` (ni siquiera en dev, si ambos están
// definidos a la vez): por eso van en ramas separadas y nunca coexisten.
if (process.env.NODE_ENV === "development") {
  // Proxy SOLO de desarrollo: en el navegador, YouTube y Spotify no mandan cabeceras CORS. En la
  // aplicación de escritorio la red sale por Rust (plugin-http) y no hace falta.
  nextConfig.rewrites = async () => [
    { source: "/proxy/youtube/:path*", destination: "https://www.youtube.com/:path*" },
    { source: "/proxy/spotify-open/:path*", destination: "https://open.spotify.com/:path*" },
    { source: "/proxy/scdn/:path*", destination: "https://i.scdn.co/:path*" },
    { source: "/proxy/spotifycdn/:path*", destination: "https://image-cdn-ak.spotifycdn.com/:path*" },
  ];
} else {
  // Sin servidor propio: todo se compila a archivos estáticos que Tauri empaqueta en el .exe.
  nextConfig.output = "export";
}

export default nextConfig;
