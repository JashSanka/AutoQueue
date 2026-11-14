import { api } from "./client";

export const customerApi = {
  cars: (token) => api("/cars", { token }),
  inventory: (token) => api("/inventory", { token }),
  queues: (token) => api("/queues/my", { token }),
  bookings: (token) => api("/bookings/my", { token }),
  offers: (token, queueId) => api(`/offers/queue/${queueId}`, { token }),
  joinQueue: (token, values) => api("/queues/join", { token, method: "POST", body: values }),
  leaveQueue: (token, queueId) => api(`/queues/${queueId}/leave`, { token, method: "DELETE" }),
  acceptOffer: (token, offerId) => api(`/bookings/accept/${offerId}`, { token, method: "POST" }),
  rejectOffer: (token, offerId) => api(`/offers/${offerId}/reject`, { token, method: "PATCH" }),
  cancelBooking: (token, bookingId) => api(`/bookings/${bookingId}/cancel`, { token, method: "PATCH" }),
};

export const dealerApi = {
  cars: (token) => api("/cars", { token }),
  inventory: (token) => api("/inventory/my", { token }),
  offers: (token) => api("/offers/my", { token }),
  eligibleEntries: (token) => api("/offers/eligible-entries", { token }),
  bookings: (token) => api("/bookings/dealer/my", { token }),
  createInventory: (token, values) => api("/inventory", { token, method: "POST", body: values }),
  updateInventory: (token, id, values) => api(`/inventory/${id}`, { token, method: "PATCH", body: values }),
  updateInventoryStatus: (token, id, values) => api(`/inventory/${id}/status`, { token, method: "PATCH", body: values }),
  uploadInventoryImage: (token, id, imageDataUrl) => api(`/inventory/${id}/image`, { token, method: "PATCH", body: { imageDataUrl } }),
  createOffer: (token, values) => api("/offers", { token, method: "POST", body: values }),
  updateOffer: (token, id, values) => api(`/offers/${id}`, { token, method: "PATCH", body: values }),
};

export const adminApi = {
  dealers: (token) => api("/admin/dealers", { token }),
  verifyDealer: (token, dealerId) => api(`/admin/dealers/${dealerId}/verify`, { token, method: "PATCH" }),
  cars: (token) => api("/cars", { token }),
  createCar: (token, values) => api("/cars", { token, method: "POST", body: values }),
  updateCar: (token, id, values) => api(`/cars/${id}`, { token, method: "PATCH", body: values }),
  deleteCar: (token, id) => api(`/cars/${id}`, { token, method: "DELETE" }),
};
