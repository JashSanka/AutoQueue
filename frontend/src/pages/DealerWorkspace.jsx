import { useCallback, useEffect, useMemo, useState } from "react";
import { dealerApi } from "../api/autoqueue";
import { useAuth } from "../context/useAuth";
import VehicleImage from "../components/common/VehicleImage";
import PriceBreakdown from "../components/common/PriceBreakdown";
import { formatInr } from "../utils/formatters";

const blankInventory = {
  carModelId: "",
  variant: "",
  color: "",
  totalUnits: "1",
  availableUnits: "1",
  exShowroom: "",
  insurance: "0",
  rto: "0",
  accessories: "0",
  discount: "0",
};

const numericFields = new Set([
  "totalUnits",
  "availableUnits",
  "exShowroom",
  "insurance",
  "rto",
  "accessories",
  "discount",
]);

export default function DealerWorkspace() {
  const { user, token, logout } = useAuth();
  const [data, setData] = useState({
    cars: [],
    inventory: [],
    offers: [],
    entries: [],
    bookings: [],
  });
  const [form, setForm] = useState(blankInventory);
  const [message, setMessage] = useState("Loading dealership…");
  const [messageType, setMessageType] = useState("info");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const notify = (msg, type = "info") => {
    setMessage(msg);
    setMessageType(type);
  };

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [cars, inventory, offers, entries, bookings] = await Promise.all([
        dealerApi.cars(token),
        dealerApi.inventory(token),
        dealerApi.offers(token),
        dealerApi.eligibleEntries(token),
        dealerApi.bookings(token),
      ]);
      setData({
        cars: cars.cars || [],
        inventory: inventory.inventory || [],
        offers: offers.offers || [],
        entries: entries.entries || [],
        bookings: bookings.bookings || [],
      });
      notify("Data updated just now", "info");
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

  const run = async (request, successMsg = "Saved successfully") => {
    try {
      await request();
      notify(successMsg, "success");
      await refresh();
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const selectedCar = data.cars.find((car) => car.carModelId === form.carModelId);

  const draftPricing = useMemo(
    () =>
      Object.fromEntries(
        Object.entries(form).map(([key, value]) => [
          key,
          numericFields.has(key) ? Number(value || 0) : value,
        ])
      ),
    [form]
  );

  const submitInventory = async (e) => {
    e.preventDefault();
    if (Number(form.availableUnits) > Number(form.totalUnits)) {
      return notify("Available units cannot exceed total units.", "error");
    }

    const ex = Number(form.exShowroom) || 0;
    const ins = Number(form.insurance) || 0;
    const rto = Number(form.rto) || 0;
    const acc = Number(form.accessories) || 0;
    const disc = Number(form.discount) || 0;

    if (disc > ex + ins + rto + acc) {
      return notify("Discount cannot exceed the total charges.", "error");
    }

    try {
      await dealerApi.createInventory(token, draftPricing);
      notify("Inventory record created successfully", "success");
      setForm(blankInventory);
      await refresh();
    } catch (error) {
      notify(error.message, "error");
    }
  };

  if (/verification|profile not found/i.test(message) && !data.inventory.length) {
    return <Pending onLogout={logout} onRefresh={refresh} />;
  }

  return (
    <main className="app-shell">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Authorized Dealership Console</p>
          <h1>{user?.name || "Dealership"}</h1>
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
        {message && (
          <div
            className={`p-3 rounded-lg text-sm border ${
              messageType === "error"
                ? "bg-red-50 text-red-800 border-red-200"
                : messageType === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-blue-50 text-blue-800 border-blue-200"
            }`}
          >
            {message}
          </div>
        )}

        <MetricGrid data={data} />

        {/* Add Inventory Section */}
        <section className="surface">
          <h2>Add Vehicle Inventory</h2>
          <p className="section-copy">
            Configure stock and itemized on-road pricing. Official vehicle catalogue images are centrally managed by the platform administrator; inventory records define dealership variant, color, stock, and exact price components.
          </p>

          <form className="inventory-form" onSubmit={submitInventory}>
            <fieldset>
              <legend>Vehicle Specification</legend>
              <label>
                Car Model *
                <select
                  required
                  value={form.carModelId}
                  onChange={(e) => setForm({ ...form, carModelId: e.target.value })}
                >
                  <option value="">Select a catalogue model</option>
                  {data.cars.map((car) => (
                    <option key={car.carModelId} value={car.carModelId}>
                      {car.brand} {car.model}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Variant *
                <input
                  required
                  placeholder="e.g. VXi AMT, Alpha 4WD"
                  value={form.variant}
                  onChange={(e) => setForm({ ...form, variant: e.target.value })}
                />
              </label>

              <label>
                Color *
                <input
                  required
                  placeholder="e.g. Arctic White, Magma Grey"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                />
              </label>
            </fieldset>

            <fieldset>
              <legend>Stock Allocation</legend>
              <label>
                Total Units Allocated *
                <input
                  min="0"
                  required
                  type="number"
                  value={form.totalUnits}
                  onChange={(e) => setForm({ ...form, totalUnits: e.target.value })}
                />
              </label>

              <label>
                Available Units *
                <input
                  min="0"
                  required
                  type="number"
                  value={form.availableUnits}
                  onChange={(e) => setForm({ ...form, availableUnits: e.target.value })}
                />
              </label>
            </fieldset>

            <fieldset className="pricing-fields">
              <legend>Pricing Breakdown (INR)</legend>
              {[
                ["exShowroom", "Ex-showroom price *"],
                ["insurance", "Insurance charges"],
                ["rto", "RTO / registration charges"],
                ["accessories", "Accessories / other charges"],
                ["discount", "Dealership discount"],
              ].map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    min="0"
                    step="0.01"
                    required
                    type="number"
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                  />
                </label>
              ))}
            </fieldset>

            <aside className="pricing-preview">
              <div className="w-full h-32 rounded overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                <VehicleImage
                  src={selectedCar?.imageUrl}
                  alt={selectedCar ? `${selectedCar.brand} ${selectedCar.model}` : "Vehicle preview"}
                />
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-700">Official Model Imagery</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {selectedCar
                    ? `${selectedCar.brand} ${selectedCar.model} (Admin-managed catalogue image)`
                    : "Select a car model to view catalogue image."}
                </p>
              </div>

              <PriceBreakdown pricing={draftPricing} title="Estimated On-Road Total" />
              <p className="text-[11px] text-slate-500">
                Authoritative on-road total is verified and calculated by the backend.
              </p>
            </aside>

            <div className="col-span-full mt-2">
              <button className="primary-action" type="submit">
                Add Inventory Record
              </button>
            </div>
          </form>
        </section>

        {/* My Inventory Section */}
        <section className="surface">
          <h2>My Active Inventory ({data.inventory.length})</h2>
          <div className="inventory-grid">
            {data.inventory.map((item) => (
              <article className="inventory-card" key={item.inventoryId}>
                <div className="w-full h-28 rounded overflow-hidden bg-slate-100 flex items-center justify-center">
                  <VehicleImage
                    src={item.carModel?.imageUrl}
                    alt={`${item.carModel?.brand} ${item.carModel?.model}`}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-start">
                    <h3>
                      {item.carModel?.brand} {item.carModel?.model}
                    </h3>
                    <button
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                        item.active
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                      onClick={() =>
                        run(
                          () =>
                            dealerApi.updateInventoryStatus(token, item.inventoryId, {
                              active: !item.active,
                            }),
                          `Inventory marked ${!item.active ? "active" : "inactive"}`
                        )
                      }
                    >
                      {item.active ? "Active" : "Inactive"}
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 mt-1">
                    Variant: <strong>{item.variant}</strong> · Color: <strong>{item.color}</strong>
                  </p>
                  <p
                    className={
                      item.active && item.availableUnits > 0
                        ? "availability active text-xs mt-1"
                        : "availability text-xs mt-1 text-slate-400"
                    }
                  >
                    Stock: {item.availableUnits} / {item.totalUnits} units available
                  </p>

                  <PriceBreakdown pricing={item} compact />
                </div>
              </article>
            ))}
            {data.inventory.length === 0 && (
              <p className="empty-state">No inventory records added yet.</p>
            )}
          </div>
        </section>

        {/* Eligible Queue Entries */}
        <section className="surface">
          <div className="border-b border-slate-200 pb-3">
            <h2>Eligible Queue Customers ({data.entries.length})</h2>
            <p className="section-copy">
              Customers waiting in your dealership's city for models and variants you currently stock. Make a personalized offer with competitive pricing.
            </p>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {data.entries.map((entry) => (
              <OfferForm
                key={entry.entryId}
                entry={entry}
                inventory={data.inventory}
                token={token}
                run={run}
              />
            ))}
            {data.entries.length === 0 && (
              <p className="empty-state">No matching queue entries found in your region right now.</p>
            )}
          </div>
        </section>

        {/* Offers & Bookings */}
        <section className="surface">
          <h2>Tendered Offers & Confirmed Bookings</h2>

          <div className="mt-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Recent Offers Sent ({data.offers.length})
            </h3>
            <div className="divide-y divide-slate-100">
              {data.offers.map((offer) => (
                <OfferRow key={offer.offerId} offer={offer} token={token} run={run} />
              ))}
              {data.offers.length === 0 && (
                <p className="empty-state">No offers submitted yet.</p>
              )}
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-200">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Dealership Bookings ({data.bookings.length})
            </h3>
            <div className="space-y-3">
              {data.bookings.map((booking) => (
                <div
                  key={booking.bookingId}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-slate-900 font-bold">
                        {booking.inventory?.carModel?.brand} {booking.inventory?.carModel?.model}
                      </strong>
                      <span className="text-xs text-slate-600">
                        ({booking.inventory?.variant} · {booking.inventory?.color})
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          booking.status === "CONFIRMED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-1">
                      Customer: <strong>{booking.customer?.name}</strong> · Contact:{" "}
                      {booking.customer?.email} ({booking.customer?.phone || "No phone"}) · Date:{" "}
                      {new Date(booking.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="w-full md:w-auto">
                    <PriceBreakdown
                      pricing={booking.priceSnapshot || { totalPrice: booking.totalPrice }}
                      title="Confirmed Price Snapshot"
                      compact
                    />
                  </div>
                </div>
              ))}
              {data.bookings.length === 0 && (
                <p className="empty-state">No bookings recorded yet.</p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Pending({ onLogout, onRefresh }) {
  return (
    <main className="app-shell centered">
      <section className="surface narrow text-center p-8">
        <p className="eyebrow">Dealership Verification</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Verification Pending</h1>
        <p className="mt-3 text-sm text-slate-600">
          Your dealership account has been registered and is currently awaiting administrator verification. Once verified, you will have immediate access to inventory management, queue matching, and offer submission.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <button className="secondary-action" onClick={onRefresh}>
            Check Status
          </button>
          <button className="primary-action" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </section>
    </main>
  );
}

function MetricGrid({ data }) {
  const availableUnits = data.inventory.reduce((sum, item) => sum + (item.availableUnits || 0), 0);
  const pendingOffers = data.offers.filter((o) => o.status === "PENDING").length;
  const confirmedBookings = data.bookings.filter((b) => b.status === "CONFIRMED").length;

  return (
    <div className="metric-grid">
      <div className="metric">
        <span>Inventory Records</span>
        <strong>{data.inventory.length}</strong>
      </div>
      <div className="metric">
        <span>Available Units</span>
        <strong className="text-emerald-700">{availableUnits}</strong>
      </div>
      <div className="metric">
        <span>Pending Offers</span>
        <strong>{pendingOffers}</strong>
      </div>
      <div className="metric">
        <span>Confirmed Bookings</span>
        <strong className="text-blue-700">{confirmedBookings}</strong>
      </div>
    </div>
  );
}

function OfferForm({ entry, inventory, token, run }) {
  const [form, setForm] = useState({
    inventoryId: "",
    insurance: "0",
    rto: "0",
    accessories: "0",
    discount: "0",
  });

  const matchingInventory = inventory.filter(
    (item) =>
      item.carModelId === entry.carModel?.carModelId &&
      item.variant.toLowerCase() === entry.variant.toLowerCase() &&
      item.active &&
      item.availableUnits > 0
  );

  const selectedStock = inventory.find((item) => item.inventoryId === form.inventoryId);

  // Auto-populate initial charges when stock is selected
  const handleStockSelect = (invId) => {
    const item = inventory.find((i) => i.inventoryId === invId);
    if (item) {
      setForm({
        inventoryId: invId,
        insurance: item.insurance?.toString() || "0",
        rto: item.rto?.toString() || "0",
        accessories: item.accessories?.toString() || "0",
        discount: item.discount?.toString() || "0",
      });
    } else {
      setForm({ ...form, inventoryId: invId });
    }
  };

  const pricingPreview = {
    exShowroom: selectedStock?.exShowroom || 0,
    insurance: Number(form.insurance) || 0,
    rto: Number(form.rto) || 0,
    accessories: Number(form.accessories) || 0,
    discount: Number(form.discount) || 0,
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.inventoryId) return;

    run(
      () =>
        dealerApi.createOffer(token, {
          queueEntryId: entry.entryId,
          inventoryId: form.inventoryId,
          insurance: Number(form.insurance),
          rto: Number(form.rto),
          accessories: Number(form.accessories),
          discount: Number(form.discount),
        }),
      "Offer sent to customer"
    );
  };

  return (
    <form className="offer-form py-4" onSubmit={submit}>
      <div>
        <h3 className="text-slate-900 font-bold">
          {entry.carModel?.brand} {entry.carModel?.model}
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Variant: <strong>{entry.variant}</strong> · City: <strong>{entry.city}</strong>
        </p>
        <p className="text-xs text-slate-500">
          Color preference:{" "}
          <strong className="text-slate-700">{entry.colorPreference || "Any Color"}</strong>
        </p>
        {entry.position && (
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded mt-1 inline-block">
            Position: #{entry.position} in line
          </span>
        )}
      </div>

      <label>
        Matching Stock *
        <select
          required
          value={form.inventoryId}
          onChange={(e) => handleStockSelect(e.target.value)}
        >
          <option value="">Choose inventory</option>
          {matchingInventory.map((item) => (
            <option value={item.inventoryId} key={item.inventoryId}>
              {item.color} · {item.availableUnits} units · {formatInr(item.estimatedTotalPrice)}
            </option>
          ))}
        </select>
      </label>

      {[
        ["insurance", "Insurance"],
        ["rto", "RTO / Reg."],
        ["accessories", "Accessories"],
        ["discount", "Discount"],
      ].map(([key, label]) => (
        <label key={key}>
          {label}
          <input
            min="0"
            step="0.01"
            type="number"
            value={form[key]}
            onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          />
        </label>
      ))}

      <div className="col-span-full md:col-span-2 flex flex-col justify-end">
        <PriceBreakdown pricing={pricingPreview} title="Customer Quote Preview" compact />
        <button
          className="primary-action mt-2 w-full text-xs"
          disabled={!form.inventoryId || matchingInventory.length === 0}
        >
          Tender Quote
        </button>
      </div>
    </form>
  );
}

function OfferRow({ offer, token, run }) {
  const [discount, setDiscount] = useState(offer.discount);

  return (
    <div className="offer-row py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h3 className="text-slate-900 font-bold">
            {offer.queueEntry?.queue?.carModel?.brand} {offer.queueEntry?.queue?.carModel?.model}
          </h3>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
              offer.status === "PENDING"
                ? "bg-amber-100 text-amber-800"
                : offer.status === "ACCEPTED"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {offer.status}
          </span>
        </div>

        <p className="text-xs text-slate-500 mt-1">
          Customer: <strong>{offer.queueEntry?.user?.name || "Customer"}</strong> · Variant:{" "}
          {offer.queueEntry?.queue?.variant} · Color: {offer.inventory?.color}
        </p>

        <PriceBreakdown pricing={offer} title="Offer Breakdown" compact />
      </div>

      {offer.status === "PENDING" && (
        <div className="flex items-end gap-2">
          <label className="text-xs font-semibold text-slate-600">
            Adjust Discount (INR)
            <input
              min="0"
              step="0.01"
              type="number"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="mt-1 w-28 text-xs rounded border border-slate-300 bg-white px-2 py-1"
            />
          </label>
          <button
            className="secondary-action text-xs"
            onClick={() =>
              run(
                () =>
                  dealerApi.updateOffer(token, offer.offerId, {
                    discount: Number(discount),
                  }),
                "Offer price updated"
              )
            }
          >
            Update Quote
          </button>
        </div>
      )}
    </div>
  );
}
