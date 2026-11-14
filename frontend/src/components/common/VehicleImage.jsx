import { useState } from "react";

export default function VehicleImage({ src, alt, className = "" }) {
  const [failed, setFailed] = useState(false);
  return <img className={`vehicle-image ${className}`} src={failed || !src ? "/images/vehicle-fallback.png" : src} alt={alt} onError={() => setFailed(true)} />;
}
