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
