import React, { useState, useEffect, useRef, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCw, RefreshCw, Check, X, Move } from "lucide-react";

export default function ImageCropModal({ isOpen, imageSrc, onClose, onApply }) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [imageDims, setImageDims] = useState({ naturalWidth: 0, naturalHeight: 0, baseWidth: 0, baseHeight: 0 });
  
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const previewImgRef = useRef(null);
  const containerRef = useRef(null);

  const CROP_SIZE = 260; // Size of circular viewport in px

  // Reset adjustments whenever a new image is opened
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setRotation(0);
      setIsDragging(false);
    }
  }, [isOpen, imageSrc]);

  const handleImageLoaded = (e) => {
    const natW = e.target.naturalWidth || 400;
    const natH = e.target.naturalHeight || 400;
    const aspect = natW / natH;
    let bw, bh;
    if (aspect >= 1) {
      bh = CROP_SIZE;
      bw = Math.round(CROP_SIZE * aspect);
    } else {
      bw = CROP_SIZE;
      bh = Math.round(CROP_SIZE / aspect);
    }
    setImageDims({ naturalWidth: natW, naturalHeight: natH, baseWidth: bw, baseHeight: bh });
  };

  // Handle Mouse / Touch Dragging for Panning
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    dragStartRef.current = {
      x: clientX,
      y: clientY,
      panX: pan.x,
      panY: pan.y,
    };
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging) return;
      const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
      const deltaX = clientX - dragStartRef.current.x;
      const deltaY = clientY - dragStartRef.current.y;
      setPan({
        x: Math.round(dragStartRef.current.panX + deltaX),
        y: Math.round(dragStartRef.current.panY + deltaY),
      });
    },
    [isDragging]
  );

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Zoom with Wheel
  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 0.08 : -0.08;
    setZoom((prev) => Math.min(Math.max(Number((prev + zoomFactor).toFixed(2)), 1), 3));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setRotation(0);
  };

  // Crop & Export onto high-res canvas
  const handleApplyCrop = () => {
    const img = previewImgRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) {
      if (imageSrc) onApply(imageSrc);
      onClose();
      return;
    }

    try {
      const OUTPUT_SIZE = 400; // 400x400 px crisp avatar output
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        if (imageSrc) onApply(imageSrc);
        onClose();
        return;
      }

      ctx.imageSmoothingQuality = "high";
      ctx.imageSmoothingEnabled = true;

      const natW = img.naturalWidth;
      const natH = img.naturalHeight;
      const aspect = natW / natH;
      const bw = imageDims.baseWidth || (aspect >= 1 ? CROP_SIZE * aspect : CROP_SIZE);
      const bh = imageDims.baseHeight || (aspect >= 1 ? CROP_SIZE : CROP_SIZE / aspect);

      const scale = OUTPUT_SIZE / CROP_SIZE;

      ctx.save();
      // Move to center of output canvas
      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
      // Translate by pan offset
      ctx.translate(pan.x * scale, pan.y * scale);
      // Rotate
      ctx.rotate((rotation * Math.PI) / 180);

      // Draw image scaled
      const drawW = bw * zoom * scale;
      const drawH = bh * zoom * scale;
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      const croppedBase64 = canvas.toDataURL("image/png");
      if (croppedBase64 && croppedBase64.length > 50) {
        onApply(croppedBase64);
      } else if (imageSrc) {
        onApply(imageSrc);
      }
    } catch (err) {
      console.error("Error cropping image:", err);
      if (imageSrc) onApply(imageSrc);
    }
    onClose();
  };

  if (!isOpen || !imageSrc) return null;

  const bw = imageDims.baseWidth || CROP_SIZE;
  const bh = imageDims.baseHeight || CROP_SIZE;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
      }}
      onMouseUp={handleMouseUp}
      onTouchEnd={handleMouseUp}
      onMouseMove={handleMouseMove}
      onTouchMove={handleMouseMove}
    >
      <div
        style={{
          background: "var(--card-bg, #ffffff)",
          color: "var(--text-primary, #1e293b)",
          borderRadius: "18px",
          width: "100%",
          maxWidth: "440px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
          border: "1px solid var(--border-color, #e2e8f0)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-color, #e2e8f0)",
          }}
        >
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
              Adjust Profile Picture
            </h3>
            <p style={{ fontSize: "12px", color: "var(--text-tertiary, #64748b)", margin: "2px 0 0" }}>
              Drag to reposition, zoom or rotate your photo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary, #64748b)",
              padding: "4px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Viewport Area */}
        <div
          ref={containerRef}
          style={{
            position: "relative",
            width: "100%",
            height: "300px",
            background: "#090d16",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            userSelect: "none",
            cursor: isDragging ? "grabbing" : "grab",
          }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          onWheel={handleWheel}
        >
          {/* Draggable & Transformable Image */}
          <img
            ref={previewImgRef}
            src={imageSrc}
            alt="Crop Preview"
            draggable={false}
            onLoad={handleImageLoaded}
            style={{
              maxWidth: "none",
              maxHeight: "none",
              width: `${bw}px`,
              height: `${bh}px`,
              transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
              transformOrigin: "center center",
              transition: isDragging ? "none" : "transform 0.05s ease-out",
              pointerEvents: "none",
              display: "block",
              userSelect: "none",
            }}
          />

          {/* Mask / Crop Circle Overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              boxShadow: `0 0 0 9999px rgba(9, 13, 22, 0.75)`,
              width: `${CROP_SIZE}px`,
              height: `${CROP_SIZE}px`,
              borderRadius: "50%",
              border: "2.5px solid rgba(255, 255, 255, 0.95)",
              margin: "auto",
              boxSizing: "border-box",
            }}
          >
            {/* Center crosshair subtle guide */}
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: 0,
                right: 0,
                height: "1px",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: 0,
                bottom: 0,
                width: "1px",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                pointerEvents: "none",
              }}
            />
          </div>

          {/* Helper hint */}
          <div
            style={{
              position: "absolute",
              bottom: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "11px",
              fontWeight: "600",
              color: "rgba(255, 255, 255, 0.9)",
              background: "rgba(0, 0, 0, 0.65)",
              padding: "4px 12px",
              borderRadius: "20px",
              pointerEvents: "none",
              backdropFilter: "blur(4px)",
            }}
          >
            <Move size={12} />
            <span>Drag image to position</span>
          </div>
        </div>

        {/* Adjust Controls */}
        <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Zoom Slider */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button
              type="button"
              onClick={() => setZoom((prev) => Math.max(Number((prev - 0.1).toFixed(2)), 1))}
              style={{
                background: "var(--bg-secondary, #f1f5f9)",
                border: "1px solid var(--border-color, #e2e8f0)",
                borderRadius: "8px",
                padding: "6px",
                cursor: "pointer",
                display: "flex",
                color: "var(--text-primary, #1e293b)",
              }}
              title="Zoom out"
            >
              <ZoomOut size={16} />
            </button>

            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              style={{
                flex: 1,
                accentColor: "var(--accent, #38bdf8)",
                cursor: "pointer",
              }}
            />

            <button
              type="button"
              onClick={() => setZoom((prev) => Math.min(Number((prev + 0.1).toFixed(2)), 3))}
              style={{
                background: "var(--bg-secondary, #f1f5f9)",
                border: "1px solid var(--border-color, #e2e8f0)",
                borderRadius: "8px",
                padding: "6px",
                cursor: "pointer",
                display: "flex",
                color: "var(--text-primary, #1e293b)",
              }}
              title="Zoom in"
            >
              <ZoomIn size={16} />
            </button>
          </div>

          {/* Toolbar Buttons: Rotate & Reset */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleRotate}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  padding: "6px 12px",
                }}
              >
                <RotateCw size={14} />
                <span>Rotate 90°</span>
              </button>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleReset}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "12px",
                  padding: "6px 12px",
                }}
              >
                <RefreshCw size={14} />
                <span>Reset</span>
              </button>
            </div>

            <span style={{ fontSize: "12px", fontWeight: "600", color: "var(--text-tertiary, #64748b)" }}>
              {Math.round(zoom * 100)}%
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            padding: "12px 20px 16px",
            borderTop: "1px solid var(--border-color, #e2e8f0)",
          }}
        >
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleApplyCrop}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <Check size={16} strokeWidth={2} />
            <span>Apply Photo</span>
          </button>
        </div>
      </div>
    </div>
  );
}
