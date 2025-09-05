import { Router } from "express";
import userRouter from "./userRouter";

const apiRouter = Router();
apiRouter.use("/", userRouter);

export default apiRouter;
