import { useEffect, useRef } from 'react';

interface DiagramRendererProps {
  diagramData: any | any[];
  className?: string;
  maxWidth?: number;
  maxHeight?: number;
}

export function DiagramRenderer({
  diagramData,
  className = '',
  maxWidth = 600,
  maxHeight = 440
}: DiagramRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let parsedData = diagramData;
    if (typeof diagramData === 'string') {
      try {
        parsedData = JSON.parse(diagramData);
      } catch (error) {
        console.error('Failed to parse diagram data:', error);
        return;
      }
    }

    if (!canvasRef.current || !parsedData || !Array.isArray(parsedData)) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    parsedData.forEach((element: any) => {
      if (!element) return;

      const x = element.x || 0;
      const y = element.y || 0;
      const width = element.width || 0;
      const height = element.height || 0;

      if (element.type === 'line' && Array.isArray(element.points)) {
        element.points.forEach((point: number[]) => {
          if (Array.isArray(point) && point.length >= 2) {
            minX = Math.min(minX, x + point[0]);
            minY = Math.min(minY, y + point[1]);
            maxX = Math.max(maxX, x + point[0]);
            maxY = Math.max(maxY, y + point[1]);
          }
        });
      } else {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
      }
    });

    if (minX === Infinity || maxX === -Infinity) {
      console.error('Could not calculate bounds for diagram');
      return;
    }

    const padding = 40;
    const contentWidth = maxX - minX + padding * 2;
    const contentHeight = maxY - minY + padding * 2;

    const scale = Math.min(maxWidth / contentWidth, maxHeight / contentHeight, 1);
    const finalWidth = contentWidth * scale;
    const finalHeight = contentHeight * scale;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = finalWidth * dpr;
    canvas.height = finalHeight * dpr;
    canvas.style.width = `${finalWidth}px`;
    canvas.style.height = `${finalHeight}px`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.scale(dpr * scale, dpr * scale);
    ctx.translate(-minX + padding, -minY + padding);

    parsedData.forEach((element: any) => {
      if (!element || !element.type) {
        return;
      }

      const x = element.x || 0;
      const y = element.y || 0;
      const width = element.width || 0;
      const height = element.height || 0;

      ctx.strokeStyle = element.strokeColor || '#000000';
      ctx.lineWidth = element.strokeWidth || 2;

      try {
        if (element.type === 'ellipse') {
          const centerX = x + width / 2;
          const centerY = y + height / 2;
          const radiusX = width / 2;
          const radiusY = height / 2;

          ctx.beginPath();
          ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);

          if (element.backgroundColor && element.backgroundColor !== 'transparent') {
            ctx.fillStyle = element.backgroundColor;
            ctx.fill();
          }
          ctx.stroke();
        } else if (element.type === 'rectangle') {
          ctx.beginPath();
          ctx.rect(x, y, width, height);

          if (element.backgroundColor && element.backgroundColor !== 'transparent') {
            ctx.fillStyle = element.backgroundColor;
            ctx.fill();
          }
          ctx.stroke();
        } else if (element.type === 'diamond') {
          ctx.beginPath();
          const midX = x + width / 2;
          const midY = y + height / 2;
          ctx.moveTo(midX, y);
          ctx.lineTo(x + width, midY);
          ctx.lineTo(midX, y + height);
          ctx.lineTo(x, midY);
          ctx.closePath();

          if (element.backgroundColor && element.backgroundColor !== 'transparent') {
            ctx.fillStyle = element.backgroundColor;
            ctx.fill();
          }
          ctx.stroke();
        } else if (element.type === 'line' && Array.isArray(element.points)) {
          ctx.beginPath();
          const firstPoint = element.points[0];
          if (firstPoint && Array.isArray(firstPoint) && firstPoint.length >= 2) {
            ctx.moveTo(x + firstPoint[0], y + firstPoint[1]);
            for (let i = 1; i < element.points.length; i++) {
              const point = element.points[i];
              if (point && Array.isArray(point) && point.length >= 2) {
                ctx.lineTo(x + point[0], y + point[1]);
              }
            }
            ctx.stroke();
          }
        } else if (element.type === 'arrow' && Array.isArray(element.points)) {
          ctx.beginPath();
          const firstPoint = element.points[0];
          if (firstPoint && Array.isArray(firstPoint) && firstPoint.length >= 2) {
            ctx.moveTo(x + firstPoint[0], y + firstPoint[1]);
            for (let i = 1; i < element.points.length; i++) {
              const point = element.points[i];
              if (point && Array.isArray(point) && point.length >= 2) {
                ctx.lineTo(x + point[0], y + point[1]);
              }
            }
            ctx.stroke();

            if (element.points.length >= 2) {
              const lastPoint = element.points[element.points.length - 1];
              const secondLastPoint = element.points[element.points.length - 2];
              const angle = Math.atan2(lastPoint[1] - secondLastPoint[1], lastPoint[0] - secondLastPoint[0]);
              const headLen = 15;

              ctx.beginPath();
              ctx.moveTo(x + lastPoint[0], y + lastPoint[1]);
              ctx.lineTo(
                x + lastPoint[0] - headLen * Math.cos(angle - Math.PI / 6),
                y + lastPoint[1] - headLen * Math.sin(angle - Math.PI / 6)
              );
              ctx.moveTo(x + lastPoint[0], y + lastPoint[1]);
              ctx.lineTo(
                x + lastPoint[0] - headLen * Math.cos(angle + Math.PI / 6),
                y + lastPoint[1] - headLen * Math.sin(angle + Math.PI / 6)
              );
              ctx.stroke();
            }
          }
        } else if (element.type === 'text') {
          ctx.fillStyle = element.strokeColor || '#000000';
          ctx.textAlign = element.textAlign || 'center';
          ctx.textBaseline = element.baseline || 'middle';
          ctx.font = `${element.fontSize || 16}px ${element.fontFamily === 1 ? 'Arial' : element.fontFamily === 2 ? 'Cascadia' : 'sans-serif'}`;
          ctx.fillText(element.text || '', x, y);
        } else if (element.type === 'freedraw' && Array.isArray(element.points)) {
          ctx.beginPath();
          const firstPoint = element.points[0];
          if (firstPoint && Array.isArray(firstPoint) && firstPoint.length >= 2) {
            ctx.moveTo(x + firstPoint[0], y + firstPoint[1]);
            for (let i = 1; i < element.points.length; i++) {
              const point = element.points[i];
              if (point && Array.isArray(point) && point.length >= 2) {
                ctx.lineTo(x + point[0], y + point[1]);
              }
            }
            ctx.stroke();
          }
        }
      } catch (error) {
        console.error('Error rendering element:', element, error);
      }
    });

    ctx.restore();
  }, [diagramData, maxWidth, maxHeight]);

  if (!diagramData || (Array.isArray(diagramData) && diagramData.length === 0)) {
    return null;
  }

  return (
    <div className={`flex justify-center items-center my-4 ${className}`}>
      <div className="bg-white border-2 border-gray-200 rounded-lg p-4 shadow-sm">
        <canvas
          ref={canvasRef}
          className="max-w-full h-auto"
        />
      </div>
    </div>
  );
}
