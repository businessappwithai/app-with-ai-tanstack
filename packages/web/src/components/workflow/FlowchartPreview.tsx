"use client";

import { Download, ZoomIn, ZoomOut } from "lucide-react";
import mermaid from "mermaid";
import React, { useEffect, useRef, useState } from "react";

interface FlowchartPreviewProps {
  flowchartCode: string;
  showZoomControls?: boolean;
  showDownloadButton?: boolean;
  onError?: (errors: string[]) => void;
  className?: string;
}

// Initialize Mermaid with high-contrast theme for arrows
mermaid.initialize({
  startOnLoad: false,
  theme: "default",
  securityLevel: "loose",
  themeVariables: {
    // High-contrast arrow colors
    lineColor: "#2563eb",
    clusterBkg: "#ffffff",
    clusterBorder: "#2563eb",
    primaryColor: "#e0f2fe",
    primaryTextColor: "#0f172a",
    primaryBorderColor: "#2563eb",
    secondaryColor: "#f1f5f9",
    tertiaryColor: "#f8fafc",
  },
});

export function FlowchartPreview({
  flowchartCode,
  showZoomControls = true,
  showDownloadButton = false,
  onError,
  className = "",
}: FlowchartPreviewProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const mermaidIdRef = useRef(0);
  const [zoom, setZoom] = useState(100);
  const [isLoading, setIsLoading] = useState(false);

  // Render Mermaid diagram when code changes
  useEffect(() => {
    const renderDiagram = async () => {
      if (!previewRef.current || !flowchartCode.trim()) return;

      setIsLoading(true);
      try {
        const id = `mermaid-${mermaidIdRef.current++}`;
        const { svg } = await mermaid.render(id, flowchartCode);
        previewRef.current.innerHTML = svg;
        onError?.([]);
      } catch (error) {
        console.error("Mermaid render error:", error);
        const errors = error instanceof Error ? [error.message] : ["Unknown rendering error"];
        onError?.(errors);
      } finally {
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [flowchartCode, onError]);

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 50));
  const handleResetZoom = () => setZoom(100);

  const handleDownloadSVG = () => {
    if (!previewRef.current) return;

    const svgElement = previewRef.current.querySelector("svg");
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const blob = new Blob([svgData], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `flowchart-${Date.now()}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Controls */}
      {(showZoomControls || showDownloadButton) && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
          {showZoomControls && (
            <>
              <button
                onClick={handleZoomOut}
                className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              </button>
              <button
                onClick={handleResetZoom}
                className="px-3 py-2 bg-white dark:bg-slate-800 rounded-lg shadow-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                {zoom}%
              </button>
              <button
                onClick={handleZoomIn}
                className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4 text-slate-700 dark:text-slate-300" />
              </button>
            </>
          )}
          {showDownloadButton && (
            <button
              onClick={handleDownloadSVG}
              className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              title="Download SVG"
            >
              <Download className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            </button>
          )}
        </div>
      )}

      {/* Preview Area */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 dark:bg-slate-900 z-0">
          <div className="text-slate-600 dark:text-slate-400">Rendering...</div>
        </div>
      )}

      <div
        ref={previewRef}
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: "top left",
        }}
        className="mermaid-preview overflow-auto"
      />
    </div>
  );
}
