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
  const [modalVariant, setModalVariant] = useState("");
  const [modalCity, setModalCity] = useState("Delhi");
  const [modalColor, setModalColor] = useState("");

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

  const openJoinModalFromInventory = (item) => {
    setJoinModal({
      carModelId: item.carModelId,
      brand: item.carModel?.brand || "Vehicle",
      model: item.carModel?.model || "Model",
      imageUrl: item.carModel?.imageUrl,
    });
    setModalVariant(item.variant || "");
    setModalCity(item.dealer?.city || "Delhi");
    setModalColor(item.color || "");
  };

  const openJoinModalFromCar = (car) => {
    // Check if any inventory exists to pre-suggest city/variant
    const existingStock = data.inventory.find((i) => i.carModelId === car.carModelId);
    setJoinModal({
      carModelId: car.carModelId,
      brand: car.brand,
      model: car.model,
      imageUrl: car.imageUrl,
    });
    setModalVariant(existingStock?.variant || "Standard");
    setModalCity(existingStock?.dealer?.city || "Delhi");
    setModalColor(existingStock?.color || "");
  };

  const handleJoinQueueSubmit = (e) => {
    e.preventDefault();
    if (!joinModal) return;

    action(
      () =>
        customerApi.joinQueue(token, {
          carModelId: joinModal.carModelId,
          variant: modalVariant.trim(),
          city: modalCity.trim(),
          colorPreference: modalColor.trim() || undefined,
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
              {pendingOffers.map((offer) => {
                const offerCarModel = offer.queueEntry?.queue?.carModel;
                return (
                  <div key={offer.offerId} className="p-4 rounded-xl border border-amber-200 bg-white shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex gap-4">
                        <div className="w-24 h-20 rounded overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
                          <VehicleImage
                            src={offerCarModel?.imageUrl}
                            alt={`${offerCarModel?.brand} ${offerCarModel?.model}`}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div>
                              <strong className="text-base text-slate-900 font-bold">
                                {offerCarModel?.brand} {offerCarModel?.model}
                              </strong>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Dealer: <strong>{offer.dealer?.dealerName}</strong> ({offer.dealer?.city})
                              </p>
                              <p className="text-xs text-slate-500">
                                Variant: {offer.queueEntry?.queue?.variant} · Color: {offer.inventory?.color}
                              </p>
                            </div>
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold uppercase">
                              Pending
                            </span>
                          </div>
                        </div>
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
                );
              })}
            </div>
          </section>
        )}

        {/* 1. Official Vehicle Catalogue & Imagery */}
        <section className="surface">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
            <div>
              <h2>Official Vehicle Catalogue ({data.cars.length})</h2>
              <p className="section-copy">
                Official catalogue vehicle photographs are managed centrally by platform administrators. You can join transparent regional queues for any model.
              </p>
            </div>
            <div>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search catalogue models…"
                className="w-full sm:w-64 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mt-5">
            {visibleCars.map((car) => {
              const stockItems = data.inventory.filter((i) => i.carModelId === car.carModelId);
              const totalStock = stockItems.reduce((acc, i) => acc + (i.availableUnits || 0), 0);

              return (
                <article
                  key={car.carModelId}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    <div className="w-full h-40 bg-slate-100 overflow-hidden flex items-center justify-center">
                      <VehicleImage
                        src={car.imageUrl}
                        alt={`${car.brand} ${car.model}`}
                      />
                    </div>

                    <div className="p-3.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[11px] font-bold tracking-wider uppercase text-blue-600">{car.brand}</p>
                          <h3 className="text-base font-bold text-slate-900 leading-tight mt-0.5">{car.model}</h3>
                        </div>
                        {car.imageUrl ? (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">
                            Official Photo
                          </span>
                        ) : (
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold">
                            Standard
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 mt-2">
                        {totalStock > 0 ? (
                          <span className="text-emerald-700 font-semibold">
                            ● {totalStock} unit(s) available in region
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            ○ Pre-order queue open
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="p-3.5 pt-0">
                    <button
                      className="primary-action w-full text-xs"
                      onClick={() => openJoinModalFromCar(car)}
                    >
                      Join Waiting Queue
                    </button>
                  </div>
                </article>
              );
            })}
            {visibleCars.length === 0 && (
              <p className="empty-state col-span-full">No vehicles match your search.</p>
            )}
          </div>
        </section>

        {/* 2. Available Dealer Inventory & On-Road Pricing */}
        <section className="surface">
          <div className="border-b border-slate-200 pb-3">
            <h2>Available Dealership Stock & Itemized Pricing ({data.inventory.length})</h2>
            <p className="section-copy">
              Vehicles ready for delivery at authorized dealerships. Prices include full on-road estimates (ex-showroom, insurance, RTO, accessories, and dealer discount).
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
                    onClick={() => openJoinModalFromInventory(item)}
                  >
                    Join Queue for this Vehicle
                  </button>
                </div>
              </article>
            ))}
            {visibleInventory.length === 0 && (
              <p className="empty-state col-span-full">
                No matching dealer stock found. Check the catalogue above to pre-order or join a waiting queue.
              </p>
            )}
          </div>
        </section>

        {/* 3. My Active Waiting Queues */}
        <section className="surface">
          <h2>My Centralized Waiting Queues ({data.queues.length})</h2>
          <p className="section-copy">
            Transparent FIFO waiting lists. Dealers review customer queues and send direct on-road quotes as vehicles allocate.
          </p>

          <div className="mt-4 divide-y divide-slate-100">
            {data.queues.map((entry) => {
              const carModel = data.cars.find((c) => c.carModelId === entry.carModelId);
              const carImg = entry.imageUrl || carModel?.imageUrl;

              return (
                <div key={entry.entryId} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-12 rounded overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
                      <VehicleImage
                        src={carImg}
                        alt={`${entry.brand} ${entry.model}`}
                      />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 font-bold">
                          {entry.brand} {entry.model}
                        </strong>
                        <span className="text-xs text-slate-600">
                          ({entry.variant} · {entry.city})
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            entry.status === "WAITING"
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
                        <span className="font-bold text-blue-700">#{entry.position || 1}</span> · Joined: {new Date(entry.joinedAt || entry.createdAt).toLocaleDateString()}
                      </p>
                    </div>
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
              );
            })}
            {data.queues.length === 0 && (
              <p className="empty-state">You have not joined any vehicle queues yet. Explore the catalogue or inventory above to join.</p>
            )}
          </div>
        </section>

        {/* 4. Booking History & Irrevocable Price Snapshots */}
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
                <div className="flex gap-4 items-start">
                  <div className="w-24 h-20 rounded overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
                    <VehicleImage
                      src={booking.inventory?.carModel?.imageUrl}
                      alt={`${booking.inventory?.carModel?.brand} ${booking.inventory?.carModel?.model}`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <strong className="text-base text-slate-900 font-bold">
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
            <div className="flex items-center gap-3 mb-4">
              <div className="w-16 h-12 rounded overflow-hidden bg-slate-100 shrink-0 flex items-center justify-center">
                <VehicleImage src={joinModal.imageUrl} alt={`${joinModal.brand} ${joinModal.model}`} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 leading-tight">
                  Join Waiting Queue
                </h3>
                <p className="text-xs text-slate-500">
                  {joinModal.brand} {joinModal.model}
                </p>
              </div>
            </div>

            <form className="space-y-3" onSubmit={handleJoinQueueSubmit}>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Variant *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VXi, Alpha, SX(O)"
                  value={modalVariant}
                  onChange={(e) => setModalVariant(e.target.value)}
                  className="w-full text-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  City / Region *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Delhi, Mumbai, Pune, Bengaluru"
                  value={modalCity}
                  onChange={(e) => setModalCity(e.target.value)}
                  className="w-full text-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preferred Exterior Color (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pearl White, Magma Grey, or leave blank for Any"
                  value={modalColor}
                  onChange={(e) => setModalColor(e.target.value)}
                  className="w-full text-xs rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Regional dealers review active queues and submit quotes matching your preference.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 mt-4">
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
