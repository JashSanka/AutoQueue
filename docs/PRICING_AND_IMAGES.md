# Pricing and vehicle images

## Persisted pricing

Inventory persists `exShowroom`, `insurance`, `rto`, `accessories`, and `discount`. The backend calculates `estimatedTotalPrice` from those values. Offers persist the same itemized fields and a backend-calculated `totalPrice`; a confirmed booking stores that accepted breakdown in `priceSnapshot` and its total in `totalPrice`.

The frontend uses the same visible formula only as a live preview while the dealer types: ex-showroom + insurance + RTO/registration + accessories/other charges − discount. It submits components, never a trusted total. API responses and the booking snapshot are displayed as authoritative values.

## Images

The schema provides `CarModel.imageUrl` only. Administrators manage official catalogue images: they can specify an image URL, upload a PNG/JPEG/WebP image (up to 4 MB saved under `server/uploads`), preview imagery, replace imagery, or remove it (setting `imageUrl` to null).

Dealers cannot modify or overwrite `CarModel.imageUrl`. In accordance with the schema, inventory records do not store separate image fields and represent dealer-specific variant, color, stock, and pricing. Dealers and customers view official catalogue images with graceful fallback to `/images/vehicle-fallback.png` when an image is absent or fails to load. Image URLs persist across restarts because they are stored in `CarModel.imageUrl`. Keep the uploads directory on persistent storage when deploying.

`/images/vehicle-fallback.png` is a generated, neutral, non-model-specific fallback used only when `imageUrl` is absent or cannot load. It is not persisted as a vehicle model image and is intentionally not presented as a particular make or model. Image URLs persist across restarts because they are stored in `CarModel.imageUrl`; the fallback asset is packaged with the frontend.

## Theme

The shared stylesheet supplies a light automotive SaaS palette: off-white canvas, white surfaces, charcoal typography, deep-blue actions, neutral borders, and restrained semantic status colours. It also overrides legacy dark utility combinations so existing customer, dealer, admin, and authentication views share the same direction.
