import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard, Package, ShoppingBag, Users, Tag, AlertTriangle,
  Plus, Edit2, Trash2, CheckCircle2, TrendingUp, DollarSign, X, Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function AdminPage({ onNavigate }) {
  const { user, token, isAdmin } = useAuth();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState('analytics'); // 'analytics', 'products', 'orders', 'inventory', 'coupons', 'customers'
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Product Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productForm, setProductForm] = useState({
    name: '',
    tagline: '',
    category_id: 1,
    fabric: 'Pure Katan Silk',
    occasion: 'Wedding',
    pattern: 'Zari Weave',
    price: 9999,
    mrp: 14999,
    stock_quantity: 20,
    color_name: 'Wine Red',
    color_hex: '#5B1425',
    description: '',
    images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80']
  });

  // Coupon Modal State
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [couponForm, setCouponForm] = useState({
    code: '',
    title: '',
    description: '',
    discount_percent: 15,
    max_discount_amount: 2500,
    min_order_amount: 2999
  });

  // Order Status Update State
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [orderStatusForm, setOrderStatusForm] = useState({ status: 'Shipped', tracking_number: '', courier_partner: 'BlueDart Luxury Express', estimated_delivery: '' });

  useEffect(() => {
    if (isAdmin && token) {
      loadAdminData();
    }
  }, [isAdmin, token, activeTab]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'analytics') {
        const res = await fetch('/api/admin/stats', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok) setStats(data);
      } else if (activeTab === 'products') {
        const res = await fetch('/api/admin/products', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok) setProducts(data.products);
      } else if (activeTab === 'orders') {
        const res = await fetch('/api/admin/orders', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok) setOrders(data.orders);
      } else if (activeTab === 'inventory') {
        const res = await fetch('/api/admin/inventory', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok) setInventory(data.inventory);
      } else if (activeTab === 'coupons') {
        const res = await fetch('/api/admin/coupons', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok) setCoupons(data.coupons);
      } else if (activeTab === 'customers') {
        const res = await fetch('/api/admin/customers', { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok) setCustomers(data.customers);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const url = editingProductId ? `/api/admin/products/${editingProductId}` : '/api/admin/products';
      const method = editingProductId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(productForm)
      });

      const data = await res.json();
      if (res.ok) {
        addToast(data.message || 'Product saved successfully.');
        setShowProductModal(false);
        setEditingProductId(null);
        loadAdminData();
      } else {
        addToast(data.error, 'error');
      }
    } catch (err) {
      addToast('Failed to save product.', 'error');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this saree?')) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        addToast('Product removed.');
        loadAdminData();
      }
    } catch (err) {
      addToast('Failed to delete.', 'error');
    }
  };

  const handleUpdateOrderStatus = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/orders/${updatingOrderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderStatusForm)
      });
      const data = await res.json();
      if (res.ok) {
        addToast(data.message || 'Order status updated.');
        setUpdatingOrderId(null);
        loadAdminData();
      } else {
        addToast(data.error, 'error');
      }
    } catch (err) {
      addToast('Failed to update status.', 'error');
    }
  };

  const handleSaveCoupon = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(couponForm)
      });
      const data = await res.json();
      if (res.ok) {
        addToast(data.message || 'Coupon created.');
        setShowCouponModal(false);
        loadAdminData();
      } else {
        addToast(data.error, 'error');
      }
    } catch (err) {
      addToast('Failed to create coupon.', 'error');
    }
  };

  const handleToggleCoupon = async (id) => {
    try {
      const res = await fetch(`/api/admin/coupons/${id}/toggle`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        addToast('Coupon status updated.');
        loadAdminData();
      }
    } catch (err) {
      addToast('Failed to toggle.', 'error');
    }
  };

  const handleQuickStock = async (id, currentQty, delta) => {
    const newQty = Math.max(0, currentQty + delta);
    try {
      const res = await fetch(`/api/admin/inventory/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ stock_quantity: newQty })
      });
      if (res.ok) {
        loadAdminData();
      }
    } catch (err) {
      addToast('Failed to update stock.', 'error');
    }
  };

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif text-2xl font-bold text-red-700">Admin Authorization Required</h2>
        <p className="text-xs text-[#6E6467]">Please sign in with administrator credentials.</p>
        <button
          onClick={() => onNavigate('home')}
          className="px-6 py-2.5 bg-[#5B1425] text-white rounded-xl text-xs font-bold uppercase"
        >
          Return Home
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fade-in">
      
      {/* Top Header */}
      <div className="bg-[#1F1A1C] text-[#FAF7F2] p-6 sm:p-8 rounded-2xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-[#C5A059]/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-cinzel text-2xl sm:text-3xl font-bold text-[#C5A059]">
              PALLUVO CONCIERGE ADMIN
            </span>
            <span className="text-xs bg-[#5B1425] px-2 py-0.5 rounded font-mono">v1.0 Live</span>
          </div>
          <p className="text-xs text-[#FAF7F2]/70 mt-1">
            Storefront management, inventory telemetry & order fulfillment console
          </p>
        </div>

        <button
          onClick={() => onNavigate('home')}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold uppercase tracking-wider transition self-start sm:self-auto"
        >
          ← View Storefront
        </button>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[#EAE2D7] pb-3">
        {[
          { id: 'analytics', label: 'Dashboard Analytics', icon: LayoutDashboard },
          { id: 'products', label: 'Products & Sarees', icon: Package },
          { id: 'orders', label: 'Orders & Shipments', icon: ShoppingBag },
          { id: 'inventory', label: 'Inventory & Stock', icon: AlertTriangle },
          { id: 'coupons', label: 'Coupons & Promos', icon: Tag },
          { id: 'customers', label: 'Customers', icon: Users }
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-[#5B1425] text-white shadow-md'
                  : 'bg-white border border-[#EAE2D7] text-[#1F1A1C] hover:bg-[#FAF7F2]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: ANALYTICS */}
      {activeTab === 'analytics' && stats && (
        <div className="space-y-8">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white p-6 rounded-2xl border border-[#EAE2D7] shadow-sm space-y-2">
              <span className="text-xs font-bold text-[#6E6467] uppercase tracking-wider">Total Sales (INR)</span>
              <div className="font-serif text-3xl font-bold text-[#5B1425]">
                ₹{stats.metrics?.totalSales?.toLocaleString('en-IN')}
              </div>
              <div className="text-[11px] text-green-700 font-semibold">100% Captured via Razorpay</div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#EAE2D7] shadow-sm space-y-2">
              <span className="text-xs font-bold text-[#6E6467] uppercase tracking-wider">Total Orders</span>
              <div className="font-serif text-3xl font-bold text-[#1F1A1C]">
                {stats.metrics?.totalOrders}
              </div>
              <div className="text-[11px] text-[#6E6467]">Avg: ₹{stats.metrics?.avgOrderValue?.toLocaleString('en-IN')} / order</div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#EAE2D7] shadow-sm space-y-2">
              <span className="text-xs font-bold text-[#6E6467] uppercase tracking-wider">Total Customers</span>
              <div className="font-serif text-3xl font-bold text-[#1F1A1C]">
                {stats.metrics?.totalCustomers}
              </div>
              <div className="text-[11px] text-[#6E6467]">Registered buyers</div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-[#EAE2D7] shadow-sm space-y-2">
              <span className="text-xs font-bold text-[#6E6467] uppercase tracking-wider">Catalog Products</span>
              <div className="font-serif text-3xl font-bold text-[#1F1A1C]">
                {stats.metrics?.totalProducts}
              </div>
              <div className="text-[11px] text-amber-700 font-semibold">{stats.metrics?.lowStockCount} Low stock alerts</div>
            </div>
          </div>

          {/* Breakdown Grids */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Sales by Category */}
            <div className="bg-white p-6 rounded-2xl border border-[#EAE2D7] shadow-sm space-y-4">
              <h3 className="font-serif text-lg font-bold text-[#1F1A1C]">
                Revenue by Saree Category
              </h3>
              <div className="space-y-3">
                {stats.categoryBreakdown?.map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#FAF7F2]">
                    <span className="font-bold text-[#1F1A1C]">{cat.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-[#6E6467]">{cat.units_sold} drapes sold</span>
                      <span className="font-bold text-[#5B1425]">₹{cat.revenue?.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Selling Sarees */}
            <div className="bg-white p-6 rounded-2xl border border-[#EAE2D7] shadow-sm space-y-4">
              <h3 className="font-serif text-lg font-bold text-[#1F1A1C]">
                Top Selling Saree Drapes
              </h3>
              <div className="space-y-3">
                {stats.topProducts?.map((prod) => (
                  <div key={prod.id} className="flex items-center gap-3 text-xs p-2 rounded-lg bg-[#FAF7F2]">
                    <img src={prod.image_url} alt={prod.name} className="w-10 h-14 object-cover rounded-lg" />
                    <div className="flex-1">
                      <div className="font-semibold text-[#1F1A1C] line-clamp-1">{prod.name}</div>
                      <div className="text-[#6E6467]">₹{prod.price?.toLocaleString('en-IN')} • Stock: {prod.stock_quantity}</div>
                    </div>
                    <div className="font-bold text-[#5B1425]">
                      {prod.total_sold} units
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: PRODUCTS */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl font-bold text-[#1F1A1C]">
              Saree Catalog Management ({products.length} Items)
            </h3>
            <button
              onClick={() => {
                setEditingProductId(null);
                setProductForm({
                  name: '',
                  tagline: '',
                  category_id: 1,
                  fabric: 'Pure Katan Silk',
                  occasion: 'Wedding',
                  pattern: 'Zari Kadwa Weave',
                  price: 8999,
                  mrp: 12999,
                  stock_quantity: 20,
                  color_name: 'Wine Red',
                  color_hex: '#5B1425',
                  description: '',
                  images: ['https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=800&q=80']
                });
                setShowProductModal(true);
              }}
              className="px-4 py-2.5 bg-[#5B1425] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#7E1E34] flex items-center gap-2 shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Saree</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-[#EAE2D7] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] border-b border-[#EAE2D7] text-[#6E6467] uppercase">
                  <tr>
                    <th className="p-3.5">Saree</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Fabric & Occasion</th>
                    <th className="p-3.5">Price / MRP</th>
                    <th className="p-3.5">Stock</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EAE2D7]">
                  {products.map((p) => (
                    <tr key={p.id} className="hover:bg-[#FAF7F2]">
                      <td className="p-3.5 flex items-center gap-3">
                        <img
                          src={p.primary_image || 'https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=200&q=80'}
                          alt={p.name}
                          className="w-10 h-14 object-cover rounded-lg"
                        />
                        <div>
                          <div className="font-bold text-[#1F1A1C] line-clamp-1">{p.name}</div>
                          <div className="text-[10px] text-[#6E6467]">{p.sku}</div>
                        </div>
                      </td>
                      <td className="p-3.5 font-medium text-[#1F1A1C]">{p.category_name}</td>
                      <td className="p-3.5 text-[#6E6467]">{p.fabric} • {p.occasion}</td>
                      <td className="p-3.5">
                        <span className="font-bold text-[#5B1425]">₹{p.price?.toLocaleString('en-IN')}</span>
                        <span className="text-[11px] text-[#6E6467] line-through ml-1.5">₹{p.mrp?.toLocaleString('en-IN')}</span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          p.stock_quantity <= 5 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {p.stock_quantity} in stock
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-2">
                        <button
                          onClick={() => {
                            setEditingProductId(p.id);
                            setProductForm({
                              name: p.name,
                              tagline: p.tagline || '',
                              category_id: p.category_id,
                              fabric: p.fabric,
                              occasion: p.occasion,
                              pattern: p.pattern || '',
                              price: p.price,
                              mrp: p.mrp,
                              stock_quantity: p.stock_quantity,
                              color_name: p.color_name,
                              color_hex: p.color_hex,
                              description: p.description,
                              images: p.images ? p.images.map(img => img.image_url) : []
                            });
                            setShowProductModal(true);
                          }}
                          className="p-1.5 text-[#5B1425] hover:bg-gray-100 rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <h3 className="font-serif text-xl font-bold text-[#1F1A1C]">
            Customer Orders & Fulfillment ({orders.length})
          </h3>

          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="bg-white rounded-2xl border border-[#EAE2D7] p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F4EFEB] pb-3 text-xs">
                  <div>
                    <span className="font-bold text-sm text-[#1F1A1C]">Order #{order.order_number}</span>
                    <span className="text-[#6E6467] ml-2">by {order.customer_name} ({order.customer_email})</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full font-bold uppercase tracking-wider text-[10px] ${
                      order.status === 'Delivered' ? 'bg-green-100 text-green-800' : 'bg-[#5B1425] text-white'
                    }`}>
                      Status: {order.status}
                    </span>
                    <span className="font-bold text-sm text-[#5B1425]">₹{order.total_amount?.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="font-bold text-[#6E6467] block mb-1">Items Ordered:</span>
                    <div className="space-y-1">
                      {order.items?.map((item, i) => (
                        <div key={i} className="flex justify-between">
                          <span>{item.quantity}x {item.product_name}</span>
                          <span className="font-semibold">₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="font-bold text-[#6E6467] block mb-1">Shipping Details:</span>
                    <div className="text-[#1F1A1C] leading-relaxed">
                      {order.address?.name} • {order.address?.city} ({order.address?.pincode}) <br />
                      Tracking AWB: <strong>{order.tracking_number || 'N/A'}</strong> ({order.courier_partner})
                    </div>
                  </div>
                </div>

                {/* Status Updater Button */}
                <div className="pt-3 border-t border-[#F4EFEB] flex justify-end">
                  <button
                    onClick={() => {
                      setUpdatingOrderId(order.id);
                      setOrderStatusForm({
                        status: order.status,
                        tracking_number: order.tracking_number || '',
                        courier_partner: order.courier_partner || 'BlueDart Luxury Express',
                        estimated_delivery: order.estimated_delivery || '3-4 Business Days'
                      });
                    }}
                    className="px-4 py-2 bg-[#FAF7F2] border border-[#5B1425] text-[#5B1425] rounded-xl text-xs font-bold uppercase hover:bg-[#5B1425] hover:text-white transition"
                  >
                    Update Order Lifecycle Status
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: INVENTORY */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <h3 className="font-serif text-xl font-bold text-[#1F1A1C]">
            Inventory Stock Telemetry
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory.map((item) => (
              <div
                key={item.id}
                className="bg-white p-5 rounded-2xl border border-[#EAE2D7] shadow-sm flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <img src={item.primary_image} alt={item.name} className="w-12 h-16 object-cover rounded-lg" />
                  <div className="text-xs">
                    <h4 className="font-bold text-[#1F1A1C] line-clamp-1">{item.name}</h4>
                    <div className="text-[#6E6467]">{item.sku}</div>
                    <div className="mt-1">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.stock_quantity <= 10 ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {item.stock_status} ({item.stock_quantity} left)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleQuickStock(item.id, item.stock_quantity, 5)}
                    className="px-2 py-1 bg-green-50 text-green-800 border border-green-200 rounded text-xs font-bold hover:bg-green-100"
                  >
                    +5
                  </button>
                  <button
                    onClick={() => handleQuickStock(item.id, item.stock_quantity, -1)}
                    className="px-2 py-1 bg-red-50 text-red-800 border border-red-200 rounded text-xs font-bold hover:bg-red-100"
                  >
                    -1
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: COUPONS */}
      {activeTab === 'coupons' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-xl font-bold text-[#1F1A1C]">
              Promotional Coupons & Deals
            </h3>
            <button
              onClick={() => setShowCouponModal(true)}
              className="px-4 py-2 bg-[#5B1425] text-white rounded-xl text-xs font-bold uppercase flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Create Coupon</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {coupons.map((c) => (
              <div key={c.id} className="bg-white p-5 rounded-2xl border border-[#EAE2D7] shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-base text-[#5B1425]">{c.code}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${c.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="text-xs">
                  <div className="font-semibold text-[#1F1A1C]">{c.title}</div>
                  <div className="text-[#6E6467]">{c.discount_percent}% Discount • Used {c.times_used || 0} times</div>
                </div>
                <div className="pt-2 border-t border-[#F4EFEB] flex justify-end">
                  <button
                    onClick={() => handleToggleCoupon(c.id)}
                    className="text-xs font-bold text-[#5B1425] hover:underline"
                  >
                    {c.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: CUSTOMERS */}
      {activeTab === 'customers' && (
        <div className="space-y-6">
          <h3 className="font-serif text-xl font-bold text-[#1F1A1C]">
            Customer Directory ({customers.length})
          </h3>
          <div className="bg-white rounded-2xl border border-[#EAE2D7] overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF7F2] border-b border-[#EAE2D7] text-[#6E6467] uppercase">
                <tr>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Contact</th>
                  <th className="p-3.5">Orders Placed</th>
                  <th className="p-3.5">Lifetime Spend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAE2D7]">
                {customers.map((cust) => (
                  <tr key={cust.id} className="hover:bg-[#FAF7F2]">
                    <td className="p-3.5 font-bold text-[#1F1A1C]">{cust.name}</td>
                    <td className="p-3.5 text-[#6E6467]">{cust.email} • {cust.phone || 'N/A'}</td>
                    <td className="p-3.5 font-semibold text-[#1F1A1C]">{cust.total_orders} orders</td>
                    <td className="p-3.5 font-bold text-[#5B1425]">₹{cust.total_spent?.toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Add/Edit Modal */}
      {showProductModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowProductModal(false);
          }}
        >
          <div className="relative bg-[#FAF7F2] w-full max-w-2xl rounded-2xl p-5 sm:p-7 border border-[#C5A059]/40 shadow-2xl space-y-5 my-auto max-h-[90vh] overflow-y-auto animate-fade-in text-[#1F1A1C]">
            <div className="flex items-center justify-between border-b border-[#EAE2D7] pb-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#5B1425] bg-[#5B1425]/10 px-2.5 py-0.5 rounded-full">
                  Inventory Management
                </span>
                <h3 className="font-serif font-bold text-xl text-[#1F1A1C] mt-1">
                  {editingProductId ? 'Edit Saree Drape' : 'Add New Saree to Catalog'}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setShowProductModal(false)}
                className="p-2 rounded-full hover:bg-black/5 text-[#6E6467] hover:text-[#1F1A1C] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-semibold text-[#1F1A1C]">Saree Title *</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="e.g. Royal Crimson Banarasi Katan Silk Saree"
                  className="w-full bg-white border border-[#EAE2D7] focus:border-[#5B1425] focus:outline-none p-2.5 rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-[#1F1A1C]">Tagline / Subtitle</label>
                <input
                  type="text"
                  value={productForm.tagline || ''}
                  onChange={(e) => setProductForm({ ...productForm, tagline: e.target.value })}
                  placeholder="e.g. Handwoven Kadwa Zari Weave with Intricate Floral Pallu"
                  className="w-full bg-white border border-[#EAE2D7] focus:border-[#5B1425] focus:outline-none p-2.5 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-[#1F1A1C]">Category *</label>
                  <select
                    value={productForm.category_id}
                    onChange={(e) => setProductForm({ ...productForm, category_id: parseInt(e.target.value) })}
                    className="w-full bg-white border border-[#EAE2D7] focus:border-[#5B1425] focus:outline-none p-2.5 rounded-xl font-medium"
                  >
                    <option value={1}>Banarasi Sarees</option>
                    <option value={2}>Kanjivaram Silk</option>
                    <option value={3}>Pure Silk</option>
                    <option value={4}>Organza & Tissue</option>
                    <option value={5}>Linen & Cotton</option>
                    <option value={6}>Designer Sarees</option>
                    <option value={7}>Party Wear</option>
                    <option value={8}>Bridal Trousseau</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-[#1F1A1C]">Fabric Type *</label>
                  <input
                    type="text"
                    required
                    value={productForm.fabric}
                    onChange={(e) => setProductForm({ ...productForm, fabric: e.target.value })}
                    placeholder="e.g. Pure Katan Silk"
                    className="w-full bg-white border border-[#EAE2D7] focus:border-[#5B1425] focus:outline-none p-2.5 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-[#1F1A1C]">Occasion *</label>
                  <select
                    value={productForm.occasion}
                    onChange={(e) => setProductForm({ ...productForm, occasion: e.target.value })}
                    className="w-full bg-white border border-[#EAE2D7] focus:border-[#5B1425] focus:outline-none p-2.5 rounded-xl font-medium"
                  >
                    <option value="Wedding">Wedding</option>
                    <option value="Bridal">Bridal</option>
                    <option value="Festive">Festive</option>
                    <option value="Party">Party</option>
                    <option value="Workwear">Workwear</option>
                    <option value="Traditional">Traditional</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-[#1F1A1C]">Offer Price (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    className="w-full bg-white border border-[#EAE2D7] focus:border-[#5B1425] focus:outline-none p-2.5 rounded-xl font-semibold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-[#1F1A1C]">MRP (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={productForm.mrp}
                    onChange={(e) => setProductForm({ ...productForm, mrp: e.target.value })}
                    className="w-full bg-white border border-[#EAE2D7] focus:border-[#5B1425] focus:outline-none p-2.5 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-[#1F1A1C]">Stock Units *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={productForm.stock_quantity}
                    onChange={(e) => setProductForm({ ...productForm, stock_quantity: e.target.value })}
                    className="w-full bg-white border border-[#EAE2D7] focus:border-[#5B1425] focus:outline-none p-2.5 rounded-xl font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-[#1F1A1C]">Color Shade Name</label>
                  <input
                    type="text"
                    value={productForm.color_name || 'Wine Red'}
                    onChange={(e) => setProductForm({ ...productForm, color_name: e.target.value })}
                    placeholder="e.g. Royal Wine, Peacock Green"
                    className="w-full bg-white border border-[#EAE2D7] focus:border-[#5B1425] focus:outline-none p-2.5 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-[#1F1A1C]">Color Swatch Hex</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={productForm.color_hex || '#5B1425'}
                      onChange={(e) => setProductForm({ ...productForm, color_hex: e.target.value })}
                      className="w-10 h-10 rounded-xl border border-[#EAE2D7] cursor-pointer p-0.5 bg-white"
                    />
                    <input
                      type="text"
                      value={productForm.color_hex || '#5B1425'}
                      onChange={(e) => setProductForm({ ...productForm, color_hex: e.target.value })}
                      placeholder="#5B1425"
                      className="w-full bg-white border border-[#EAE2D7] focus:border-[#5B1425] focus:outline-none p-2.5 rounded-xl font-mono uppercase"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-[#1F1A1C]">High-Res Saree Image URL *</label>
                <div className="flex gap-2 items-start">
                  <input
                    type="url"
                    required
                    value={productForm.images[0] || ''}
                    onChange={(e) => setProductForm({ ...productForm, images: [e.target.value] })}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="w-full bg-white border border-[#EAE2D7] focus:border-[#5B1425] focus:outline-none p-2.5 rounded-xl text-xs"
                  />
                  {productForm.images[0] && (
                    <img 
                      src={productForm.images[0]} 
                      alt="Preview" 
                      className="w-10 h-14 object-cover rounded-lg border border-[#EAE2D7] shadow-sm flex-shrink-0"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-[#1F1A1C]">Craftsmanship & Weave Description *</label>
                <textarea
                  rows="3"
                  required
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Describe the weaving technique, zari craftsmanship, borders, pallu artwork, and styling suggestions..."
                  className="w-full bg-white border border-[#EAE2D7] focus:border-[#5B1425] focus:outline-none p-2.5 rounded-xl text-xs leading-relaxed"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#EAE2D7]">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="px-5 py-2.5 border border-[#EAE2D7] text-[#6E6467] hover:text-[#1F1A1C] hover:bg-black/5 rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-7 py-2.5 bg-[#5B1425] hover:bg-[#7E1E34] text-white font-bold rounded-xl uppercase tracking-wider shadow-lg transition flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingProductId ? 'Update Saree' : 'Publish Saree to Catalog'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Status Update Modal */}
      {updatingOrderId && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setUpdatingOrderId(null);
          }}
        >
          <div className="relative bg-[#FAF7F2] w-full max-w-md rounded-2xl p-6 border border-[#C5A059]/40 shadow-2xl space-y-4 my-auto animate-fade-in text-[#1F1A1C]">
            <div className="flex items-center justify-between border-b border-[#EAE2D7] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#1F1A1C]">
                Update Order #{updatingOrderId} Status
              </h3>
              <button 
                type="button"
                onClick={() => setUpdatingOrderId(null)}
                className="p-1.5 rounded-full hover:bg-black/5 text-[#6E6467]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateOrderStatus} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-semibold text-[#1F1A1C]">Lifecycle Stage</label>
                <select
                  value={orderStatusForm.status}
                  onChange={(e) => setOrderStatusForm({ ...orderStatusForm, status: e.target.value })}
                  className="w-full bg-white border border-[#EAE2D7] focus:border-[#5B1425] focus:outline-none p-2.5 rounded-xl font-medium"
                >
                  <option value="Placed">Placed</option>
                  <option value="Packed">Packed</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-[#1F1A1C]">Courier AWB / Tracking Number</label>
                <input
                  type="text"
                  value={orderStatusForm.tracking_number}
                  onChange={(e) => setOrderStatusForm({ ...orderStatusForm, tracking_number: e.target.value })}
                  placeholder="e.g. BLR-BD-991122"
                  className="w-full bg-white border border-[#EAE2D7] focus:border-[#5B1425] focus:outline-none p-2.5 rounded-xl font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-[#1F1A1C]">Courier Partner</label>
                <input
                  type="text"
                  value={orderStatusForm.courier_partner}
                  onChange={(e) => setOrderStatusForm({ ...orderStatusForm, courier_partner: e.target.value })}
                  placeholder="e.g. BlueDart Luxury Express"
                  className="w-full bg-white border border-[#EAE2D7] focus:border-[#5B1425] focus:outline-none p-2.5 rounded-xl"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EAE2D7]">
                <button
                  type="button"
                  onClick={() => setUpdatingOrderId(null)}
                  className="px-4 py-2 border border-[#EAE2D7] text-[#6E6467] rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#5B1425] hover:bg-[#7E1E34] text-white font-bold rounded-xl uppercase tracking-wider shadow-md transition"
                >
                  Update Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coupon Modal */}
      {showCouponModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCouponModal(false);
          }}
        >
          <div className="relative bg-[#FAF7F2] w-full max-w-md rounded-2xl p-6 border border-[#C5A059]/40 shadow-2xl space-y-4 my-auto animate-fade-in text-[#1F1A1C]">
            <div className="flex items-center justify-between border-b border-[#EAE2D7] pb-3">
              <h3 className="font-serif font-bold text-lg text-[#1F1A1C]">
                Create New Promo Coupon
              </h3>
              <button 
                type="button"
                onClick={() => setShowCouponModal(false)}
                className="p-1.5 rounded-full hover:bg-black/5 text-[#6E6467]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="block font-semibold text-[#1F1A1C]">Coupon Code *</label>
                <input
                  type="text"
                  required
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. FESTIVE25"
                  className="w-full bg-white border border-[#EAE2D7] focus:border-[#5B1425] focus:outline-none p-2.5 rounded-xl uppercase font-mono font-bold tracking-wider"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-semibold text-[#1F1A1C]">Offer Title *</label>
                <input
                  type="text"
                  required
                  value={couponForm.title}
                  onChange={(e) => setCouponForm({ ...couponForm, title: e.target.value })}
                  placeholder="e.g. Festive Special 25% Off"
                  className="w-full bg-white border border-[#EAE2D7] focus:border-[#5B1425] focus:outline-none p-2.5 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-semibold text-[#1F1A1C]">Discount (%) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="90"
                    value={couponForm.discount_percent}
                    onChange={(e) => setCouponForm({ ...couponForm, discount_percent: e.target.value })}
                    className="w-full bg-white border border-[#EAE2D7] focus:border-[#5B1425] focus:outline-none p-2.5 rounded-xl font-bold"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-semibold text-[#1F1A1C]">Min Order (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={couponForm.min_order_amount}
                    onChange={(e) => setCouponForm({ ...couponForm, min_order_amount: e.target.value })}
                    className="w-full bg-white border border-[#EAE2D7] focus:border-[#5B1425] focus:outline-none p-2.5 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#EAE2D7]">
                <button
                  type="button"
                  onClick={() => setShowCouponModal(false)}
                  className="px-4 py-2 border border-[#EAE2D7] text-[#6E6467] rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-[#5B1425] hover:bg-[#7E1E34] text-white font-bold rounded-xl uppercase tracking-wider shadow-md transition"
                >
                  Create Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
