import { useEffect, useState } from "react";

export function resolveVehicleImageUrl(src) {
  if (!src) return null;
  const trimmed = String(src).trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }

  // Relative upload paths must point directly to the backend server
  // Derive the backend origin from the API base URL (strips /api suffix if present)
  if (trimmed.startsWith("/uploads/")) {
    const apiBase = import.meta.env.VITE_API_BASE_URL || "/api";
    const backendOrigin = apiBase.replace(/\/api$/, "");
    return `${backendOrigin}${trimmed}`;
  }

  return trimmed;
}

export default function VehicleImage({ src, alt, className = "" }) {
  const [failed, setFailed] = useState(false);
  const resolved = resolveVehicleImageUrl(src);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const fallbackSrc = "/images/vehicle-fallback.png";

  return (
    <img
      className={`vehicle-image ${className}`}
      src={failed || !resolved ? fallbackSrc : resolved}
      alt={alt || "Vehicle"}
      loading="lazy"
      onError={() => {
        if (!failed) {
          setFailed(true);
        }
      }}
    />
  );
}
