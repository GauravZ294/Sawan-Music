import React, { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../utils/audioEngine';
import { Activity, BarChart3, Disc, Sparkles } from 'lucide-react';

interface AudioVisualizerProps {
  isPlaying: boolean;
  accentColor?: string;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  isPlaying,
  accentColor = '#f43f5e',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [visMode, setVisMode] = useState<'wave' | 'bars' | 'circular'>('wave');
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = 128;
    const freqData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      audioEngine.getFrequencyData(freqData);
      audioEngine.getTimeDomainData(timeData);

      if (visMode === 'wave') {
        // Glowing Neon Waveform
        ctx.beginPath();
        ctx.lineWidth = 3;
        ctx.strokeStyle = accentColor;
        ctx.shadowBlur = isPlaying ? 16 : 4;
        ctx.shadowColor = accentColor;

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = timeData[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();

        // Subtle gradient fill under wave
        ctx.lineTo(width, height);
        ctx.lineTo(0, height);
        ctx.closePath();
        const fillGrad = ctx.createLinearGradient(0, 0, 0, height);
        fillGrad.addColorStop(0, `${accentColor}33`);
        fillGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = fillGrad;
        ctx.fill();
        ctx.shadowBlur = 0;
      } else if (visMode === 'bars') {
        // Equalizer Frequency Bars
        const barCount = 48;
        const barWidth = (width / barCount) - 3;
        const step = Math.floor(bufferLength / barCount);

        for (let i = 0; i < barCount; i++) {
          const rawVal = freqData[i * step] || 0;
          const barHeight = Math.max(4, (rawVal / 255) * (height - 10));
          const x = i * (barWidth + 3);
          const y = height - barHeight;

          const barGrad = ctx.createLinearGradient(0, height, 0, 0);
          barGrad.addColorStop(0, accentColor);
          barGrad.addColorStop(0.7, '#ec4899');
          barGrad.addColorStop(1, '#a855f7');

          ctx.fillStyle = barGrad;
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, barHeight, [3, 3, 0, 0]);
          ctx.fill();

          // Little cap on top of bar
          if (barHeight > 10) {
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x, Math.max(0, y - 3), barWidth, 2);
          }
        }
      } else if (visMode === 'circular') {
        // Circular Pulsing Aura
        const centerX = width / 2;
        const centerY = height / 2;
        const baseRadius = Math.min(centerX, centerY) * 0.45;

        // Average bass value
        let bassSum = 0;
        for (let i = 0; i < 16; i++) bassSum += freqData[i];
        const bassAvg = bassSum / 16;
        const pulse = (bassAvg / 255) * 20;

        ctx.save();
        ctx.translate(centerX, centerY);

        const points = 64;
        const angleStep = (Math.PI * 2) / points;

        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
          const index = i % points;
          const dataIdx = Math.floor((index / points) * (bufferLength / 2));
          const val = freqData[dataIdx] || 0;
          const r = baseRadius + pulse + (val / 255) * 35;
          const angle = index * angleStep;

          const px = Math.cos(angle) * r;
          const py = Math.sin(angle) * r;

          if (i === 0) {
            ctx.moveTo(px, py);
          } else {
            ctx.lineTo(px, py);
          }
        }
        ctx.closePath();

        const radGrad = ctx.createRadialGradient(0, 0, 10, 0, 0, baseRadius + 40);
        radGrad.addColorStop(0, `${accentColor}22`);
        radGrad.addColorStop(0.7, `${accentColor}55`);
        radGrad.addColorStop(1, `${accentColor}`);
        ctx.strokeStyle = radGrad;
        ctx.lineWidth = 2.5;
        ctx.shadowBlur = 12;
        ctx.shadowColor = accentColor;
        ctx.stroke();

        ctx.restore();
      }
    };

    render();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [visMode, accentColor, isPlaying]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden">
      <canvas
        ref={canvasRef}
        width={600}
        height={180}
        className="w-full h-full max-h-44 object-contain"
      />
      
      {/* Visualizer Mode Switcher */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-zinc-900/80 backdrop-blur-md px-2 py-1 rounded-full border border-zinc-800 text-xs">
        <button
          onClick={() => setVisMode('wave')}
          title="Waveform"
          className={`p-1 rounded-full transition-colors ${
            visMode === 'wave' ? 'bg-rose-500/20 text-rose-400' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Activity size={14} />
        </button>
        <button
          onClick={() => setVisMode('bars')}
          title="Frequency Spectrum Bars"
          className={`p-1 rounded-full transition-colors ${
            visMode === 'bars' ? 'bg-rose-500/20 text-rose-400' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <BarChart3 size={14} />
        </button>
        <button
          onClick={() => setVisMode('circular')}
          title="Circular Mandala Pulse"
          className={`p-1 rounded-full transition-colors ${
            visMode === 'circular' ? 'bg-rose-500/20 text-rose-400' : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Sparkles size={14} />
        </button>
      </div>
    </div>
  );
};
