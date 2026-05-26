import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeRendererProps {
  value: string;
  size?: number;
  className?: string;
}

export const QRCodeRenderer: React.FC<QRCodeRendererProps> = ({ value, size = 100, className = "" }) => {
  const [svgUrl, setSvgUrl] = useState<string>('');

  useEffect(() => {
    let active = true;
    QRCode.toString(value, { type: 'svg', margin: 0, width: size }, (err, string) => {
      if (err) {
        console.error(err);
        return;
      }
      if (active) {
        const blob = new Blob([string], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        setSvgUrl(url);
      }
    });

    return () => {
      active = false;
    };
  }, [value, size]);

  if (!svgUrl) {
    return <div style={{ width: size, height: size }} className="bg-slate-100 animate-pulse" />;
  }

  return (
    <img 
      src={svgUrl} 
      alt="QR Code" 
      width={size} 
      height={size} 
      className={className} 
      style={{ display: 'block', margin: '0 auto' }} 
    />
  );
};
