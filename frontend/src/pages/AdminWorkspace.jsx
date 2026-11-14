import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../api/autoqueue";
import { useAuth } from "../context/useAuth";
import VehicleImage from "../components/common/VehicleImage";

const imageFileError = (file) => {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    return "Please choose a PNG, JPEG, or WebP image.";
  }
  if (file.size > 4 * 1024 * 1024) {
    return "Image size must be 4 MB or smaller.";
  }
  return "";
};

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read the selected image file."));
    reader.readAsDataURL(file);
  });

export default function AdminWorkspace() {
  const { user, token, logout } = useAuth();
  const [data, setData] = useState({ dealers: [], cars: [] });
  const [statusMessage, setStatusMessage] = useState("");
  const [statusType, setStatusType] = useState("info"); // 'info' | 'success' | 'error'
  const [isRefreshing, setIsRefreshing] = useState(false);

  // New car form state
  const [newCar, setNewCar] = useState({ brand: "", model: "", imageUrl: "" });
  const [newCarImageDataUrl, setNewCarImageDataUrl] = useState("");
  const [dealerFilter, setDealerFilter] = useState("all"); // 'all' | 'pending' | 'verified'

  const notify = (msg, type = "info") => {
    setStatusMessage(msg);
    setStatusType(type);
  };

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [dealersRes, carsRes] = await Promise.all([
        adminApi.dealers(token),
        adminApi.cars(token)
      ]);
      setData({
        dealers: dealersRes.dealers || [],
        cars: carsRes.cars || []
      });
      notify("Data synchronized with server", "info");
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setIsRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(refresh, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  const handleCreateCar = async (e) => {
    e.preventDefault();
    if (!newCar.brand.trim() || !newCar.model.trim()) {
      return notify("Brand and Model are required.", "error");
    }

    try {
      // 1. Create the car model
      const created = await adminApi.createCar(token, {
        brand: newCar.brand.trim(),
        model: newCar.model.trim(),
        imageUrl: newCar.imageUrl.trim() || null
      });

      const carModelId = created.car?.carModelId || created.carModel?.carModelId;

      // 2. If a local file was chosen instead of / in addition to URL, upload it
      if (newCarImageDataUrl && carModelId) {
        await adminApi.uploadCarImage(token, carModelId, newCarImageDataUrl);
      }

      notify(`Added "${newCar.brand} ${newCar.model}" to catalogue`, "success");
      setNewCar({ brand: "", model: "", imageUrl: "" });
      setNewCarImageDataUrl("");
      await refresh();
    } catch (err) {
      notify(err.message, "error");
    }
  };

  const handleNewCarFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = imageFileError(file);
    if (err) return notify(err, "error");

    try {
      const dataUrl = await readFileAsDataUrl(file);
      setNewCarImageDataUrl(dataUrl);
      setNewCar((prev) => ({ ...prev, imageUrl: "" }));
      notify("Local image loaded for upload upon creation", "info");
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const handleVerifyDealer = async (dealerId, dealerName) => {
    try {
      await adminApi.verifyDealer(token, dealerId);
      notify(`Verified dealership "${dealerName}"`, "success");
      await refresh();
    } catch (err) {
      notify(err.message, "error");
    }
  };

  const pendingDealersCount = data.dealers.filter((d) => !d.verified).length;
  const filteredDealers = data.dealers.filter((d) => {
    if (dealerFilter === "pending") return !d.verified;
    if (dealerFilter === "verified") return d.verified;
    return true;
  });

  return (
    <main className="app-shell">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Platform Administration</p>
          <h1>{user?.name || "Administrator"}</h1>
        </div>
        <nav>
          <button className="secondary-action" onClick={refresh} disabled={isRefreshing}>
            {isRefreshing ? "Refreshing…" : "Refresh"}
          </button>
          <button className="secondary-action" onClick={logout}>
            Sign Out
          </button>
        </nav>
      </header>

      <div className="workspace-content">
        {statusMessage && (
          <div
            className={`p-3 rounded-lg text-sm border ${
              statusType === "error"
                ? "bg-red-50 text-red-800 border-red-200"
                : statusType === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-blue-50 text-blue-800 border-blue-200"
            }`}
          >
            {statusMessage}
          </div>
        )}

        {/* Top Metric Cards */}
        <div className="metric-grid">
          <div className="metric">
            <span>Registered Dealerships</span>
            <strong>{data.dealers.length}</strong>
          </div>
          <div className="metric">
            <span>Pending Verification</span>
            <strong className={pendingDealersCount > 0 ? "text-amber-600" : ""}>
              {pendingDealersCount}
            </strong>
          </div>
          <div className="metric">
            <span>Catalogue Models</span>
            <strong>{data.cars.length}</strong>
          </div>
          <div className="metric">
            <span>Models with Imagery</span>
            <strong>{data.cars.filter((c) => c.imageUrl).length}</strong>
          </div>
        </div>

        {/* Dealer Verification Section */}
        <section className="surface">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-200">
            <div>
              <h2>Dealership Verification & Status</h2>
              <p className="section-copy">
                Dealers cannot create inventory or tender offers until their account is verified.
              </p>
            </div>
            <div className="flex gap-2">
              {["all", "pending", "verified"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setDealerFilter(filter)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md capitalize transition-colors ${
                    dealerFilter === filter
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {filter} ({filter === "all" ? data.dealers.length : filter === "pending" ? pendingDealersCount : data.dealers.length - pendingDealersCount})
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {filteredDealers.map((dealer) => (
              <div key={dealer.dealerId} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900 font-semibold">{dealer.dealerName}</strong>
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                        dealer.verified
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {dealer.verified ? "Verified" : "Pending Approval"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    City: <span className="font-medium text-slate-700">{dealer.city}</span> · Address: {dealer.address || "N/A"} · Contact: {dealer.user?.email || "N/A"} ({dealer.user?.phone || "N/A"}) · Stock records: {dealer._count?.inventory ?? 0}
                  </p>
                </div>

                <div>
                  {!dealer.verified && (
                    <button
                      className="primary-action text-xs"
                      onClick={() => handleVerifyDealer(dealer.dealerId, dealer.dealerName)}
                    >
                      Approve & Verify
                    </button>
                  )}
                </div>
              </div>
            ))}
            {filteredDealers.length === 0 && (
              <p className="empty-state">No dealerships match the selected filter.</p>
            )}
          </div>
        </section>

        {/* Global Car Catalogue & Image Management */}
        <section className="surface">
          <h2>Vehicle Catalogue & Global Imagery</h2>
          <p className="section-copy">
            Official vehicle imagery is stored centrally in <code>CarModel.imageUrl</code>. These official images are shared across all regional dealer inventory listings. Only administrators can create, update, or remove catalogue images.
          </p>

          {/* Add New Car Model Form */}
          <form className="mt-5 p-4 rounded-xl border border-slate-200 bg-slate-50/50" onSubmit={handleCreateCar}>
            <h3 className="text-sm font-bold text-slate-900 mb-3">Add New Vehicle to Catalogue</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Brand *</label>
                <input
                  required
                  placeholder="e.g. Maruti Suzuki, Hyundai"
                  value={newCar.brand}
                  onChange={(e) => setNewCar({ ...newCar, brand: e.target.value })}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Model *</label>
                <input
                  required
                  placeholder="e.g. Brezza, Creta"
                  value={newCar.model}
                  onChange={(e) => setNewCar({ ...newCar, model: e.target.value })}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Image URL (or select file below)
                </label>
                <input
                  type="text"
                  placeholder="https://… or /uploads/…"
                  value={newCar.imageUrl}
                  onChange={(e) => {
                    setNewCar({ ...newCar, imageUrl: e.target.value });
                    setNewCarImageDataUrl("");
                  }}
                  className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
                />
              </div>

              <div>
                <button type="submit" className="primary-action w-full text-sm">
                  Add Vehicle Model
                </button>
              </div>
            </div>

            {/* Optional local file upload for new car */}
            <div className="mt-3 pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
                <span>Or upload image file:</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleNewCarFileSelect}
                  className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </label>

              {(newCar.imageUrl || newCarImageDataUrl) && (
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">Preview:</span>
                  <div className="w-16 h-12 rounded overflow-hidden border border-slate-200 bg-white">
                    <VehicleImage src={newCarImageDataUrl || newCar.imageUrl} alt="Preview" />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCar({ ...newCar, imageUrl: "" });
                      setNewCarImageDataUrl("");
                    }}
                    className="text-xs text-red-600 font-semibold"
                  >
                    Clear Preview
                  </button>
                </div>
              )}
            </div>
          </form>

          {/* Existing Catalogue Grid */}
          <div className="catalogue-grid mt-6">
            {data.cars.map((carItem) => (
              <CatalogueCard
                key={carItem.carModelId}
                item={carItem}
                token={token}
                onRefresh={refresh}
                notify={notify}
              />
            ))}
            {data.cars.length === 0 && (
              <p className="empty-state">No car models in the catalogue yet.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function CatalogueCard({ item, token, onRefresh, notify }) {
  const [imageUrl, setImageUrl] = useState(item.imageUrl || "");
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    setImageUrl(item.imageUrl || "");
  }, [item.imageUrl]);

  const handleSaveUrl = async () => {
    setIsUpdating(true);
    try {
      await adminApi.updateCar(token, item.carModelId, {
        imageUrl: imageUrl.trim() || null
      });
      notify(`Updated image URL for ${item.brand} ${item.model}`, "success");
      await onRefresh();
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const err = imageFileError(file);
    if (err) return notify(err, "error");

    setIsUpdating(true);
    try {
      const dataUrl = await readFileAsDataUrl(file);
      await adminApi.uploadCarImage(token, item.carModelId, dataUrl);
      notify(`Uploaded new image for ${item.brand} ${item.model}`, "success");
      await onRefresh();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!window.confirm(`Remove image from ${item.brand} ${item.model}?`)) return;
    setIsUpdating(true);
    try {
      await adminApi.updateCar(token, item.carModelId, { imageUrl: null });
      setImageUrl("");
      notify(`Image removed from ${item.brand} ${item.model}`, "success");
      await onRefresh();
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteModel = async () => {
    if (!window.confirm(`Delete ${item.brand} ${item.model} from catalogue? This cannot be undone.`)) return;
    setIsUpdating(true);
    try {
      await adminApi.deleteCar(token, item.carModelId);
      notify(`Deleted ${item.brand} ${item.model}`, "success");
      await onRefresh();
    } catch (err) {
      notify(err.message, "error");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <article className="catalogue-card">
      <div className="relative rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center">
        <VehicleImage src={item.imageUrl} alt={`${item.brand} ${item.model}`} />
      </div>

      <div className="flex flex-col justify-between">
        <div>
          <div className="flex justify-between items-start">
            <h3 className="text-slate-900 font-bold">
              {item.brand} {item.model}
            </h3>
            {item.imageUrl ? (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                Custom Image
              </span>
            ) : (
              <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                Fallback Image
              </span>
            )}
          </div>

          <label className="block mt-2 text-xs font-semibold text-slate-600">
            Image URL
            <input
              type="text"
              placeholder="https://… or /uploads/…"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="mt-1 w-full text-xs rounded border border-slate-300 bg-white px-2 py-1 text-slate-900"
            />
          </label>

          <div className="mt-2 flex items-center justify-between">
            <label className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 cursor-pointer">
              <span>Upload file</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileUpload}
                className="hidden"
                disabled={isUpdating}
              />
            </label>

            {item.imageUrl && (
              <button
                type="button"
                onClick={handleRemoveImage}
                disabled={isUpdating}
                className="text-[11px] font-semibold text-amber-700 hover:text-amber-800"
              >
                Clear Image
              </button>
            )}
          </div>
        </div>

        <div className="card-actions mt-3 pt-2 border-t border-slate-100 flex justify-between items-center">
          <button
            type="button"
            className="secondary-action text-xs"
            onClick={handleSaveUrl}
            disabled={isUpdating}
          >
            {isUpdating ? "Saving…" : "Save URL"}
          </button>
          <button
            type="button"
            className="danger-action text-xs"
            onClick={handleDeleteModel}
            disabled={isUpdating}
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}
