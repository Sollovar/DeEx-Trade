import { Router } from "express";
import { hub } from "../websocket/hub";

const router = Router();

router.get("/ws/status", (_req, res) => {
  res.json({
    status: "ok",
    clients: hub.clientCount(),
  });
});

export default router;
