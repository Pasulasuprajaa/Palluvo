import React from 'react';
import { X, Printer, Download, Sparkles, ShieldCheck } from 'lucide-react';

export default function InvoiceModal({ isOpen, onClose, order }) {
  if (!isOpen || !order) return null;

  const handlePrint = () => {
    window.print();
  };

  const address = order.address || {};

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-6">
        {/* Controls Header (Hidden in Print) */}
        <div className="print:hidden flex items-center justify-between px-6 py-4 bg-[#5B1425] text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#C5A059]" />
            <h3 className="font-serif font-bold text-base text-[#E5D3B3]">
              PALLUVO Official Tax Invoice & Authenticity Certificate
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C5A059] hover:bg-[#b08d48] text-[#1F1A1C] text-xs font-bold rounded-lg transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Download PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Invoice Sheet */}
        <div className="p-8 text-gray-800 text-xs space-y-6 print:p-0 print:m-0" id="tax-invoice-printable">
          {/* Header Brand */}
          <div className="flex justify-between items-start border-b border-gray-200 pb-6">
            <div>
              <div className="font-serif text-2xl font-bold tracking-widest text-[#5B1425]">
                PALLUVO
              </div>
              <div className="text-[11px] text-[#C5A059] italic font-serif">
                Every drape, a little magic.
              </div>
              <div className="text-gray-500 mt-2 space-y-0.5">
                <div>PALLUVO Luxury Fashion Pvt Ltd</div>
                <div>Silk Mark Certified Brand | GSTIN: 29AABCU9603R1ZM</div>
                <div>Lavelle Road, Shanthala Nagar, Bengaluru, Karnataka 560001</div>
                <div>Email: concierge@palluvo.com | Support: +91 80 2233 4455</div>
              </div>
            </div>

            <div className="text-right space-y-1">
              <div className="text-lg font-bold uppercase text-gray-900">
                TAX INVOICE
              </div>
              <div><strong>Invoice No:</strong> INV-{order.order_number || order.id}</div>
              <div><strong>Order Date:</strong> {new Date(order.created_at || Date.now()).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
              <div><strong>Payment Status:</strong> <span className="text-emerald-700 font-bold">{order.payment_status || 'Paid'} ({order.payment_method || 'Razorpay'})</span></div>
              <div><strong>AWB / Tracking:</strong> {order.tracking_number || 'BLR-BD-889921'}</div>
            </div>
          </div>

          {/* Billing & Shipping Address */}
          <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
            <div>
              <div className="font-bold uppercase text-gray-700 mb-1">
                Billed To & Shipped To:
              </div>
              <div className="font-bold text-gray-900">{address.name || 'Priya Sharma'}</div>
              <div className="text-gray-600">{address.house_flat || 'Royal Palms Residency'}, {address.area || 'Lavelle Road'}</div>
              <div className="text-gray-600">{address.city || 'Bengaluru'}, {address.state || 'Karnataka'} - {address.pincode || '560001'}</div>
              <div className="text-gray-600">Phone: {address.phone || '+91 98123 45678'}</div>
            </div>

            <div>
              <div className="font-bold uppercase text-gray-700 mb-1">
                Courier & Logistics Details:
              </div>
              <div><strong>Partner:</strong> {order.courier_partner || 'BlueDart Luxury Express'}</div>
              <div><strong>Handled By:</strong> PALLUVO Bengaluru Master Vault</div>
              <div><strong>Delivery Type:</strong> Insured Tamper-Evident Luxury Packaging</div>
              <div><strong>Silk Mark Tag:</strong> Org. of India Registered & Verified</div>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full text-left">
              <thead className="bg-[#FAF7F2] text-gray-700 uppercase font-semibold text-[11px] border-b border-gray-200">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Item Description</th>
                  <th className="p-3">HSN Code</th>
                  <th className="p-3 text-center">Qty</th>
                  <th className="p-3 text-right">Unit Price</th>
                  <th className="p-3 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {(order.items && order.items.length > 0 ? order.items : [
                  {
                    product_name: 'Royal Crimson Banarasi Katan Silk Saree',
                    variant_name: 'Royal Crimson Wine',
                    quantity: 1,
                    price: order.total_amount || 12999
                  }
                ]).map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-3 text-gray-500">{idx + 1}</td>
                    <td className="p-3 font-medium text-gray-900">
                      <div>{item.product_name}</div>
                      {item.variant_name && (
                        <div className="text-[10px] text-gray-500">Color/Variant: {item.variant_name}</div>
                      )}
                    </td>
                    <td className="p-3 text-gray-500 font-mono">5007.20 (Pure Silk)</td>
                    <td className="p-3 text-center font-bold">{item.quantity || 1}</td>
                    <td className="p-3 text-right font-mono">₹{item.price?.toLocaleString('en-IN')}</td>
                    <td className="p-3 text-right font-bold font-mono">
                      ₹{((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Breakdown */}
          <div className="flex justify-between items-start pt-2">
            <div className="max-w-xs space-y-1 text-gray-500 text-[11px]">
              <div className="flex items-center gap-1 text-emerald-800 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Certified Pure Silk & Handcrafted Guarantee</span>
              </div>
              <p>This is a computer-generated invoice and requires no physical signature under Indian Information Technology Act, 2000.</p>
            </div>

            <div className="w-64 space-y-1.5 bg-gray-50 p-4 rounded-xl border border-gray-200 text-right">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span className="font-mono">₹{order.subtotal?.toLocaleString('en-IN') || order.total_amount?.toLocaleString('en-IN')}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Promo Discount ({order.coupon_code || 'APPLIED'}):</span>
                  <span className="font-mono">-₹{order.discount_amount?.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-600">
                <span>Shipping & Insurance:</span>
                <span className="font-mono font-medium text-emerald-700">
                  {order.delivery_fee > 0 ? `₹${order.delivery_fee}` : 'FREE (Complimentary)'}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>GST (5% Integrated):</span>
                <span className="font-mono">Included in Price</span>
              </div>
              <div className="border-t border-gray-300 pt-2 flex justify-between font-bold text-sm text-[#5B1425]">
                <span>Total Paid:</span>
                <span className="font-mono">₹{order.total_amount?.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
