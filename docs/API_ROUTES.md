# API route inventory

All routes are mounted by `server/src/server.js`. Authentication means a `Bearer` JWT. There are 34 API routes (plus `GET /health`). No current frontend screen calls the diagnostic auth routes.

## Authentication

|Method|Endpoint|Purpose|Auth / roles|Parameters|Success / notable errors|
|---|---|---|---|---|---|
|POST|`/api/auth/register`|Register a customer or dealer|Public|`name,email,password,phone,role`; dealer also `dealerName,city,address`|201; 400, 409|
|POST|`/api/auth/login`|Issue JWT|Public|`email,password`|200; 400, 401, 403|
|GET|`/api/auth/me`|Current profile|JWT / all|—|200; 401|
|GET|`/api/auth/admin-test`|Admin diagnostic|JWT / ADMIN|—|200; 401, 403|
|GET|`/api/auth/dealer-test`|Verified-dealer diagnostic|JWT / verified DEALER|—|200; 401, 403|

## Catalogue and administration

|Method|Endpoint|Purpose|Auth / roles|Parameters|Success / notable errors|
|---|---|---|---|---|---|
|POST|`/api/cars`|Create car model|JWT / ADMIN|`brand,model,imageUrl?`|201; 400,409|
|GET|`/api/cars`|List catalogue|JWT / all|—|200|
|GET|`/api/cars/:carModelId`|Get car model|JWT / all|UUID path param|200;400,404|
|PATCH|`/api/cars/:carModelId`|Update car model|JWT / ADMIN|UUID; mutable catalogue fields|200;400,404,409|
|DELETE|`/api/cars/:carModelId`|Delete unreferenced car model|JWT / ADMIN|UUID|200;400,404,409|
|PATCH|`/api/admin/dealers/:dealerId/verify`|Verify dealership|JWT / ADMIN|dealer UUID|200;400,404,409|

## Inventory

|Method|Endpoint|Purpose|Auth / roles|Parameters|Success / notable errors|
|---|---|---|---|---|---|
|GET|`/api/inventory`|Browse inventory|JWT / all|supported query filters|200|
|POST|`/api/inventory`|Add dealership inventory|JWT / verified DEALER|pricing, model, variant, color, unit fields|201;400,403,409|
|GET|`/api/inventory/my`|Dealer inventory|JWT / verified DEALER|—|200|
|GET|`/api/inventory/:inventoryId`|Dealer-owned inventory item|JWT / verified DEALER|UUID|200;400,403,404|
|PATCH|`/api/inventory/:inventoryId`|Update dealer-owned inventory|JWT / verified DEALER|UUID; allowed inventory fields|200;400,403,404,409|
|PATCH|`/api/inventory/:inventoryId/status`|Toggle owned inventory active state|JWT / verified DEALER|UUID; `active`|200;400,403,404|

## Queues

|Method|Endpoint|Purpose|Auth / roles|Parameters|Success / notable errors|
|---|---|---|---|---|---|
|POST|`/api/queues/join`|Join/rejoin eligible queue|JWT / CUSTOMER|`carModelId,variant,city,preferredDealerId?,colorPreference?,maxBudget?`|201;400,404,409|
|GET|`/api/queues/my`|Customer queue history|JWT / CUSTOMER|—|200|
|GET|`/api/queues/:queueId`|Owned queue detail and position|JWT / CUSTOMER|UUID|200;400,404|
|GET|`/api/queues/:queueId/position`|Owned FIFO position|JWT / CUSTOMER|UUID|200;400,404|
|DELETE|`/api/queues/:queueId/leave`|Leave active queue|JWT / CUSTOMER|UUID|200;400,404,409|

## Offers

|Method|Endpoint|Purpose|Auth / roles|Parameters|Success / notable errors|
|---|---|---|---|---|---|
|GET|`/api/offers/eligible-entries`|Dealer eligible entries|JWT / verified DEALER|—|200|
|GET|`/api/offers/my`|Dealer offers|JWT / verified DEALER|—|200|
|POST|`/api/offers`|Create offer|JWT / verified DEALER|entry/inventory IDs and pricing components|201;400,403,404,409|
|PATCH|`/api/offers/:offerId`|Reprice pending own offer|JWT / verified DEALER|UUID; selected price components|200;400,403,404,409|
|GET|`/api/offers/queue/:queueId`|Customer offers for owned queue|JWT / CUSTOMER|queue UUID|200;400,404|
|GET|`/api/offers/:offerId`|Customer owned offer|JWT / CUSTOMER|offer UUID|200;400,403,404|
|PATCH|`/api/offers/:offerId/reject`|Reject pending owned offer|JWT / CUSTOMER|offer UUID|200;400,403,404,409|

## Bookings

|Method|Endpoint|Purpose|Auth / roles|Parameters|Success / notable errors|
|---|---|---|---|---|---|
|POST|`/api/bookings/accept/:offerId`|Accept owned, valid offer|JWT / CUSTOMER|offer UUID|201;400,403,404,409|
|GET|`/api/bookings/my`|Customer booking history|JWT / CUSTOMER|—|200|
|GET|`/api/bookings/dealer/my`|Dealer booking history|JWT / verified DEALER|—|200|
|GET|`/api/bookings/:bookingId`|Owned booking detail|JWT / CUSTOMER or DEALER; ownership required|UUID|200;400,403,404|
|PATCH|`/api/bookings/:bookingId/cancel`|Cancel owned confirmed booking|JWT / CUSTOMER or verified owning DEALER|UUID|200;400,403,404,409|

The web UI uses auth, catalogue browsing, inventory browsing, customer queues/offers/bookings, and dealer summary endpoints. It does not currently provide forms for every existing dealer mutation or the admin verification endpoint; no frontend function lacks a backend endpoint.
