import { Router, type IRouter } from "express";
import healthRouter from "./health";
import downloadsRouter from "./downloads";
import settingsRouter from "./settings";
import streamRouter from "./stream";

const router: IRouter = Router();

router.use(healthRouter);
router.use(downloadsRouter);
router.use(settingsRouter);
router.use(streamRouter);

export default router;
