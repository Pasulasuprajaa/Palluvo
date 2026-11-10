import React, { useState, useEffect, useRef } from 'react';
import { X, Star, Upload, Sparkles, Check, Image as ImageIcon } from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';

export default function ReviewModal({ isOpen, onClose, product, onReviewSubmitted }) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [fitRating, setFitRating] = useState('True to Drape');
  const [fabricFeel, setFabricFeel] = useState('Ultra Soft & Luxurious');
  const [photos, setPhotos] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState(false);
  const [isVerifiedBuyer, setIsVerifiedBuyer] = useState(false);

  // Invalidation tokens to track and invalidate pending conversions and submissions
  const conversionSessionRef = useRef(0);
  const submissionSessionRef = useRef(0);

  // Clear photo drafts, review form fields, and invalidate in-flight sessions whenever product.id changes
  useEffect(() => {
    submissionSessionRef.current += 1;
    conversionSessionRef.current += 1;
    setIsProcessingPhotos(false);
    setIsSubmitting(false);
    setPhotos([]);
    setTitle('');
    setComment('');
    setRating(5);
    setHoverRating(0);
  }, [product?.id]);

  // Clean up in-flight background tokens on unmount
  useEffect(() => {
    return () => {
      submissionSessionRef.current += 1;
      conversionSessionRef.current += 1;
    };
  }, []);

  // Check if authenticated user has completed a paid purchase for this product
  useEffect(() => {
    let isSubscribed = true;
    const token = localStorage.getItem('palluvo_token');
    if (token && product?.id) {
      fetch(`/api/reviews/check-purchase/${product.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          if (isSubscribed) {
            setIsVerifiedBuyer(Boolean(data?.verified_purchase));
          }
        })
        .catch(() => {
          if (isSubscribed) setIsVerifiedBuyer(false);
        });
    } else {
      setIsVerifiedBuyer(false);
    }

    return () => {
      isSubscribed = false;
      conversionSessionRef.current += 1;
    };
  }, [product?.id, user]);

  if (!isOpen || !product) return null;

  const MAX_PHOTO_BYTES = 2 * 1024 * 1024; // 2MB binary limit per photo
  const MAX_AGGREGATE_PHOTO_BYTES = 6 * 1024 * 1024; // 6MB total limit across all photos
  const MAX_TITLE_CHARS = 150;
  const MAX_COMMENT_CHARS = 4000;

  const resizeImageToDataUrl = (file, maxWidth = 1200, maxHeight = 1200, quality = 0.82) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const rawDataUrl = event.target?.result;
        if (!rawDataUrl || typeof rawDataUrl !== 'string') {
          return resolve(null);
        }

        const img = new Image();
        img.onload = () => {
          try {
            let { width, height } = img;
            if (width > maxWidth || height > maxHeight) {
              if (width / height > maxWidth / maxHeight) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
              } else {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
              }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            // Fill white background in case of transparent PNG/WebP
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            // Export as JPEG so browser strictly honors quality compression (PNG ignores quality)
            let resizedDataUrl = canvas.toDataURL('image/jpeg', quality);

            // Enforce matching per-photo cap (2MB) after resizing
            let base64Part = resizedDataUrl.split(',')[1] || '';
            let byteLength = Math.ceil((base64Part.length * 3) / 4);

            if (byteLength > MAX_PHOTO_BYTES) {
              // Retry with smaller dimensions and lower quality if initial pass exceeds cap
              canvas.width = Math.round(width * 0.7);
              canvas.height = Math.round(height * 0.7);
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              resizedDataUrl = canvas.toDataURL('image/jpeg', 0.75);

              base64Part = resizedDataUrl.split(',')[1] || '';
              byteLength = Math.ceil((base64Part.length * 3) / 4);
              if (byteLength > MAX_PHOTO_BYTES) {
                return resolve(null);
              }
            }

            resolve(resizedDataUrl);
          } catch (e) {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = rawDataUrl;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e) => {
    if (isSubmitting || isProcessingPhotos) return;
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = 3 - photos.length;
    if (remainingSlots <= 0) {
      showToast('Maximum 3 photos allowed.', 'info');
      return;
    }

    const selectedFiles = files.slice(0, remainingSlots);

    // Increment session token to invalidate previous runs and tie conversions to this session
    conversionSessionRef.current += 1;
    const currentSession = conversionSessionRef.current;
    setIsProcessingPhotos(true);

    try {
      // Calculate current aggregate bytes
      let currentAggregateBytes = photos.reduce((acc, p) => {
        const b64 = p.split(',')[1] || '';
        return acc + Math.ceil((b64.length * 3) / 4);
      }, 0);

      for (const file of selectedFiles) {
        // Guard: check if session was invalidated (e.g. closed or product changed)
        if (conversionSessionRef.current !== currentSession) return;

        if (!file.type || !file.type.startsWith('image/')) {
          showToast(`"${file.name}" is not a supported image file (PNG, JPEG, WebP).`, 'error');
          continue;
        }
        if (file.size > 10 * 1024 * 1024) {
          showToast(`"${file.name}" exceeds the 10MB limit.`, 'error');
          continue;
        }

        const resized = await resizeImageToDataUrl(file);

        // Guard: check again after async await if session was invalidated
        if (conversionSessionRef.current !== currentSession) return;

        if (!resized) {
          showToast(`Photo "${file.name}" exceeds the 2MB limit after compression.`, 'error');
          continue;
        }

        const newPhotoBytes = Math.ceil(((resized.split(',')[1] || '').length * 3) / 4);
        if (currentAggregateBytes + newPhotoBytes > MAX_AGGREGATE_PHOTO_BYTES) {
          showToast('Total photo attachments cannot exceed the 6MB limit.', 'error');
          break;
        }

        currentAggregateBytes += newPhotoBytes;
        setPhotos((prev) => {
          if (conversionSessionRef.current !== currentSession) return prev;
          if (prev.length >= 3) return prev;
          return [...prev, resized];
        });
      }
    } finally {
      if (conversionSessionRef.current === currentSession) {
        setIsProcessingPhotos(false);
      }
      if (e.target) {
        e.target.value = '';
      }
    }
  };

  const handleRemovePhoto = (idx) => {
    if (isSubmitting || isProcessingPhotos) return;
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleClose = () => {
    // Keep a closed submission from mutating a later draft: disallow closing while publishing
    if (isSubmitting) return;

    // Invalidate any in-flight submission and photo conversion sessions immediately
    submissionSessionRef.current += 1;
    conversionSessionRef.current += 1;
    setIsProcessingPhotos(false);
    setPhotos([]);
    setTitle('');
    setComment('');
    setRating(5);
    setHoverRating(0);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (isProcessingPhotos) {
      showToast('Please wait for photos to finish processing before submitting.', 'info');
      return;
    }
    if (!comment.trim()) {
      showToast('Please share your drape experience in the review comment.', 'error');
      return;
    }
    if (comment.trim().length > MAX_COMMENT_CHARS) {
      showToast(`Review comment cannot exceed ${MAX_COMMENT_CHARS.toLocaleString()} characters.`, 'error');
      return;
    }
    if (title.trim().length > MAX_TITLE_CHARS) {
      showToast(`Headline cannot exceed ${MAX_TITLE_CHARS} characters.`, 'error');
      return;
    }

    // Invalidate background conversions and capture active submission session
    conversionSessionRef.current += 1;
    submissionSessionRef.current += 1;
    const currentSubmissionSession = submissionSessionRef.current;
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem('palluvo_token');
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          product_id: product.id,
          rating,
          title: title.trim() || 'Exquisite Handcrafted Saree',
          comment: comment.trim(),
          photos: photos.length > 0 ? photos : undefined
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit review');

      // Guard: if modal was closed, cancelled, or product changed during fetch, discard callback
      if (submissionSessionRef.current !== currentSubmissionSession) return;

      setPhotos([]);
      setTitle('');
      setComment('');
      setRating(5);
      setHoverRating(0);
      if (data.verified_purchase) {
        showToast('✨ Thank you! Your review has been published with a Verified Drape badge.', 'success');
      } else {
        showToast('✨ Thank you! Your review has been published.', 'success');
      }
      if (onReviewSubmitted) onReviewSubmitted();
      onClose();
    } catch (err) {
      if (submissionSessionRef.current !== currentSubmissionSession) return;
      showToast(err.message || 'Failed to submit review.', 'error');
    } finally {
      if (submissionSessionRef.current === currentSubmissionSession) {
        setIsSubmitting(false);
      }
    }
  };

  const isFormLocked = isSubmitting || isProcessingPhotos;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#FAF7F2] rounded-2xl shadow-2xl border border-[#C5A059]/40 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#5B1425] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/10 text-[#C5A059]">
              <Star className="w-5 h-5 fill-[#C5A059]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif font-bold text-lg text-[#E5D3B3]">
                  {isVerifiedBuyer ? 'Write a Verified Review' : 'Write a Review'}
                </h3>
                {isVerifiedBuyer && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3 text-emerald-400" /> Verified Buyer
                  </span>
                )}
              </div>
              <p className="text-xs text-white/70 line-clamp-1">
                {product.name}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className={`p-1.5 rounded-full transition ${
              isSubmitting
                ? 'opacity-40 cursor-not-allowed text-white/50'
                : 'text-white/80 hover:text-white hover:bg-white/10 cursor-pointer'
            }`}
            aria-label="Close review modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Star Rating Picker */}
          <div>
            <label htmlFor="review-rating-star-1" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Overall Rating *
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  id={star === 1 ? 'review-rating-star-1' : undefined}
                  type="button"
                  disabled={isFormLocked}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => !isFormLocked && setHoverRating(star)}
                  onMouseLeave={() => !isFormLocked && setHoverRating(0)}
                  className={`p-1 text-2xl transition ${isFormLocked ? 'cursor-not-allowed opacity-60' : 'hover:scale-110 cursor-pointer'}`}
                >
                  <Star
                    className={`w-7 h-7 ${
                      (hoverRating || rating) >= star
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-xs font-bold text-[#5B1425]">
                {rating === 5 && 'Outstanding Drape & Pure Weave (5/5)'}
                {rating === 4 && 'Very Good Quality (4/5)'}
                {rating === 3 && 'Average Experience (3/5)'}
                {rating === 2 && 'Needs Improvement (2/5)'}
                {rating === 1 && 'Disappointing (1/5)'}
              </span>
            </div>
          </div>

          {/* Quick Fit & Fabric Chips */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label htmlFor="review-fabric-feel" className="block font-semibold text-gray-700 mb-1">Drape Fall & Feel</label>
              <select
                id="review-fabric-feel"
                value={fabricFeel}
                disabled={isFormLocked}
                onChange={(e) => setFabricFeel(e.target.value)}
                className={`w-full p-2 bg-white rounded-lg border border-[#E8E1D5] text-xs focus:ring-1 focus:ring-[#5B1425] outline-none ${
                  isFormLocked ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''
                }`}
              >
                <option>Ultra Soft & Luxurious</option>
                <option>Sturdy & Crisp Rich Fall</option>
                <option>Whisper Light & Flowing</option>
              </select>
            </div>
            <div>
              <label htmlFor="review-zari-finish" className="block font-semibold text-gray-700 mb-1">Zari & Weave Finish</label>
              <select
                id="review-zari-finish"
                value={fitRating}
                disabled={isFormLocked}
                onChange={(e) => setFitRating(e.target.value)}
                className={`w-full p-2 bg-white rounded-lg border border-[#E8E1D5] text-xs focus:ring-1 focus:ring-[#5B1425] outline-none ${
                  isFormLocked ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''
                }`}
              >
                <option>True 100% Handcrafted Gold</option>
                <option>Subtle Elegant Sheen</option>
                <option>Antique Matte Finish</option>
              </select>
            </div>
          </div>

          {/* Review Headline */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="review-headline" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Headline / Title
              </label>
              <span className="text-[10px] text-gray-400">Max {MAX_TITLE_CHARS} chars</span>
            </div>
            <input
              id="review-headline"
              type="text"
              placeholder="e.g. Stunning Banarasi Saree, got so many compliments!"
              value={title}
              maxLength={MAX_TITLE_CHARS}
              disabled={isFormLocked}
              onChange={(e) => setTitle(e.target.value)}
              className={`w-full p-2.5 bg-white rounded-xl border border-[#E8E1D5] text-xs focus:ring-1 focus:ring-[#5B1425] outline-none ${
                isFormLocked ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''
              }`}
            />
          </div>

          {/* Review Comment */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="review-comment" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Your Drape Experience & Review *
              </label>
              <span className="text-[10px] text-gray-400">Max {MAX_COMMENT_CHARS.toLocaleString()} chars</span>
            </div>
            <textarea
              id="review-comment"
              rows={4}
              placeholder="Tell others about the fabric luster, pleat formation, softness, unboxing packaging, and how you styled it..."
              value={comment}
              maxLength={MAX_COMMENT_CHARS}
              disabled={isFormLocked}
              onChange={(e) => setComment(e.target.value)}
              required
              className={`w-full p-3 bg-white rounded-xl border border-[#E8E1D5] text-xs focus:ring-1 focus:ring-[#5B1425] outline-none leading-relaxed ${
                isFormLocked ? 'opacity-60 cursor-not-allowed bg-gray-50' : ''
              }`}
            />
          </div>

          {/* Photos Showcase */}
          <div>
            <label htmlFor="review-attach-photo" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Add Drape Photos (Optional)
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              {photos.map((photo, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#C5A059] group">
                  <img src={photo} alt={`Customer Drape Preview ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    disabled={isFormLocked}
                    onClick={() => handleRemovePhoto(idx)}
                    className={`absolute top-1 right-1 bg-red-600 text-white p-0.5 rounded-full text-[10px] ${
                      isFormLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-red-700'
                    }`}
                    aria-label={`Remove drape photo ${idx + 1}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {photos.length < 3 && (
                <label
                  htmlFor="review-attach-photo"
                  className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg border-2 border-dashed border-[#C5A059] bg-white text-gray-500 hover:text-[#5B1425] hover:bg-[#FAF0E6] transition text-[10px] ${
                    isFormLocked ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
                  }`}
                >
                  {isProcessingPhotos ? (
                    <span className="text-[9px] text-[#5B1425] font-semibold text-center px-1">Processing...</span>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 text-[#C5A059]" />
                      <span>Upload</span>
                    </>
                  )}
                </label>
              )}

              <input
                id="review-attach-photo"
                type="file"
                accept="image/png, image/jpeg, image/webp"
                multiple
                disabled={isFormLocked}
                onChange={handleFileSelect}
                className="sr-only"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition ${
                isSubmitting
                  ? 'opacity-40 cursor-not-allowed text-gray-400'
                  : 'text-gray-600 hover:text-gray-900 cursor-pointer'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isProcessingPhotos}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#5B1425] hover:bg-[#430e1b] text-white text-xs font-semibold rounded-xl transition shadow disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#C5A059]" />
              <span>
                {isSubmitting
                  ? 'Publishing...'
                  : isProcessingPhotos
                  ? 'Processing Photos...'
                  : (isVerifiedBuyer ? 'Submit Verified Review' : 'Submit Review')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
