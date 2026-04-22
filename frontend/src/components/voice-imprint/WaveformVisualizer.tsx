import { useEffect, useRef, useState } from 'react';

const BAR_COUNT = 32;

interface WaveformVisualizerProps {
  analyserNode: AnalyserNode | null;
  isActive: boolean;
}

export function WaveformVisualizer({ analyserNode, isActive }: WaveformVisualizerProps) {
  const animationFrameRef = useRef<number | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const [barHeights, setBarHeights] = useState<number[]>(() => new Array(BAR_COUNT).fill(0));

  useEffect(() => {
    if (!isActive || !analyserNode) {
      // Reset bars when inactive
      setBarHeights(new Array(BAR_COUNT).fill(0));
      return;
    }

    // Set up frequency data buffer
    const bufferLength = analyserNode.frequencyBinCount;
    dataArrayRef.current = new Uint8Array(bufferLength);

    const step = Math.floor(bufferLength / BAR_COUNT);

    function animate() {
      if (!analyserNode || !dataArrayRef.current) return;

      analyserNode.getByteFrequencyData(dataArrayRef.current);

      const heights: number[] = [];
      for (let i = 0; i < BAR_COUNT; i++) {
        // Sample evenly across the frequency spectrum
        const value = dataArrayRef.current[i * step] ?? 0;
        // Normalize 0-255 to 0-100 percentage
        heights.push((value / 255) * 100);
      }

      setBarHeights(heights);
      animationFrameRef.current = requestAnimationFrame(animate);
    }

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isActive, analyserNode]);

  return (
    <div
      className="flex items-end justify-center gap-[2px] h-24 w-full px-4"
      role="img"
      aria-label="Audio waveform visualization"
    >
      {barHeights.map((height, index) => {
        // Interpolate color from green (rgb(0,255,200)) to cyan (rgb(0,200,255))
        const ratio = index / (BAR_COUNT - 1);
        const g = Math.round(255 - 55 * ratio);
        const b = Math.round(200 + 55 * ratio);
        const color = `rgb(0, ${g}, ${b})`;

        return (
          <div
            key={index}
            className="flex-1 max-w-2 rounded-sm transition-[height] duration-75"
            style={{
              height: `${Math.max(height, 4)}%`,
              backgroundColor: color,
              boxShadow: height > 10 ? `0 0 6px ${color}, 0 0 12px ${color}40` : 'none',
            }}
          />
        );
      })}
    </div>
  );
}
