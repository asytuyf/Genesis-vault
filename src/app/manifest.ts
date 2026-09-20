import type { MetadataRoute } from "next";

// Makes the site installable: Android and desktop read this, iPhone reads the
// apple-icon and the meta tags in the layout instead.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Genesis Vault",
    short_name: "Genesis",
    description: "Goals, study timer, habits and library in one place.",
    start_url: "/goals",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0d0d0d",
    theme_color: "#0d0d0d",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
