// --------------------------------------------------------
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Invalid source map')) return;
  originalConsoleError(...args);
};

console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Invalid source map')) return;
  originalConsoleWarn(...args);
};
// --------------------------------------------------------

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["image.tmdb.org"],
    qualities: [70, 75, 50, 60],  
    formats: ["image/avif", "image/webp"], // <-- ADD THIS
 // <-- MUST be inside images
  },
  
};

export default nextConfig;
