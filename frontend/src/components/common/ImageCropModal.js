import React, { useState, useEffect, useRef, useCallback } from "react";
import { X, ZoomIn, ZoomOut, Camera, Trash2, Check } from "lucide-react";

export default function ImageCropModal({
  isOpen,
  imageSrc,
  onClose,
  onApply,
  onRemove,
  onSelectNewFile,
  hasExistingPhoto = false,
}) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imageDims, setImageDims] = useState({ naturalWidth: 0, naturalHeight: 0, baseWidth: 0, baseHeight: 0 });

  const modalFileInputRef = useRef(null);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const previewImgRef = useRef(null);
  const containerRef = useRef(null);

  const CROP_SIZE = 260; // Size of circular viewport in px

  // Reset adjustments whenever a new image is opened
  useEffect(() => {
    if (isOpen && imageSrc) {
      setZoom(1);
      setPan({ x: 0, y: 0 });
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

  const handleModalFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (onSelectNewFile) {
      onSelectNewFile(file);
    }
    e.target.value = "";
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
      const OUTPUT_SIZE = 400;
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
      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);
      ctx.translate(pan.x * scale, pan.y * scale);

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
          borderRadius: "20px",
          width: "100%",
          maxWidth: "420px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
          border: "1px solid var(--border-color, #e2e8f0)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden File Input for changing photo */}
        <input
          type="file"
          ref={modalFileInputRef}
          style={{ display: "none" }}
          accept="image/png, image/jpeg, image/webp, image/gif"
          onChange={handleModalFileChange}
        />

        {/* Minimal Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 20px",
            borderBottom: "1px solid var(--border-color, #e2e8f0)",
          }}
        >
          <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--text-primary)" }}>
            Profile Picture
          </h3>
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
            <X size={18} />
          </button>
        </div>

        {/* Clean Photo Viewport */}
        <div
          ref={containerRef}
          style={{
            position: "relative",
            width: "100%",
            height: "290px",
            background: "#080c14",
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
          {/* Draggable Image */}
          <img
            ref={previewImgRef}
            src={imageSrc}
            alt="Profile Preview"
            draggable={false}
            onLoad={handleImageLoaded}
            style={{
              maxWidth: "none",
              maxHeight: "none",
              width: `${bw}px`,
              height: `${bh}px`,
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: "center center",
              transition: isDragging ? "none" : "transform 0.05s ease-out",
              pointerEvents: "none",
              display: "block",
              userSelect: "none",
            }}
          />

          {/* Clean Circular Mask */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              boxShadow: `0 0 0 9999px rgba(8, 12, 20, 0.78)`,
              width: `${CROP_SIZE}px`,
              height: `${CROP_SIZE}px`,
              borderRadius: "50%",
              border: "2px solid rgba(255, 255, 255, 0.95)",
              margin: "auto",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Minimal Zoom Bar */}
        <div style={{ padding: "12px 20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={() => setZoom((prev) => Math.max(Number((prev - 0.1).toFixed(2)), 1))}
            style={{
              background: "transparent",
              border: "none",
              padding: "4px",
              cursor: "pointer",
              display: "flex",
              color: "var(--text-secondary, #64748b)",
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
              background: "transparent",
              border: "none",
              padding: "4px",
              cursor: "pointer",
              display: "flex",
              color: "var(--text-secondary, #64748b)",
            }}
            title="Zoom in"
          >
            <ZoomIn size={16} />
          </button>
        </div>

        {/* Clean Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "12px 18px",
            borderTop: "1px solid var(--border-color, #e2e8f0)",
            background: "var(--bg-secondary, #f8fafc)",
          }}
        >
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              type="button"
              onClick={() => modalFileInputRef.current?.click()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                padding: "6px 10px",
                fontSize: "12px",
                fontWeight: "600",
                borderRadius: "8px",
                background: "var(--card-bg, #ffffff)",
                border: "1px solid var(--border-color, #e2e8f0)",
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              <Camera size={13} />
              <span>Change</span>
            </button>

            {(hasExistingPhoto || onRemove) && (
              <button
                type="button"
                onClick={() => {
                  if (onRemove) onRemove();
                  onClose();
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "6px 10px",
                  fontSize: "12px",
                  fontWeight: "600",
                  borderRadius: "8px",
                  background: "transparent",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                  color: "var(--danger, #EF4444)",
                  cursor: "pointer",
                }}
              >
                <Trash2 size={13} />
                <span>Remove</span>
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: "8px" }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ padding: "6px 12px", fontSize: "12px" }}
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
                gap: "5px",
                padding: "6px 14px",
                fontSize: "12px",
              }}
            >
              <Check size={14} strokeWidth={2.5} />
              <span>Done</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
