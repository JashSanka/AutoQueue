import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import { customerApi } from "../api/autoqueue";
import VehicleImage from "../components/common/VehicleImage";
import PriceBreakdown from "../components/common/PriceBreakdown";
import { formatInr } from "../utils/formatters";

export default function CustomerDashboard() {
  const { user, token, logout } = useAuth();
  const [data, setData] = useState({
    cars: [],
    inventory: [],
    queues: [],
    bookings: [],
    offers: [],
  });
  const [message, setMessage] = useState("Loading customer workspace…");
  const [messageType, setMessageType] = useState("info");
  const [search, setSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Join Queue Modal State
  const [joinModal, setJoinModal] = useState(null); // { carModelId, brand, model, variant, city, color } | null
  const [colorPreference, setColorPreference] = useState("");

  const notify = (msg, type = "info") => {
    setMessage(msg);
    setMessageType(type);
  };

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [cars, inventory, queues, bookings] = await Promise.all([
        customerApi.cars(token),
        customerApi.inventory(token),
        customerApi.queues(token),
        customerApi.bookings(token),
      ]);

      const entries = queues.entries || [];
      const offerResponses = await Promise.all(
        entries.map((entry) =>
          customerApi.offers(token, entry.queueId).catch(() => ({ offers: [] }))
        )
      );

      setData({
        cars: cars.cars || [],
        inventory: inventory.inventory || [],
        queues: entries,
        bookings: bookings.bookings || [],
        offers: offerResponses.flatMap((item) => item.offers || []),
      });
      notify("Workspace updated just now", "info");
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

  const action = async (request, successMsg = "Operation completed successfully") => {
    try {
      await request();
      notify(successMsg, "success");
      await refresh();
    } catch (error) {
      notify(error.message, "error");
    }
  };

  const openJoinModal = (item) => {
    setJoinModal({
      carModelId: item.carModelId,
      brand: item.carModel?.brand || "Vehicle",
      model: item.carModel?.model || "Model",
      variant: item.variant,
      city: item.dealer?.city || "Delhi",
      imageUrl: item.carModel?.imageUrl,
    });
    setColorPreference(item.color || "");
  };

  const openJoinModalFromCar = (car) => {
    const existingStock = data.inventory.find((i) => i.carModelId === car.carModelId);
    setJoinModal({
      carModelId: car.carModelId,
      brand: car.brand,
      model: car.model,
      variant: existingStock?.variant || "Standard",
      city: existingStock?.dealer?.city || "Delhi",
      imageUrl: car.imageUrl,
    });
    setColorPreference(existingStock?.color || "");
  };

  const handleJoinQueueSubmit = (e) => {
    e.preventDefault();
    if (!joinModal) return;

    action(
      () =>
        customerApi.joinQueue(token, {
          carModelId: joinModal.carModelId,
          variant: joinModal.variant,
          city: joinModal.city,
          colorPreference: colorPreference.trim() || undefined,
        }),
      `Joined waiting queue for ${joinModal.brand} ${joinModal.model}`
    );
    setJoinModal(null);
  };

  const visibleCars = data.cars.filter((car) =>
    `${car.brand} ${car.model}`.toLowerCase().includes(search.toLowerCase())
  );

  const visibleInventory = data.inventory.filter((item) =>
    `${item.carModel?.brand} ${item.carModel?.model} ${item.variant} ${item.color} ${item.dealer?.city}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const activeQueues = data.queues.filter((entry) =>
    ["WAITING", "OFFERED"].includes(entry.status)
  );
  const pendingOffers = data.offers.filter((offer) => offer.status === "PENDING");
  const confirmedBookings = data.bookings.filter((b) => b.status === "CONFIRMED");

  return (
    <main className="app-shell">
      {/* Top Header */}
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Customer Portal</p>
          <h1>{user?.name || "Customer"}</h1>
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
            className={`p-3 rounded-lg text-sm border ${messageType === "error"
              ? "bg-red-50 text-red-800 border-red-200"
              : messageType === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-blue-50 text-blue-800 border-blue-200"
              }`}
          >
            {message}
          </div>
        )}

        {/* Metric Cards */}
        <div className="metric-grid">
          <div className="metric">
            <span>Catalogue Models</span>
            <strong>{data.cars.length}</strong>
          </div>
          <div className="metric">
            <span>Active Queues</span>
            <strong>{activeQueues.length}</strong>
          </div>
          <div className="metric">
            <span>Pending Dealer Offers</span>
            <strong className={pendingOffers.length > 0 ? "text-amber-600" : ""}>
              {pendingOffers.length}
            </strong>
          </div>
          <div className="metric">
            <span>Confirmed Bookings</span>
            <strong className="text-emerald-700">{confirmedBookings.length}</strong>
          </div>
          <div className="metric">
            <span>Available Regional Stock</span>
            <strong>{data.inventory.length}</strong>
          </div>
        </div>

        {/* Pending Dealer Offers */}
        {pendingOffers.length > 0 && (
          <section className="surface border-amber-200 bg-amber-50/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
              <h2 className="text-amber-900 font-bold">Action Required: Received Dealer Quotes ({pendingOffers.length})</h2>
            </div>
            <p className="section-copy text-amber-800">
              Verified dealerships have tendered competitive on-road pricing for your vehicle queue entries. Review pricing breakdowns and accept or reject.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {pendingOffers.map((offer) => (
                <div key={offer.offerId} className="p-4 rounded-xl border border-amber-200 bg-white shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start">
                      <div>
                        <strong className="text-base text-slate-900 font-bold">
                          {offer.dealer?.dealerName || "Regional Dealership"}
                        </strong>
                        <p className="text-xs text-slate-500">
                          City: {offer.dealer?.city || "Regional"} · Variant: {offer.queueEntry?.queue?.variant} · Color: {offer.inventory?.color}
                        </p>
                      </div>
                      <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold uppercase">
                        Pending Decision
                      </span>
                    </div>

                    <div className="mt-3">
                      <PriceBreakdown pricing={offer} title="Itemized Offer Breakdown" />
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex gap-3">
                    <button
                      className="primary-action flex-1 text-xs"
                      onClick={() =>
                        action(
                          () => customerApi.acceptOffer(token, offer.offerId),
                          "Offer accepted! Booking confirmed."
                        )
                      }
                    >
                      Accept & Confirm Booking
                    </button>
                    <button
                      className="danger-action flex-1 text-xs text-center border border-red-200 rounded-md py-1.5"
                      onClick={() =>
                        action(
                          () => customerApi.rejectOffer(token, offer.offerId),
                          "Offer rejected."
                        )
                      }
                    >
                      Reject Offer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* My Active Waiting Queues */}
        <section className="surface">
          <h2>My Centralized Waiting Queues ({data.queues.length})</h2>
          <p className="section-copy">
            Fair First-In, First-Out (FIFO) queue positions across certified regional dealerships. Dealers make direct offers to queued customers as stock allocates.
          </p>

          <div className="mt-4 divide-y divide-slate-100">
            {data.queues.map((entry) => (
              <div key={entry.entryId} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-slate-900 font-bold">
                      {entry.brand} {entry.model}
                    </strong>
                    <span className="text-xs text-slate-600">
                      ({entry.variant} · {entry.city})
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${entry.status === "WAITING"
                        ? "bg-blue-100 text-blue-800"
                        : entry.status === "OFFERED"
                          ? "bg-amber-100 text-amber-800"
                          : entry.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                    >
                      {entry.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    Preferred Color: <span className="font-semibold text-slate-700">{entry.colorPreference || "Any Color"}</span> · Position in Line:{" "}
                    <span className="font-bold text-blue-700">#{entry.position || 1}</span> · Joined: {new Date(entry.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  {["WAITING", "OFFERED"].includes(entry.status) && (
                    <button
                      className="danger-action text-xs"
                      onClick={() => {
                        if (window.confirm("Leave this vehicle waiting queue?")) {
                          action(
                            () => customerApi.leaveQueue(token, entry.queueId),
                            "Left queue successfully"
                          );
                        }
                      }}
                    >
                      Leave Queue
                    </button>
                  )}
                </div>
              </div>
            ))}
            {data.queues.length === 0 && (
              <p className="empty-state">You have not joined any vehicle queues yet. Explore available stock below to join.</p>
            )}
          </div>
        </section>

        {/* Official Vehicle Catalogue & Imagery */}
        <section className="surface">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h2>Official Vehicle Catalogue ({data.cars.length})</h2>
              <p className="section-copy">
                All models available through AutoQueue. Vehicle photographs are set by administrators. Click &ldquo;Join Queue&rdquo; to enter the FIFO waiting list for any model.
              </p>
            </div>
            <div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search brand or model…"
                className="w-full sm:w-56 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 mt-5">
            {visibleCars.map((car) => (
              <article
                key={car.carModelId}
                className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm flex flex-col"
              >
                <div className="w-full h-40 bg-slate-100 overflow-hidden flex items-center justify-center">
                  <VehicleImage
                    src={car.imageUrl}
                    alt={`${car.brand} ${car.model}`}
                  />
                </div>
                <div className="p-3 flex flex-col flex-1 justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {car.brand} {car.model}
                    </h3>
                    {car.imageUrl ? (
                      <p className="text-[10px] text-emerald-600 mt-0.5">Official photo available</p>
                    ) : (
                      <p className="text-[10px] text-slate-400 mt-0.5">No official photo yet</p>
                    )}
                  </div>
                  <button
                    className="primary-action w-full text-xs mt-3"
                    onClick={() => openJoinModalFromCar(car)}
                  >
                    Join Queue
                  </button>
                </div>
              </article>
            ))}
            {visibleCars.length === 0 && (
              <p className="empty-state col-span-full">No catalogue models found.</p>
            )}
          </div>
        </section>

        {/* Available Vehicle Inventory & Catalogue */}
        <section className="surface">
          <div className="pb-3 border-b border-slate-200">
            <h2>Browse Dealership Stock ({visibleInventory.length})</h2>
            <p className="section-copy">
              Live dealer inventory with pricing estimates. Use the search above to filter by brand, model, variant, or city.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 mt-5">
            {visibleInventory.map((item) => (
              <article key={item.inventoryId} className="vehicle-card border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-full h-48 bg-slate-100 overflow-hidden flex items-center justify-center">
                    <VehicleImage
                      src={item.carModel?.imageUrl}
                      alt={`${item.carModel?.brand} ${item.carModel?.model}`}
                    />
                  </div>

                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">
                          {item.carModel?.brand} {item.carModel?.model}
                        </h3>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Variant: <strong>{item.variant}</strong> · Color: <strong>{item.color}</strong>
                        </p>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700">
                        {item.availableUnits} in stock
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mt-1">
                      Dealership: <span className="font-semibold text-slate-700">{item.dealer?.dealerName}</span> ({item.dealer?.city})
                    </p>

                    <div className="mt-3">
                      <PriceBreakdown pricing={item} compact />
                    </div>
                  </div>
                </div>

                <div className="p-4 pt-0">
                  <button
                    className="primary-action w-full text-xs"
                    onClick={() => openJoinModal(item)}
                  >
                    Join Queue for this Vehicle
                  </button>
                </div>
              </article>
            ))}
            {visibleInventory.length === 0 && (
              <p className="empty-state col-span-full">
                No matching dealer inventory found. Catalogue models may exist without available regional stock.
              </p>
            )}
          </div>
        </section>

        {/* Booking History & Irrevocable Price Snapshots */}
        <section className="surface">
          <h2>Booking History & Price Snapshots ({data.bookings.length})</h2>
          <p className="section-copy">
            Confirmed reservations lock in the exact pricing snapshot agreed upon at offer acceptance. Dealership inventory is automatically restored (+1) if a booking is cancelled.
          </p>

          <div className="mt-4 space-y-4">
            {data.bookings.map((booking) => (
              <div
                key={booking.bookingId}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <strong className="text-base text-slate-900 font-bold">
                      {booking.inventory?.carModel?.brand} {booking.inventory?.carModel?.model}
                    </strong>
                    <span className="text-xs text-slate-600">
                      ({booking.inventory?.variant} · {booking.inventory?.color})
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${booking.status === "CONFIRMED"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-red-100 text-red-800"
                        }`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 mt-1">
                    Dealer: <strong>{booking.dealer?.dealerName || booking.inventory?.dealer?.dealerName || "Authorized Dealer"}</strong> · City: {booking.dealer?.city || booking.inventory?.dealer?.city || "N/A"} · Booking Date: {new Date(booking.createdAt).toLocaleDateString()}
                  </p>

                  <div className="mt-3">
                    <PriceBreakdown
                      pricing={booking.priceSnapshot || { totalPrice: booking.totalPrice }}
                      title="Irrevocable Booking Snapshot"
                      compact
                    />
                  </div>
                </div>

                <div>
                  {booking.status === "CONFIRMED" && (
                    <button
                      className="danger-action text-xs border border-red-200 rounded-md px-3 py-1.5"
                      onClick={() => {
                        if (window.confirm("Cancel this booking? Inventory will be released back to the dealership.")) {
                          action(
                            () => customerApi.cancelBooking(token, booking.bookingId),
                            "Booking cancelled successfully. Inventory restored."
                          );
                        }
                      }}
                    >
                      Cancel Reservation
                    </button>
                  )}
                </div>
              </div>
            ))}
            {data.bookings.length === 0 && (
              <p className="empty-state">No vehicle bookings on record.</p>
            )}
          </div>
        </section>
      </div>

      {/* Join Queue Modal */}
      {joinModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl border border-slate-200 p-6 max-w-md w-full shadow-lg">
            {joinModal.imageUrl && (
              <div className="w-full h-36 rounded-lg overflow-hidden mb-4 bg-slate-100">
                <VehicleImage
                  src={joinModal.imageUrl}
                  alt={`${joinModal.brand} ${joinModal.model}`}
                />
              </div>
            )}
            <h3 className="text-lg font-bold text-slate-900">
              Join Waiting Queue
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {joinModal.brand} {joinModal.model} ({joinModal.variant} · {joinModal.city})
            </p>

            <form className="mt-4 space-y-4" onSubmit={handleJoinQueueSubmit}>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preferred Exterior Color
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pearl White, Magma Grey, or leave blank for Any"
                  value={colorPreference}
                  onChange={(e) => setColorPreference(e.target.value)}
                  className="w-full text-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Dealers will offer vehicles that match or closely match your preference.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  className="secondary-action text-xs"
                  onClick={() => setJoinModal(null)}
                >
                  Cancel
                </button>
                <button type="submit" className="primary-action text-xs">
                  Confirm & Join Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
