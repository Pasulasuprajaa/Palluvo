import React, { useState } from 'react';
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

  if (!isOpen || !product) return null;

  const handleAddSamplePhoto = (sampleUrl) => {
    if (photos.length >= 3) {
      showToast('Maximum 3 photos allowed.', 'info');
      return;
    }
    setPhotos(prev => [...prev, sampleUrl]);
  };

  const handleRemovePhoto = (idx) => {
    setPhotos(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!comment.trim()) {
      showToast('Please share your drape experience in the review comment.', 'error');
      return;
    }

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
          comment: comment.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit review');

      showToast('✨ Thank you! Your review has been published with Verified Drape badge.', 'success');
      if (onReviewSubmitted) onReviewSubmitted();
      onClose();
    } catch (err) {
      showToast(err.message || 'Failed to submit review.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

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
              <h3 className="font-serif font-bold text-lg text-[#E5D3B3]">
                Write a Verified Review
              </h3>
              <p className="text-xs text-white/70 line-clamp-1">
                {product.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Star Rating Picker */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Overall Rating *
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-1 text-2xl transition hover:scale-110 cursor-pointer"
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
              <label className="block font-semibold text-gray-700 mb-1">Drape Fall & Feel</label>
              <select
                value={fabricFeel}
                onChange={(e) => setFabricFeel(e.target.value)}
                className="w-full p-2 bg-white rounded-lg border border-[#E8E1D5] text-xs focus:ring-1 focus:ring-[#5B1425] outline-none"
              >
                <option>Ultra Soft & Luxurious</option>
                <option>Sturdy & Crisp Rich Fall</option>
                <option>Whisper Light & Flowing</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-gray-700 mb-1">Zari & Weave Finish</label>
              <select
                value={fitRating}
                onChange={(e) => setFitRating(e.target.value)}
                className="w-full p-2 bg-white rounded-lg border border-[#E8E1D5] text-xs focus:ring-1 focus:ring-[#5B1425] outline-none"
              >
                <option>True 100% Handcrafted Gold</option>
                <option>Subtle Elegant Sheen</option>
                <option>Antique Matte Finish</option>
              </select>
            </div>
          </div>

          {/* Review Headline */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Headline / Title
            </label>
            <input
              type="text"
              placeholder="e.g. Stunning Banarasi Saree, got so many compliments!"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 bg-white rounded-xl border border-[#E8E1D5] text-xs focus:ring-1 focus:ring-[#5B1425] outline-none"
            />
          </div>

          {/* Review Comment */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Your Drape Experience & Review *
            </label>
            <textarea
              rows={4}
              placeholder="Tell others about the fabric luster, pleat formation, softness, unboxing packaging, and how you styled it..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              className="w-full p-3 bg-white rounded-xl border border-[#E8E1D5] text-xs focus:ring-1 focus:ring-[#5B1425] outline-none leading-relaxed"
            />
          </div>

          {/* Photos Showcase */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Add Drape Photos (Optional)
            </label>
            <div className="flex flex-wrap gap-2 items-center">
              {photos.map((photo, idx) => (
                <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-[#C5A059] group">
                  <img src={photo} alt="review" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(idx)}
                    className="absolute top-1 right-1 bg-red-600 text-white p-0.5 rounded-full text-[10px]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {photos.length < 3 && (
                <button
                  type="button"
                  onClick={() => handleAddSamplePhoto(product.primary_image || '/images/categories/banarasi.jpg')}
                  className="flex flex-col items-center justify-center w-16 h-16 rounded-lg border-2 border-dashed border-[#C5A059] bg-white text-gray-500 hover:text-[#5B1425] hover:bg-[#FAF0E6] transition cursor-pointer text-[10px]"
                >
                  <Upload className="w-4 h-4 text-[#C5A059]" />
                  <span>Attach</span>
                </button>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-900 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#5B1425] hover:bg-[#430e1b] text-white text-xs font-semibold rounded-xl transition shadow disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#C5A059]" />
              <span>{isSubmitting ? 'Publishing...' : 'Submit Verified Review'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
