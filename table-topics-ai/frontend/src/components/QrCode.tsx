import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function QrCode({ value, size = 220, className }: { value: string; size?: number; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, { margin: 1, width: size * 2, color: { dark: "#17120e", light: "#fff8ee" } })
      .then((url) => alive && setSrc(url))
      .catch(() => alive && setSrc(null));
    return () => {
      alive = false;
    };
  }, [value, size]);
  if (!src) return <div style={{ width: size, height: size }} className={className} />;
  return <img src={src} width={size} height={size} alt={`QR: ${value}`} className={`rounded-lg ${className ?? ""}`} />;
}
