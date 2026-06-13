import { Router, type IRouter } from "express";
import healthRouter from "./health";
import portfolioRouter from "./portfolio";
import pairsRouter from "./pairs";
import orderbookRouter from "./orderbook";
import tradesRouter from "./trades";
import ordersRouter from "./orders";
import candlesRouter from "./candles";
import wsRouter from "./ws";

const router: IRouter = Router();

router.use(healthRouter);
router.use(portfolioRouter);
router.use(pairsRouter);
router.use(orderbookRouter);
router.use(tradesRouter);
router.use(ordersRouter);
router.use(candlesRouter);
router.use(wsRouter);

export default router;
