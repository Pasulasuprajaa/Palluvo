import React, { useState } from 'react';
import { useCompare } from '../context/CompareContext';
import { useCart } from '../context/CartContext';
import { X, ArrowRight, Check, Sparkles, Scale, Trash2, ShoppingBag, Eye, Star } from 'lucide-react';

export default function CompareDrawer({ onNavigate }) {
  const { compareItems, isCompareOpen, setIsCompareOpen, removeFromCompare, clearCompare } = useCompare();
  const { addToCart } = useCart();
  const [highlightDiff, setHighlightDiff] = useState(false);

  if (compareItems.length === 0) return null;

  return (
    <>
      {/* 1. Floating Bottom Dock Bar (Amazon / Flipkart Style) */}
      {!isCompareOpen && (
        <div className="fixed bottom-6 right-6 z-40 animate-slide-up flex items-center gap-3 bg-[#1F1A1C]/95 backdrop-blur-md text-[#FAF7F2] p-2.5 pl-4 rounded-2xl shadow-2xl border border-[#C5A059]/40">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-[#C5A059]" />
            <div className="text-xs font-serif tracking-wider">
              <span className="font-bold text-[#E5D3B3]">{compareItems.length}</span> / 4 Sarees Selected
            </div>
          </div>

          <div className="flex items-center -space-x-2">
            {compareItems.map((item) => (
              <img
                key={item.id}
                src={item.primary_image || item.images?.[0] || '/images/categories/banarasi.jpg'}
                alt={item.name}
                className="w-8 h-8 rounded-full object-cover border-2 border-[#5B1425] shadow"
              />
            ))}
          </div>

          <button
            onClick={() => setIsCompareOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#C5A059] hover:bg-[#b08d48] text-[#1F1A1C] text-xs font-semibold rounded-xl transition shadow-md cursor-pointer"
          >
            <span>Compare</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={clearCompare}
            title="Clear list"
            className="p-1.5 text-gray-400 hover:text-red-400 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2. Full Side-by-Side Comparison Modal */}
      {isCompareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-sm animate-fade-in overflow-hidden">
          <div className="relative w-full max-w-6xl max-h-[90vh] bg-[#FAF7F2] rounded-2xl shadow-2xl border border-[#C5A059]/30 flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-[#5B1425] text-white border-b border-[#C5A059]/30">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/10 text-[#C5A059]">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="font-serif text-lg sm:text-xl font-bold tracking-wide text-[#E5D3B3]">
                    Side-by-Side Saree Drape Comparison
                  </h2>
                  <p className="text-xs text-white/70">
                    Comparing {compareItems.length} handcrafted authentic luxury weaves
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="hidden sm:flex items-center gap-2 text-xs text-[#FAF7F2] bg-white/10 px-3 py-1.5 rounded-full cursor-pointer hover:bg-white/20 transition">
                  <input
                    type="checkbox"
                    checked={highlightDiff}
                    onChange={(e) => setHighlightDiff(e.target.checked)}
                    className="accent-[#C5A059] cursor-pointer"
                  />
                  <span>Highlight Differences</span>
                </label>

                <button
                  onClick={clearCompare}
                  className="flex items-center gap-1 text-xs text-red-200 hover:text-white bg-red-900/40 hover:bg-red-900/80 px-3 py-1.5 rounded-full transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear All</span>
                </button>

                <button
                  onClick={() => setIsCompareOpen(false)}
                  className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Matrix Comparison Body */}
            <div className="flex-1 overflow-x-auto overflow-y-auto p-4 sm:p-6 custom-scrollbar">
              <table className="w-full border-collapse min-w-[700px]">
                <thead>
                  <tr>
                    <th className="w-48 text-left p-3 text-xs font-semibold uppercase text-gray-500 tracking-wider sticky left-0 bg-[#FAF7F2] z-10 border-b border-[#E8E1D5]">
                      Attribute
                    </th>
                    {compareItems.map((item) => (
                      <th key={item.id} className="p-3 text-center border-b border-[#E8E1D5] min-w-[200px] align-top">
                        <div className="relative group flex flex-col items-center bg-white p-3 rounded-xl border border-[#E8E1D5] shadow-xs">
                          <button
                            onClick={() => removeFromCompare(item.id)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 shadow transition"
                            title="Remove from comparison"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>

                          <img
                            src={item.primary_image || item.images?.[0] || '/images/categories/banarasi.jpg'}
                            alt={item.name}
                            className="w-28 h-36 object-cover rounded-lg mb-2 shadow-xs cursor-pointer hover:scale-105 transition"
                            onClick={() => {
                              setIsCompareOpen(false);
                              onNavigate('product', { slug: item.slug });
                            }}
                          />

                          <div className="text-xs font-serif font-bold text-[#1F1A1C] line-clamp-2 h-8 text-center">
                            {item.name}
                          </div>

                          <div className="mt-1 flex items-baseline gap-1.5">
                            <span className="text-sm font-bold text-[#5B1425]">
                              ₹{item.price?.toLocaleString('en-IN')}
                            </span>
                            {item.mrp > item.price && (
                              <span className="text-[10px] text-gray-400 line-through">
                                ₹{item.mrp?.toLocaleString('en-IN')}
                              </span>
                            )}
                          </div>

                          <button
                            onClick={() => {
                              addToCart(item, 1);
                              setIsCompareOpen(false);
                            }}
                            className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 bg-[#5B1425] hover:bg-[#430e1b] text-white text-xs font-semibold rounded-lg shadow transition cursor-pointer"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Add to Bag</span>
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody className="text-xs divide-y divide-[#E8E1D5]">
                  {/* Rating & Reviews */}
                  <tr className={highlightDiff ? 'bg-[#FAF0E6]/60' : ''}>
                    <td className="p-3 font-semibold text-gray-700 sticky left-0 bg-[#FAF7F2] z-10">
                      Rating & Reviews
                    </td>
                    {compareItems.map((item) => (
                      <td key={item.id} className="p-3 text-center">
                        <div className="inline-flex items-center gap-1 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full text-amber-900 font-semibold">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span>{item.rating || '4.8'}</span>
                          <span className="text-[10px] text-gray-500 font-normal">
                            ({item.review_count || 48})
                          </span>
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Fabric */}
                  <tr>
                    <td className="p-3 font-semibold text-gray-700 sticky left-0 bg-[#FAF7F2] z-10">
                      Fabric & Weave
                    </td>
                    {compareItems.map((item) => (
                      <td key={item.id} className="p-3 text-center font-medium text-gray-800">
                        {item.fabric || 'Pure Silk'}
                      </td>
                    ))}
                  </tr>

                  {/* Occasion */}
                  <tr className={highlightDiff ? 'bg-[#FAF0E6]/60' : ''}>
                    <td className="p-3 font-semibold text-gray-700 sticky left-0 bg-[#FAF7F2] z-10">
                      Occasion
                    </td>
                    {compareItems.map((item) => (
                      <td key={item.id} className="p-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#5B1425]/10 text-[#5B1425] font-semibold text-[11px]">
                          {item.occasion || 'Festive'}
                        </span>
                      </td>
                    ))}
                  </tr>

                  {/* Pattern / Craft Technique */}
                  <tr>
                    <td className="p-3 font-semibold text-gray-700 sticky left-0 bg-[#FAF7F2] z-10">
                      Pattern / Craft
                    </td>
                    {compareItems.map((item) => (
                      <td key={item.id} className="p-3 text-center text-gray-700">
                        {item.pattern || 'Zari Brocade'}
                      </td>
                    ))}
                  </tr>

                  {/* Saree & Blouse Dimensions */}
                  <tr className={highlightDiff ? 'bg-[#FAF0E6]/60' : ''}>
                    <td className="p-3 font-semibold text-gray-700 sticky left-0 bg-[#FAF7F2] z-10">
                      Length & Blouse
                    </td>
                    {compareItems.map((item) => (
                      <td key={item.id} className="p-3 text-center text-gray-700">
                        <div>{item.saree_length || '5.5 Meters'}</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">{item.blouse_length || '0.8M Unstitched Included'}</div>
                      </td>
                    ))}
                  </tr>

                  {/* Certification */}
                  <tr>
                    <td className="p-3 font-semibold text-gray-700 sticky left-0 bg-[#FAF7F2] z-10">
                      Silk Certification
                    </td>
                    {compareItems.map((item) => (
                      <td key={item.id} className="p-3 text-center">
                        <div className="inline-flex items-center gap-1 text-[#0D4734] font-semibold bg-emerald-50 px-2 py-0.5 rounded-md text-[11px] border border-emerald-200">
                          <Check className="w-3 h-3" />
                          <span>Silk Mark Certified</span>
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Stock Availability */}
                  <tr className={highlightDiff ? 'bg-[#FAF0E6]/60' : ''}>
                    <td className="p-3 font-semibold text-gray-700 sticky left-0 bg-[#FAF7F2] z-10">
                      Availability
                    </td>
                    {compareItems.map((item) => (
                      <td key={item.id} className="p-3 text-center">
                        {item.stock_quantity > 0 ? (
                          <span className="text-emerald-700 font-semibold">
                            In Stock ({item.stock_quantity} pieces left)
                          </span>
                        ) : (
                          <span className="text-red-600 font-semibold">Sold Out</span>
                        )}
                      </td>
                    ))}
                  </tr>

                  {/* Care Instructions */}
                  <tr>
                    <td className="p-3 font-semibold text-gray-700 sticky left-0 bg-[#FAF7F2] z-10">
                      Care & Storage
                    </td>
                    {compareItems.map((item) => (
                      <td key={item.id} className="p-3 text-center text-[11px] text-gray-600">
                        {item.care_instructions || 'Dry Clean Only. Muslin wrap storage.'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-[#E8E1D5]/40 border-t border-[#E8E1D5] flex items-center justify-between text-xs text-gray-600">
              <div className="flex items-center gap-1 text-emerald-800">
                <Sparkles className="w-4 h-4 text-[#C5A059]" />
                <span>All PALLUVO sarees come with 7-Day Hassle-Free Exchange & Luxury Gift Packaging</span>
              </div>
              <button
                onClick={() => setIsCompareOpen(false)}
                className="px-4 py-1.5 bg-[#5B1425] text-white font-medium rounded-lg hover:bg-[#430e1b] transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
