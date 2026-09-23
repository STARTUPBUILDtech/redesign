import { useState, useRef } from "react";
import "../../styles/mobile-confirm-delivery.css";

export default function ReportIssueModal({
  isOpen,
  onClose,
  orderNumber = "ORD-662819",
  onSubmitReport,
}) {
  const [selectedReason, setSelectedReason] = useState("");
  const [description, setDescription] = useState("");
  const [images, setImages] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const reasons = [
    "Item received is damaged or defective",
    "Wrong item or specifications delivered",
    "Items missing from package",
    "Package marked delivered but not received",
  ];

  const handleFiles = (incomingFiles) => {
    setErrorMessage("");
    const fileList = Array.from(incomingFiles);
    const validImages = fileList.filter((f) => f.type.startsWith("image/"));

    if (validImages.length === 0) {
      setErrorMessage("Please select valid image files (JPG, PNG, WEBP).");
      return;
    }

    if (images.length + validImages.length > 4) {
      setErrorMessage("You can upload a maximum of 4 photos.");
    }

    const availableSlots = Math.max(0, 4 - images.length);
    const filesToAdd = validImages.slice(0, availableSlots);

    const newEntries = filesToAdd.map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: file.name,
      size: (file.size / 1024).toFixed(0) + " KB",
      url: URL.createObjectURL(file),
      file,
    }));

    setImages((prev) => [...prev, ...newEntries]);
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    // reset input so the same file can be chosen again if removed
    e.target.value = "";
  };

  const handleRemoveImage = (idToRemove) => {
    setImages((prev) => {
      const removed = prev.find((img) => img.id === idToRemove);
      if (removed?.url) {
        URL.revokeObjectURL(removed.url);
      }
      return prev.filter((img) => img.id !== idToRemove);
    });
    setErrorMessage("");
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    if (!selectedReason && !description.trim()) {
      setErrorMessage("Please select an issue reason or describe the problem.");
      return;
    }

    if (onSubmitReport) {
      onSubmitReport({
        orderNumber,
        reason: selectedReason || "General issue",
        description,
        images,
      });
    }

    // Clean up
    onClose();
  };

  return (
    <div className="ap-bottom-sheet-backdrop cd-issue-backdrop" onClick={onClose}>
      <div
        className="ap-bottom-sheet cd-issue-sheet-container"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cd-issue-title"
      >
        {/* Sheet Top Grab Handle */}
        <div className="ap-sheet-handle" />

        {/* ── Modal Header: Title + Order Number + Close ── */}
        <div className="ap-sheet-header cd-issue-header">
          <div className="ap-sheet-title-group cd-issue-title-group">
            <h3 id="cd-issue-title" className="ap-sheet-title" style={{ color: "#dc2626" }}>
              Report an Issue
            </h3>
            <span className="ap-sheet-ord-pill cd-issue-order-pill" title={`Order ID: ${orderNumber}`}>
              {orderNumber}
            </span>
          </div>
          <button
            type="button"
            className="ap-sheet-close-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              close
            </span>
          </button>
        </div>

        {/* ── Modal Body Content ── */}
        <div className="cd-issue-modal">
          <div className="cd-issue-top-group">
            <p className="cd-issue-subtitle">
              Select the issue you encountered with your delivery:
            </p>

            {/* Issue Reasons Selection */}
            <div className="cd-issue-reasons-list">
              {reasons.map((reason, idx) => {
                const isSelected = selectedReason === reason;
                return (
                  <div
                    key={idx}
                    className={`cd-issue-option ${isSelected ? "selected" : ""}`}
                    onClick={() => {
                      setSelectedReason(reason);
                      setErrorMessage("");
                    }}
                    role="radio"
                    aria-checked={isSelected}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedReason(reason);
                        setErrorMessage("");
                      }
                    }}
                  >
                    <span
                      className="material-symbols-outlined cd-issue-icon"
                      style={{
                        color: isSelected ? "#dc2626" : "var(--muted)",
                        fontSize: 19,
                      }}
                    >
                      {isSelected ? "check_circle" : "radio_button_unchecked"}
                    </span>
                    <span className="cd-issue-reason-text">{reason}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Description Textarea */}
          <div className="cd-issue-field-group cd-issue-desc-group">
            <label className="cd-issue-label" htmlFor="issue-description">
              Issue Details <span className="cd-issue-label-sub">(optional)</span>
            </label>
            <textarea
              id="issue-description"
              className="cd-issue-textarea"
              placeholder="Describe your issues in details"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          {/* ── Image Upload Section ── */}
          <div className="cd-issue-field-group cd-issue-photo-group">
            <div className="cd-issue-upload-header">
              <label className="cd-issue-label">
                Attach Evidence Photos <span className="cd-issue-label-sub">(optional)</span>
              </label>
              <span className="cd-issue-photo-counter">
                {images.length}/4 uploaded
              </span>
            </div>

            {/* Hidden native file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png, image/jpeg, image/webp, image/heic"
              multiple
              style={{ display: "none" }}
              onChange={handleFileInputChange}
            />

            {/* Tap to Upload Trigger Zone (only shown when no images uploaded yet) */}
            {images.length === 0 && (
              <div
                className="cd-image-dropzone"
                onClick={() => fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                aria-label="Tap to upload photos"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
              >
                <div className="cd-dropzone-icon-wrap">
                  <span className="material-symbols-outlined">add_photo_alternate</span>
                </div>
                <div className="cd-dropzone-text">
                  <span className="cd-dropzone-main">Tap to upload</span>
                  <span className="cd-dropzone-sub">PNG, JPG, or WEBP up to 5MB</span>
                </div>
              </div>
            )}

            {/* Image Preview Grid */}
            {images.length > 0 && (
              <div className="cd-image-previews-grid">
                {images.map((img) => (
                  <div key={img.id} className="cd-preview-card">
                    <img src={img.url} alt={img.name} className="cd-preview-img" />
                    <button
                      type="button"
                      className="cd-preview-remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveImage(img.id);
                      }}
                      title="Remove image"
                      aria-label={`Remove ${img.name}`}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                        close
                      </span>
                    </button>
                    <span className="cd-preview-name" title={img.name}>
                      {img.name}
                    </span>
                  </div>
                ))}

                {images.length < 4 && (
                  <button
                    type="button"
                    className="cd-preview-add-more-btn"
                    onClick={() => fileInputRef.current?.click()}
                    title="Add another photo"
                  >
                    <span className="material-symbols-outlined">add</span>
                    <span>Add</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Validation Error Message */}
          {errorMessage && (
            <div className="cd-issue-error-message">
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>
                error
              </span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action CTA */}
          <button
            type="button"
            onClick={handleSubmit}
            className="cd-report-btn"
          >
            Submit Report
          </button>
        </div>
      </div>
    </div>
  );
}
