import React, { useState } from 'react';
import { X, Ruler, Sparkles, Check, Scissors, Shirt } from 'lucide-react';

export default function SizeGuideModal({ isOpen, onClose }) {
  const [unit, setUnit] = useState('inches'); // 'inches' | 'cm'

  if (!isOpen) return null;

  const blouseSizesInches = [
    { size: 'XS (32)', bust: '32 - 33', underbust: '27 - 28', waist: '26 - 27', length: '14' },
    { size: 'S (34)', bust: '34 - 35', underbust: '29 - 30', waist: '28 - 29', length: '14.5' },
    { size: 'M (36)', bust: '36 - 37', underbust: '31 - 32', waist: '30 - 31', length: '15' },
    { size: 'L (38)', bust: '38 - 39', underbust: '33 - 34', waist: '32 - 33', length: '15.5' },
    { size: 'XL (40)', bust: '40 - 41', underbust: '35 - 36', waist: '34 - 35', length: '16' },
    { size: '2XL (42)', bust: '42 - 44', underbust: '37 - 38', waist: '36 - 38', length: '16.5' }
  ];

  const blouseSizesCm = [
    { size: 'XS (32)', bust: '81 - 84', underbust: '68 - 71', waist: '66 - 69', length: '35.5' },
    { size: 'S (34)', bust: '86 - 89', underbust: '73 - 76', waist: '71 - 74', length: '36.8' },
    { size: 'M (36)', bust: '91 - 94', underbust: '78 - 81', waist: '76 - 79', length: '38.1' },
    { size: 'L (38)', bust: '96 - 99', underbust: '83 - 86', waist: '81 - 84', length: '39.4' },
    { size: 'XL (40)', bust: '101 - 104', underbust: '88 - 91', waist: '86 - 89', length: '40.6' },
    { size: '2XL (42)', bust: '106 - 112', underbust: '93 - 97', waist: '91 - 97', length: '41.9' }
  ];

  const sizes = unit === 'inches' ? blouseSizesInches : blouseSizesCm;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl bg-[#FAF7F2] rounded-2xl shadow-2xl border border-[#C5A059]/40 overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#5B1425] text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-white/10 text-[#C5A059]">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif font-bold text-lg text-[#E5D3B3]">
                Saree Dimensions & Blouse Stitching Size Guide
              </h3>
              <p className="text-xs text-white/70">
                PALLUVO precision measurements and bespoke tailoring standards
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

        {/* Unit Toggle & Saree Specs */}
        <div className="p-6 max-h-[75vh] overflow-y-auto custom-scrollbar space-y-6">
          {/* Saree Standard Dimensions Card */}
          <div className="bg-white p-4 rounded-xl border border-[#E8E1D5] shadow-xs">
            <h4 className="font-serif font-bold text-sm text-[#5B1425] flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#C5A059]" />
              <span>Saree Specifications & Draping Capacity</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="p-3 bg-[#FAF7F2] rounded-lg border border-[#E8E1D5]">
                <div className="text-gray-500 font-medium">Saree Body Length</div>
                <div className="font-bold text-gray-900 text-sm mt-0.5">5.50 Meters (6 Yards)</div>
                <div className="text-[10px] text-gray-500">Ample length for 7-9 front pleats</div>
              </div>
              <div className="p-3 bg-[#FAF7F2] rounded-lg border border-[#E8E1D5]">
                <div className="text-gray-500 font-medium">Saree Width / Height</div>
                <div className="font-bold text-gray-900 text-sm mt-0.5">44 - 46 Inches (1.14M)</div>
                <div className="text-[10px] text-gray-500">Standard luxury drape fall</div>
              </div>
              <div className="p-3 bg-[#FAF7F2] rounded-lg border border-[#E8E1D5]">
                <div className="text-gray-500 font-medium">Blouse Fabric Included</div>
                <div className="font-bold text-gray-900 text-sm mt-0.5">0.80 - 0.90 Meter</div>
                <div className="text-[10px] text-gray-500">Unstitched running fabric</div>
              </div>
            </div>
          </div>

          {/* Blouse Sizing Chart */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shirt className="w-4 h-4 text-[#5B1425]" />
                <h4 className="font-serif font-bold text-sm text-gray-900">
                  Ready-to-Wear Blouse Sizing Chart
                </h4>
              </div>

              {/* Toggle unit */}
              <div className="flex items-center bg-[#E8E1D5] p-1 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setUnit('inches')}
                  className={`px-3 py-1 rounded-md transition ${
                    unit === 'inches' ? 'bg-white text-[#5B1425] shadow-xs' : 'text-gray-600'
                  }`}
                >
                  Inches
                </button>
                <button
                  onClick={() => setUnit('cm')}
                  className={`px-3 py-1 rounded-md transition ${
                    unit === 'cm' ? 'bg-white text-[#5B1425] shadow-xs' : 'text-gray-600'
                  }`}
                >
                  CM
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-[#E8E1D5] bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] text-gray-700 border-b border-[#E8E1D5] uppercase font-semibold">
                  <tr>
                    <th className="p-3">Standard Size</th>
                    <th className="p-3">Bust ({unit})</th>
                    <th className="p-3">Underbust ({unit})</th>
                    <th className="p-3">Waist ({unit})</th>
                    <th className="p-3 text-right">Blouse Length ({unit})</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E1D5]">
                  {sizes.map((row, idx) => (
                    <tr key={idx} className="hover:bg-[#FAF7F2]/60 transition">
                      <td className="p-3 font-bold text-[#5B1425]">{row.size}</td>
                      <td className="p-3 text-gray-800 font-medium">{row.bust}</td>
                      <td className="p-3 text-gray-700">{row.underbust}</td>
                      <td className="p-3 text-gray-700">{row.waist}</td>
                      <td className="p-3 text-right font-medium text-gray-900">{row.length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* How to measure tips */}
          <div className="p-4 rounded-xl bg-[#FAF0E6]/50 border border-[#C5A059]/30 text-xs text-gray-700 space-y-2">
            <h5 className="font-bold text-[#5B1425] flex items-center gap-1.5">
              <Scissors className="w-3.5 h-3.5" />
              <span>How to Measure for Perfect Blouse Fit</span>
            </h5>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              <li><strong>Bust:</strong> Measure around the fullest part of your chest with a comfortable tape.</li>
              <li><strong>Underbust:</strong> Measure directly below the bust line where the band sits.</li>
              <li><strong>Blouse Length:</strong> Measured from highest point of shoulder to lower waist edge.</li>
              <li>All PALLUVO stitched blouses feature 2 inches of interior margin on both sides for effortless alteration.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#E8E1D5]/40 border-t border-[#E8E1D5] flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#5B1425] text-white text-xs font-semibold rounded-xl hover:bg-[#430e1b] transition shadow"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}
