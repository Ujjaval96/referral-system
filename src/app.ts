import express from "express";
import apiRouter from "./api";
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());
app.use("/", apiRouter);

export default app;
