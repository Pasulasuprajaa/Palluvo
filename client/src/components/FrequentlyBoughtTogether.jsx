import React, { useState } from 'react';
import { Plus, Check, ShoppingBag, Sparkles, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';

export default function FrequentlyBoughtTogether({ product, onNavigate }) {
  const { addToCart } = useCart();
  const { showToast } = useToast();

  const [includeSaree, setIncludeSaree] = useState(true);
  const [includeJewellery, setIncludeJewellery] = useState(true);
  const [includePetticoat, setIncludePetticoat] = useState(true);

  if (!product) return null;

  const jewelleryItem = {
    id: 9901,
    name: 'Royal Heritage Kundan & Pearl Choker Set',
    price: 1899,
    mrp: 3499,
    image: '/images/occasions/wedding_edit.jpg',
    category: 'Jewellery'
  };

  const petticoatItem = {
    id: 9902,
    name: 'Pure Shimmer Satin Saree Shapewear Petticoat',
    price: 799,
    mrp: 1499,
    image: '/images/categories/silk.jpg',
    category: 'Shapewear'
  };

  const items = [
    { ...product, selected: includeSaree, setSelected: setIncludeSaree, isMain: true },
    { ...jewelleryItem, selected: includeJewellery, setSelected: setIncludeJewellery },
    { ...petticoatItem, selected: includePetticoat, setSelected: setIncludePetticoat }
  ];

  const selectedItems = items.filter(i => i.selected);
  const totalPrice = selectedItems.reduce((sum, item) => sum + (item.price || 0), 0);
  const totalMrp = selectedItems.reduce((sum, item) => sum + (item.mrp || item.price || 0), 0);
  const bundleDiscount = selectedItems.length >= 2 ? Math.round(totalPrice * 0.1) : 0;
  const finalPrice = Math.max(0, totalPrice - bundleDiscount);

  const handleAddBundleToCart = () => {
    if (selectedItems.length === 0) {
      showToast('Please select at least 1 item in the bundle.', 'warning');
      return;
    }

    selectedItems.forEach(item => {
      addToCart(item, 1);
    });

    showToast(`✨ Added all ${selectedItems.length} items to your shopping bag!`, 'success');
  };

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#C5A059]/30 shadow-sm space-y-6">
      <div className="flex items-center gap-2.5 border-b border-[#E8E1D5] pb-4">
        <div className="p-2 rounded-lg bg-[#5B1425]/10 text-[#5B1425]">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-serif font-bold text-lg sm:text-xl text-[#1F1A1C]">
            Frequently Bought Together (Complete the Royal Look)
          </h3>
          <p className="text-xs text-gray-500">
            Curated stylist combo with an extra 10% instant bundle discount
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8">
        {/* Items visual combo row */}
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 sm:gap-4 flex-1">
          {/* Main Saree */}
          <div className="flex flex-col items-center text-center w-28 sm:w-32">
            <div className={`relative rounded-xl overflow-hidden border-2 transition ${
              includeSaree ? 'border-[#5B1425] shadow-md' : 'border-gray-200 opacity-60'
            }`}>
              <img
                src={product.primary_image || product.images?.[0] || '/images/categories/banarasi.jpg'}
                alt={product.name}
                className="w-28 h-36 object-cover"
              />
              <div className="absolute top-1.5 left-1.5 bg-[#5B1425] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                This Item
              </div>
            </div>
            <div className="mt-2 text-xs font-serif font-semibold text-gray-900 line-clamp-1">
              {product.name}
            </div>
            <div className="text-xs font-bold text-[#5B1425] font-mono">
              ₹{product.price?.toLocaleString('en-IN')}
            </div>
          </div>

          <Plus className="w-5 h-5 text-gray-400 shrink-0" />

          {/* Jewellery */}
          <div className="flex flex-col items-center text-center w-28 sm:w-32">
            <div className={`relative rounded-xl overflow-hidden border-2 transition ${
              includeJewellery ? 'border-[#5B1425] shadow-md' : 'border-gray-200 opacity-60'
            }`}>
              <img
                src={jewelleryItem.image}
                alt={jewelleryItem.name}
                className="w-28 h-36 object-cover"
              />
              <div className="absolute top-1.5 left-1.5 bg-[#C5A059] text-[#1F1A1C] text-[9px] font-bold px-1.5 py-0.5 rounded">
                Jewellery
              </div>
            </div>
            <div className="mt-2 text-xs font-serif font-semibold text-gray-900 line-clamp-1">
              {jewelleryItem.name}
            </div>
            <div className="text-xs font-bold text-[#5B1425] font-mono">
              ₹{jewelleryItem.price?.toLocaleString('en-IN')}
            </div>
          </div>

          <Plus className="w-5 h-5 text-gray-400 shrink-0" />

          {/* Petticoat / Shapewear */}
          <div className="flex flex-col items-center text-center w-28 sm:w-32">
            <div className={`relative rounded-xl overflow-hidden border-2 transition ${
              includePetticoat ? 'border-[#5B1425] shadow-md' : 'border-gray-200 opacity-60'
            }`}>
              <img
                src={petticoatItem.image}
                alt={petticoatItem.name}
                className="w-28 h-36 object-cover"
              />
              <div className="absolute top-1.5 left-1.5 bg-gray-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                Shapewear
              </div>
            </div>
            <div className="mt-2 text-xs font-serif font-semibold text-gray-900 line-clamp-1">
              {petticoatItem.name}
            </div>
            <div className="text-xs font-bold text-[#5B1425] font-mono">
              ₹{petticoatItem.price?.toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* Checkbox and Total Price CTA */}
        <div className="w-full lg:w-72 bg-[#FAF7F2] p-4 sm:p-5 rounded-xl border border-[#E8E1D5] space-y-3 shrink-0">
          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeSaree}
                onChange={(e) => setIncludeSaree(e.target.checked)}
                className="accent-[#5B1425] w-4 h-4 rounded"
              />
              <span className="text-gray-800 line-clamp-1"><strong>This Saree:</strong> ₹{product.price?.toLocaleString('en-IN')}</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeJewellery}
                onChange={(e) => setIncludeJewellery(e.target.checked)}
                className="accent-[#5B1425] w-4 h-4 rounded"
              />
              <span className="text-gray-800 line-clamp-1"><strong>Kundan Set:</strong> ₹{jewelleryItem.price?.toLocaleString('en-IN')}</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includePetticoat}
                onChange={(e) => setIncludePetticoat(e.target.checked)}
                className="accent-[#5B1425] w-4 h-4 rounded"
              />
              <span className="text-gray-800 line-clamp-1"><strong>Satin Petticoat:</strong> ₹{petticoatItem.price?.toLocaleString('en-IN')}</span>
            </label>
          </div>

          <div className="border-t border-[#E8E1D5] pt-3">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-gray-600">Bundle Price ({selectedItems.length} items):</span>
              <div className="text-right">
                <span className="text-base font-bold text-[#5B1425] font-mono">
                  ₹{finalPrice.toLocaleString('en-IN')}
                </span>
                {totalMrp > finalPrice && (
                  <div className="text-[10px] text-gray-400 line-through">
                    ₹{totalMrp.toLocaleString('en-IN')}
                  </div>
                )}
              </div>
            </div>

            {bundleDiscount > 0 && (
              <div className="text-[11px] text-emerald-700 font-semibold mt-1">
                Extra Combo Savings: -₹{bundleDiscount.toLocaleString('en-IN')}
              </div>
            )}

            <button
              onClick={handleAddBundleToCart}
              disabled={selectedItems.length === 0}
              className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 bg-[#5B1425] hover:bg-[#430e1b] text-white text-xs font-bold rounded-xl transition shadow disabled:opacity-50 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Add Selected ({selectedItems.length}) to Bag</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
