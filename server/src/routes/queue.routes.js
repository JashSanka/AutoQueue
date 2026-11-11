const express = require("express");
const router = express.Router();

const {
    joinQueue,
    getMyQueues,
    getQueueDetails,
    getQueuePosition,
    leaveQueue,
} = require("../controllers/queue.controller");
const authenticate = require("../middleware/authenticate");
const authorize = require("../middleware/authorize");

// IMPORTANT: Static routes must be declared BEFORE parameterized routes
// to prevent Express matching "join" or "my" as :queueId

router.post("/join", authenticate, authorize("CUSTOMER"), joinQueue);
router.get("/my", authenticate, authorize("CUSTOMER"), getMyQueues);
router.get("/:queueId", authenticate, authorize("CUSTOMER"), getQueueDetails);
router.get("/:queueId/position", authenticate, authorize("CUSTOMER"), getQueuePosition);
router.delete("/:queueId/leave", authenticate, authorize("CUSTOMER"), leaveQueue);

module.exports = router;

