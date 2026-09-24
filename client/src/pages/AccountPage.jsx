import React, { useState, useEffect } from 'react';
import { User, Package, MapPin, Heart, Shield, LogOut, Truck, Edit3, Trash2, Plus, Sparkles, Check, FileText, RotateCcw, Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import InvoiceModal from '../components/InvoiceModal';
import ReturnModal from '../components/ReturnModal';

export default function AccountPage({ onNavigate }) {
  const { user, token, logout, updateProfile, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('orders'); // 'orders', 'profile', 'addresses'
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals for Amazon & Flipkart features
  const [selectedInvoiceOrder, setSelectedInvoiceOrder] = useState(null);
  const [selectedReturnOrder, setSelectedReturnOrder] = useState(null);

  // Profile edit
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [editingProfile, setEditingProfile] = useState(false);

  // Address create modal
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressForm, setAddressForm] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    pincode: '',
    house_flat: '',
    area: '',
    city: '',
    state: '',
    landmark: '',
    address_type: 'home'
  });

  useEffect(() => {
    if (token) {
      fetchAccountData();
    }
  }, [token]);

  const fetchAccountData = async () => {
    try {
      setLoading(true);
      const [orderRes, addrRes] = await Promise.all([
        fetch('/api/orders', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/addresses', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      const orderData = await orderRes.json();
      const addrData = await addrRes.json();

      if (orderData.orders) setOrders(orderData.orders);
      if (addrData.addresses) setAddresses(addrData.addresses);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    const res = await updateProfile(profileName, profilePhone);
    if (res.success) {
      setEditingProfile(false);
    }
  };

  const handleSaveAddress = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(addressForm)
      });
      const data = await res.json();
      if (res.ok) {
        showToast('Address added successfully.', 'success');
        setShowAddressModal(false);
        fetchAccountData();
      } else {
        showToast(data.error || 'Failed to save address.', 'error');
      }
    } catch (err) {
      showToast('Failed to save address.', 'error');
    }
  };

  const handleDeleteAddress = async (id) => {
    if (!confirm('Are you sure you want to delete this address?')) return;
    try {
      const res = await fetch(`/api/addresses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        showToast('Address deleted.', 'info');
        fetchAccountData();
      }
    } catch (err) {
      showToast('Failed to delete address.', 'error');
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    try {
      const res = await fetch(`/api/orders/cancel/${orderId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || 'Order cancelled successfully.', 'success');
        fetchAccountData();
      } else {
        showToast(data.error || 'Failed to cancel order.', 'error');
      }
    } catch (err) {
      showToast('Failed to cancel order.', 'error');
    }
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 bg-white rounded-2xl border border-[#EAE2D7] text-center space-y-4 shadow-sm">
        <h2 className="font-serif text-2xl font-bold text-[#5B1425]">Please Sign In</h2>
        <p className="text-xs text-gray-500">Sign in to access your orders, profile, and saved addresses.</p>
        <button
          onClick={() => onNavigate('home')}
          className="px-6 py-2.5 bg-[#5B1425] text-white rounded-xl text-xs font-bold uppercase transition hover:bg-[#430e1b]"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in">
      {/* Header Banner */}
      <div className="bg-[#5B1425] text-[#FAF7F2] p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#C5A059]/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-serif text-2xl sm:text-3xl font-bold text-[#E5D3B3]">
              Namaste, {user.name}
            </span>
            <span className="text-[#C5A059] text-xl">✦</span>
          </div>
          <p className="text-xs text-white/80 mt-1">
            {user.email} {user.phone ? `• ${user.phone}` : ''}
          </p>
        </div>

        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={() => onNavigate('admin')}
              className="px-4 py-2 bg-[#C5A059] text-[#1F1A1C] rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#E0C07F] transition shadow-md cursor-pointer"
            >
              Admin Dashboard ⚙️
            </button>
          )}
          <button
            onClick={logout}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Navigation Tabs + Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Navigation Tabs (3 Cols) */}
        <div className="lg:col-span-3 space-y-2 bg-white p-3 rounded-2xl border border-[#EAE2D7] shadow-sm">
          <button
            onClick={() => setActiveTab('orders')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-between cursor-pointer ${
              activeTab === 'orders' ? 'bg-[#5B1425] text-white shadow-sm' : 'text-[#1F1A1C] hover:bg-[#FAF7F2]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Package className="w-4 h-4" />
              <span>My Orders ({orders.length})</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-between cursor-pointer ${
              activeTab === 'profile' ? 'bg-[#5B1425] text-white shadow-sm' : 'text-[#1F1A1C] hover:bg-[#FAF7F2]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4" />
              <span>Profile Details</span>
            </div>
          </button>

          <button
            onClick={() => setActiveTab('addresses')}
            className={`w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-between cursor-pointer ${
              activeTab === 'addresses' ? 'bg-[#5B1425] text-white shadow-sm' : 'text-[#1F1A1C] hover:bg-[#FAF7F2]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4" />
              <span>Saved Addresses ({addresses.length})</span>
            </div>
          </button>

          <button
            onClick={() => onNavigate('wishlist')}
            className="w-full text-left px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-[#1F1A1C] hover:bg-[#FAF7F2] transition flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Heart className="w-4 h-4 text-[#5B1425]" />
              <span>My Wishlist</span>
            </div>
          </button>
        </div>

        {/* Content Area (9 Cols) */}
        <div className="lg:col-span-9">
          {/* TAB 1: ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-xl font-bold text-[#1F1A1C]">
                  Your Order History
                </h3>
                <span className="text-xs text-gray-500">
                  Total Orders: <strong>{orders.length}</strong>
                </span>
              </div>

              {orders.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#EAE2D7] p-12 text-center space-y-3">
                  <Package className="w-12 h-12 text-[#6E6467] mx-auto opacity-40" />
                  <div className="font-serif text-base font-bold text-[#1F1A1C]">No orders placed yet</div>
                  <p className="text-xs text-[#6E6467]">Browse our luxury handwoven sarees to make your first purchase.</p>
                  <button
                    onClick={() => onNavigate('shop')}
                    className="px-6 py-2.5 bg-[#5B1425] text-white rounded-xl text-xs font-bold uppercase hover:bg-[#430e1b] transition"
                  >
                    Explore Sarees
                  </button>
                </div>
              ) : (
                orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-[#EAE2D7] p-5 sm:p-6 shadow-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F4EFEB] pb-3 text-xs">
                      <div>
                        <span className="font-bold text-[#1F1A1C]">Order #{order.order_number}</span>
                        <span className="text-gray-500 ml-2">Placed on {order.created_at?.split(' ')[0]}</span>
                        {order.return_status && (
                          <span className="ml-2 bg-amber-100 text-amber-900 px-2 py-0.5 rounded text-[10px] font-bold">
                            {order.return_status}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                          order.status === 'Delivered'
                            ? 'bg-green-100 text-green-800'
                            : (order.status === 'Cancelled' ? 'bg-red-100 text-red-800' : 'bg-[#5B1425]/10 text-[#5B1425]')
                        }`}>
                          ● {order.status}
                        </span>
                        <span className="font-bold text-[#5B1425] font-mono text-sm">
                          ₹{order.total_amount?.toLocaleString('en-IN')}
                        </span>
                      </div>
                    </div>

                    {/* Order Items */}
                    <div className="divide-y divide-[#F4EFEB]">
                      {order.items && order.items.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-4 py-2.5">
                          <img
                            src={item.image_url || '/images/categories/banarasi.jpg'}
                            alt={item.product_name}
                            className="w-12 h-16 object-cover rounded-lg shadow-xs"
                          />
                          <div className="flex-1 text-xs">
                            <h4 className="font-semibold text-[#1F1A1C] line-clamp-1">{item.product_name}</h4>
                            <div className="text-gray-500">Qty: {item.quantity} {item.variant_name ? `• Color: ${item.variant_name}` : ''}</div>
                          </div>
                          <div className="text-xs font-bold text-[#1F1A1C] font-mono">
                            ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Actions Toolbar (Flipkart & Amazon Order Management) */}
                    <div className="pt-3 border-t border-[#F4EFEB] flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Track Button */}
                        <button
                          onClick={() => onNavigate('track-order', { trackingId: order.order_number })}
                          className="px-3.5 py-2 bg-[#FAF7F2] border border-[#5B1425] text-[#5B1425] rounded-xl font-bold uppercase tracking-wider hover:bg-[#5B1425] hover:text-white transition flex items-center gap-1.5 cursor-pointer text-[11px]"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Track Delivery</span>
                        </button>

                        {/* Tax Invoice Download Button (Amazon / Flipkart feature) */}
                        <button
                          onClick={() => setSelectedInvoiceOrder(order)}
                          className="px-3.5 py-2 bg-white border border-gray-300 text-gray-700 hover:border-[#5B1425] hover:text-[#5B1425] rounded-xl font-semibold transition flex items-center gap-1.5 cursor-pointer text-[11px]"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Download Tax Invoice</span>
                        </button>

                        {/* 7-Day Return / Exchange Request Button (Amazon / Flipkart feature) */}
                        {order.status !== 'Cancelled' && (
                          <button
                            onClick={() => setSelectedReturnOrder(order)}
                            className="px-3.5 py-2 bg-white border border-gray-300 text-gray-700 hover:border-[#C5A059] hover:text-[#5B1425] rounded-xl font-semibold transition flex items-center gap-1.5 cursor-pointer text-[11px]"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Return / Exchange</span>
                          </button>
                        )}
                      </div>

                      {/* Cancel Order Action */}
                      {(order.status === 'Placed' || order.status === 'Processing') && (
                        <button
                          onClick={() => handleCancelOrder(order.id)}
                          className="text-xs text-red-600 font-bold hover:underline cursor-pointer"
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: PROFILE */}
          {activeTab === 'profile' && (
            <div className="bg-white rounded-2xl border border-[#EAE2D7] p-6 shadow-sm space-y-6">
              <h3 className="font-serif text-xl font-bold text-[#1F1A1C]">
                Personal Profile Details
              </h3>

              <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-lg">
                <div>
                  <label className="block text-xs font-semibold text-[#1F1A1C] mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full bg-[#FAF7F2] border border-[#EAE2D7] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#5B1425]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F1A1C] mb-1">Email Address</label>
                  <input
                    type="email"
                    disabled
                    value={user.email}
                    className="w-full bg-gray-100 border border-[#EAE2D7] rounded-xl px-3 py-2 text-xs text-gray-500 cursor-not-allowed"
                  />
                  <span className="text-[10px] text-[#6E6467]">Email address cannot be changed.</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F1A1C] mb-1">Mobile Contact</label>
                  <input
                    type="tel"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full bg-[#FAF7F2] border border-[#EAE2D7] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#5B1425]"
                  />
                </div>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#5B1425] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#7E1E34] transition"
                >
                  Save Profile Changes
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: ADDRESSES */}
          {activeTab === 'addresses' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-serif text-xl font-bold text-[#1F1A1C]">
                  Saved Delivery Addresses
                </h3>
                <button
                  onClick={() => setShowAddressModal(true)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#5B1425] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#430e1b] transition shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Address</span>
                </button>
              </div>

              {addresses.length === 0 ? (
                <div className="bg-white rounded-2xl border border-[#EAE2D7] p-8 text-center text-xs text-gray-500">
                  No saved addresses found. Click "Add New Address" above.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className="bg-white p-5 rounded-2xl border border-[#EAE2D7] shadow-xs space-y-3 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-[#1F1A1C]">{addr.name}</span>
                        <span className="px-2 py-0.5 bg-[#FAF7F2] border border-[#E8E1D5] rounded text-[10px] uppercase font-semibold text-gray-600">
                          {addr.address_type}
                        </span>
                      </div>

                      <div className="text-xs text-gray-600 space-y-0.5">
                        <p>{addr.house_flat}, {addr.area}</p>
                        <p>{addr.city}, {addr.state} - <strong>{addr.pincode}</strong></p>
                        {addr.landmark && <p className="text-gray-500">Landmark: {addr.landmark}</p>}
                        <p className="font-semibold text-gray-800 pt-1">Phone: {addr.phone}</p>
                      </div>

                      <div className="pt-2 border-t border-gray-100 flex justify-end">
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Address Create Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#FAF7F2] w-full max-w-lg rounded-2xl p-6 border border-[#EAE2D7] shadow-2xl space-y-4">
            <h3 className="font-serif font-bold text-lg text-[#1F1A1C]">
              Add New Delivery Address
            </h3>
            <form onSubmit={handleSaveAddress} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">Recipient Name *</label>
                  <input
                    type="text"
                    required
                    value={addressForm.name}
                    onChange={(e) => setAddressForm({ ...addressForm, name: e.target.value })}
                    className="w-full bg-white border border-[#E8E1D5] rounded-xl p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    value={addressForm.phone}
                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                    className="w-full bg-white border border-[#E8E1D5] rounded-xl p-2.5 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">House / Flat / Building *</label>
                <input
                  type="text"
                  required
                  value={addressForm.house_flat}
                  onChange={(e) => setAddressForm({ ...addressForm, house_flat: e.target.value })}
                  className="w-full bg-white border border-[#E8E1D5] rounded-xl p-2.5 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Street / Area / Colony *</label>
                <input
                  type="text"
                  required
                  value={addressForm.area}
                  onChange={(e) => setAddressForm({ ...addressForm, area: e.target.value })}
                  className="w-full bg-white border border-[#E8E1D5] rounded-xl p-2.5 outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold mb-1">PIN Code *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={addressForm.pincode}
                    onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                    className="w-full bg-white border border-[#E8E1D5] rounded-xl p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                    className="w-full bg-white border border-[#E8E1D5] rounded-xl p-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={addressForm.state}
                    onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                    className="w-full bg-white border border-[#E8E1D5] rounded-xl p-2.5 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#5B1425] text-white rounded-xl text-xs font-semibold hover:bg-[#430e1b]"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tax Invoice Modal */}
      <InvoiceModal
        isOpen={Boolean(selectedInvoiceOrder)}
        onClose={() => setSelectedInvoiceOrder(null)}
        order={selectedInvoiceOrder}
      />

      {/* Return / Exchange Modal */}
      <ReturnModal
        isOpen={Boolean(selectedReturnOrder)}
        onClose={() => setSelectedReturnOrder(null)}
        order={selectedReturnOrder}
        onReturnSuccess={() => fetchAccountData()}
      />
    </div>
  );
}
