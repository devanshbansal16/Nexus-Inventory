import React, { useState, useEffect } from 'react';
import { Package, Plus, Search, Filter, Edit2, Trash2, Boxes, Eye } from 'lucide-react';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Table from '../components/common/Table';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import SearchBar from '../components/common/SearchBar';
import { formatCurrency, formatNumber } from '../utils/formatters';
import api from '../services/api';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [productDetails, setProductDetails] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'Laptops',
    brand: '',
    purchasePrice: '',
    sellingPrice: '',
    minimumStockLevel: 10,
    reorderQuantity: 50,
    description: '',
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (categoryFilter) params.category = categoryFilter;

      const res = await api.get('/products', { params });
      if (res.data?.data?.products) {
        setProducts(res.data.data.products);
      }
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [categoryFilter]);

  const handleSearchSubmit = (e) => {
    e?.preventDefault();
    fetchProducts();
  };

  const handleOpenAddModal = () => {
    setSelectedProduct(null);
    setFormData({
      name: '',
      sku: '',
      category: 'Laptops',
      brand: '',
      purchasePrice: '',
      sellingPrice: '',
      minimumStockLevel: 10,
      reorderQuantity: 50,
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod) => {
    setSelectedProduct(prod);
    setFormData({
      name: prod.name,
      sku: prod.sku,
      category: prod.category,
      brand: prod.brand,
      purchasePrice: prod.purchasePrice,
      sellingPrice: prod.sellingPrice,
      minimumStockLevel: prod.minimumStockLevel,
      reorderQuantity: prod.reorderQuantity,
      description: prod.description || '',
    });
    setIsModalOpen(true);
  };

  const handleViewDetails = async (prod) => {
    try {
      const res = await api.get(`/products/${prod._id}`);
      setProductDetails(res.data.data);
      setIsDetailModalOpen(true);
    } catch (err) {
      console.error('Error fetching product details:', err);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      if (selectedProduct) {
        await api.put(`/products/${selectedProduct._id}`, formData);
      } else {
        await api.post('/products', formData);
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save product');
    }
  };

  const categories = ['All', 'Laptops', 'Mobile Phones', 'Audio', 'Accessories', 'Keyboards', 'Monitors'];

  const columns = [
    {
      header: 'Product',
      render: (row) => (
        <div className="flex items-center gap-3">
          <img
            src={row.image}
            alt={row.name}
            className="w-10 h-10 rounded-lg object-cover bg-slate-100 border border-slate-200"
          />
          <div>
            <p className="font-semibold text-slate-800 text-sm">{row.name}</p>
            <p className="text-xs text-slate-500">{row.brand} • SKU: {row.sku}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Category',
      render: (row) => <Badge variant="neutral">{row.category}</Badge>,
    },
    {
      header: 'Selling Price',
      render: (row) => <span className="font-medium text-slate-700">{formatCurrency(row.sellingPrice)}</span>,
    },
    {
      header: 'Available Stock',
      render: (row) => {
        const available = row.stock?.availableStock ?? 0;
        const minLevel = row.minimumStockLevel ?? 10;
        const isLow = available <= minLevel;
        return (
          <div>
            <span className={`font-bold ${isLow ? 'text-red-600' : 'text-slate-800'}`}>
              {formatNumber(available)}
            </span>
            <span className="text-xs text-slate-400"> / min {minLevel}</span>
          </div>
        );
      },
    },
    {
      header: 'Stock Status',
      render: (row) => {
        const available = row.stock?.availableStock ?? 0;
        if (available <= 0) return <Badge variant="danger">Out of Stock</Badge>;
        if (available <= (row.minimumStockLevel ?? 10)) return <Badge variant="warning">Low Stock</Badge>;
        return <Badge variant="success">In Stock</Badge>;
      },
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleViewDetails(row)}
            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="View Stock Breakdown"
          >
            <Eye size={16} />
          </button>
          <button
            onClick={() => handleOpenEditModal(row)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Edit Product"
          >
            <Edit2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Products Catalog</h1>
          <p className="text-xs text-slate-500 mt-1">
            Centrally manage internal SKUs and cross-marketplace product listings
          </p>
        </div>
        <Button onClick={handleOpenAddModal} className="gap-2">
          <Plus size={16} /> Add Product
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder="Search by product name, SKU, or brand..."
          />
        </form>
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat === 'All' ? '' : cat)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                (cat === 'All' && !categoryFilter) || categoryFilter === cat
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <Table
        columns={columns}
        data={products}
        loading={loading}
        emptyMessage="No products match your criteria"
      />

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedProduct ? 'Edit Product' : 'Add New Product'}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleSaveProduct} className="space-y-4">
          <Input
            label="Product Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. MacBook Pro 16 M3 Max"
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="SKU (Internal Source of Truth)"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
              placeholder="e.g. LAP-MBP-16"
              disabled={!!selectedProduct}
              required
            />
            <Input
              label="Brand"
              value={formData.brand}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              placeholder="e.g. Apple"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {categories.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <Input
              label="Selling Price (₹)"
              type="number"
              value={formData.sellingPrice}
              onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
              placeholder="249900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Purchase Cost (₹)"
              type="number"
              value={formData.purchasePrice}
              onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
              placeholder="180000"
              required
            />
            <Input
              label="Min Stock Alert Threshold"
              type="number"
              value={formData.minimumStockLevel}
              onChange={(e) => setFormData({ ...formData, minimumStockLevel: Number(e.target.value) })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
              placeholder="Detailed specifications, features, warranty..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {selectedProduct ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Product Details & Multi-Warehouse Breakdown Modal */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        title={productDetails?.product?.name || 'Product Details'}
        maxWidth="max-w-2xl"
      >
        {productDetails && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <img
                src={productDetails.product.image}
                alt={productDetails.product.name}
                className="w-16 h-16 rounded-lg object-cover bg-white border border-slate-200"
              />
              <div>
                <h4 className="font-bold text-slate-800">{productDetails.product.name}</h4>
                <p className="text-xs text-slate-500">
                  Internal SKU: <span className="font-mono font-semibold text-indigo-600">{productDetails.product.sku}</span> • {productDetails.product.brand}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs">
                  <span>Selling: <strong className="text-slate-800">{formatCurrency(productDetails.product.sellingPrice)}</strong></span>
                  <span>Cost: <strong className="text-slate-800">{formatCurrency(productDetails.product.purchasePrice)}</strong></span>
                </div>
              </div>
            </div>

            {/* Warehouse Stock Breakdown */}
            <div>
              <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Boxes size={16} className="text-indigo-600" />
                Multi-Warehouse Stock Distribution
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Warehouse</th>
                      <th className="py-2.5 px-3">Physical</th>
                      <th className="py-2.5 px-3">Reserved</th>
                      <th className="py-2.5 px-3">Damaged</th>
                      <th className="py-2.5 px-3">Available to Sell</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {productDetails.inventories?.map((inv) => (
                      <tr key={inv._id}>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {inv.warehouseId?.name} ({inv.warehouseId?.warehouseCode})
                        </td>
                        <td className="py-2.5 px-3">{inv.physicalStock}</td>
                        <td className="py-2.5 px-3 text-amber-600 font-medium">{inv.reservedStock}</td>
                        <td className="py-2.5 px-3 text-red-600 font-medium">{inv.damagedStock}</td>
                        <td className="py-2.5 px-3 text-emerald-600 font-bold">{inv.availableStock}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-indigo-50/50 font-bold text-slate-800 border-t border-indigo-100">
                    <tr>
                      <td className="py-2.5 px-3">Global Total</td>
                      <td className="py-2.5 px-3">{productDetails.stockTotals?.physicalStock}</td>
                      <td className="py-2.5 px-3 text-amber-600">{productDetails.stockTotals?.reservedStock}</td>
                      <td className="py-2.5 px-3 text-red-600">{productDetails.stockTotals?.damagedStock}</td>
                      <td className="py-2.5 px-3 text-emerald-600">{productDetails.stockTotals?.availableStock}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Marketplace Listings */}
            <div>
              <h4 className="text-sm font-bold text-slate-800 mb-3">
                Connected Marketplace Listings
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {productDetails.listings?.map((listing) => (
                  <div key={listing._id} className="p-3 bg-white border border-slate-200 rounded-lg text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{listing.marketplaceId?.name}</span>
                      <Badge variant="success">{listing.syncStatus}</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">Ext SKU: {listing.externalSKU}</p>
                    <p className="text-[11px] text-slate-500">Published Stock: {listing.lastPublishedStock} units</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
