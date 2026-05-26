import React from 'react';

// Standard Code 39 Pattern Map (w = wide, n = narrow)
// 9 elements per pattern alternating: bar, space, bar, space, bar, space, bar, space, bar
const CODE39_PATTERNS: Record<string, string> = {
  '0': 'nnnwwnwnn',
  '1': 'wnnwnnnnw',
  '2': 'nnwwnnnnw',
  '3': 'wnwwnnnnn',
  '4': 'nnnwwnnnw',
  '5': 'wnnwwnnnn',
  '6': 'nnwwnwnnn',
  '7': 'nnnwnnwnw',
  '8': 'wnnwnnwnn',
  '9': 'nnwwnnwnn',
  'A': 'wnnnnwnnw',
  'B': 'nnwnnwnnw',
  'C': 'wnwnnwnnn',
  'D': 'nnnnwwnnw',
  'E': 'wnnnwwnnn',
  'F': 'nnwnwwnnn',
  'G': 'nnnnnwwnw',
  'H': 'wnnnnwwnn',
  'I': 'nnwnnwwnn',
  'J': 'nnnnwwwnn',
  'K': 'wnnnnnnww',
  'L': 'nnwnnnnww',
  'M': 'wnwnnnnwn',
  'N': 'nnnnwnnww',
  'O': 'wnnnwnnwn',
  'P': 'nnwnwnnwn',
  'Q': 'nnnnnnwww',
  'R': 'wnnnnnwwn',
  'S': 'nnwnnnwwn',
  'T': 'nnnnwnwwn',
  'U': 'wwnnnnnnw',
  'V': 'nwwnnnnnw',
  'W': 'wwwnnnnnn',
  'X': 'nwnnwnnnw',
  'Y': 'wwnnwnnnn',
  'Z': 'nwwnwnnnn',
  '-': 'nwnnnnwnw',
  '.': 'wwnnnnwnn',
  ' ': 'nwwnnnwnn',
  '*': 'nwnnwnwnn'
};

interface BarcodeRendererProps {
  value: string;
  className?: string;
  height?: number;
}

export const BarcodeRenderer: React.FC<BarcodeRendererProps> = ({ 
  value, 
  className = '', 
  height = 50 
}) => {
  // Code 39 must start and end with asterisk '*'
  const rawText = value.trim().toUpperCase();
  const fullText = `*${rawText}*`;

  // Constants for bar widths (in pixels)
  const narrowWidth = 1.35;
  const wideWidth = 3.25;
  const interCharGap = 1.35;

  let totalWidth = 0;
  const renderElements: Array<{
    isBar: boolean;
    width: number;
    x: number;
  }> = [];

  // Calculate coordinates for SVGs
  for (let c = 0; c < fullText.length; c++) {
    const char = fullText[c];
    const pattern = CODE39_PATTERNS[char];

    if (!pattern) continue; // skip invalid chars

    for (let i = 0; i < 9; i++) {
      const isBar = i % 2 === 0;
      const isWide = pattern[i] === 'w';
      const elementWidth = isWide ? wideWidth : narrowWidth;

      renderElements.push({
        isBar,
        width: elementWidth,
        x: totalWidth
      });

      totalWidth += elementWidth;
    }

    // Add inter-character gap (white space of narrow width) between character patterns
    if (c < fullText.length - 1) {
      renderElements.push({
        isBar: false,
        width: interCharGap,
        x: totalWidth
      });
      totalWidth += interCharGap;
    }
  }

  return (
    <div className={`flex justify-center items-center overflow-hidden ${className}`}>
      <svg 
        width="100%" 
        height={height}
        viewBox={`0 0 ${Math.ceil(totalWidth)} ${height}`}
        preserveAspectRatio="none"
        className="w-full h-full select-none"
      >
        {renderElements.map((el, index) => {
          if (!el.isBar) return null; // space is just white background (rendered by default empty space)
          return (
            <rect
              key={index}
              x={el.x}
              y={0}
              width={el.width}
              height={height}
              fill="#000000"
              shapeRendering="crispEdges"
            />
          );
        })}
      </svg>
    </div>
  );
};
