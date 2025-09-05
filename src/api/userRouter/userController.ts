import { NextFunction, Request, response, Response } from "express";
import { Transaction as SequelizeTransaction } from "sequelize";
import UserModel from './userModel';
const userModel: UserModel = new UserModel();
import { isValidEmail, isStrongPassword } from "../../utils/validate";
import sequelize from "../../db"; // your sequelize instance
// import User from "../../models/User";
// import Wallet from "../models/Wallet";
// import Transaction from "../models/Transaction";
import { DepositPayload, SignupPayload, LoginPayload} from "./payloads";
import { JwtAuthPayload } from "../../utils/types";

class UserController {
  sendHttpResponse(
    res: Response,
    serverResponse:
      | { data?: unknown; error?: unknown; code?: number; message?: string }
      | Error
  ): void {
    if (serverResponse instanceof Error) {
      res.status(500).json({
        error: serverResponse.message,
        message: "Internal Server Error",
      });
      return;
    }

    const { data, error, code, message } = serverResponse as {
      data?: unknown;
      error?: unknown;
      code?: number;
      message?: string;
    };

    if (error) {
      res.status(code || 422).json({ error, message });
      return;
    }

    if (data === undefined || data === null) {
      res.status(204).send();
      return;
    }

    res.status(200).json({ data, message });
  }
  signup = async (req: Request, res: Response): Promise<void> => {
    try {
      const { name, email, password, referralId } = req.body as SignupPayload;
      if (!name || typeof name !== "string" || !name.trim()) {
        return this.sendHttpResponse(res, {
          error: "Name is required",
          code: 400,
        });
      }
      if (!email || typeof email !== "string" || !email.trim() ||(!isValidEmail(email))) {
        return this.sendHttpResponse(res, {
          error: "Valid email is required",
          code: 400,
        });
      }
      if (!password || typeof password !== "string" || password.trim().length < 8 ||(!isStrongPassword(password))) {
        return this.sendHttpResponse(res, {
          error:"Password must be at least 8 characters long, include uppercase, lowercase, number, and special character",
          code: 400,
        });
      }
      if (referralId && isNaN(Number(referralId))) {
        return this.sendHttpResponse(res, {
          error: "Invalid referral ID",
          code: 400,
        });
      }

      const result = await userModel.signup(
        name.trim(),
        email.trim(),
        password.trim(),
        referralId ? Number(referralId) : undefined
      );

      return this.sendHttpResponse(res, result);
    } catch (error) {
      return this.sendHttpResponse(res, error instanceof Error ? error : new Error(String(error)));
    }
  };
  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body as LoginPayload;
      if (!email || typeof email !== "string" || !email.trim() || (!isValidEmail(email))) {
        return this.sendHttpResponse(res, {
          error: "Valid email is required",
          code: 400,
        });
      }
      if (!password || typeof password !== "string" || password.trim().length < 8 ||(!isStrongPassword(password))) {
        return this.sendHttpResponse(res, {
          error: "Password must be at least 8 characters long, include uppercase, lowercase, number, and special character",
          code: 400,
        });
      }
      const result = await userModel.login(email.trim(), password.trim());
      return this.sendHttpResponse(res, result);
    } catch (error) {
      return this.sendHttpResponse(res, error instanceof Error ? error : new Error(String(error)));
    }
  };
  totalamount=async(req :Request ,res: Response):Promise<void> =>{
    try {
      const args = req.body as JwtAuthPayload;

    if (!args._uid) {
      return this.sendHttpResponse(res, {
        message: "Unauthorized",
        error: "NO_USER_ID",
        code: 401,
      });
    }

      const totalAmount = await userModel.getUserTotalAmount(args._uid);

      return this.sendHttpResponse(res, {
        data: { totalAmount },
        message: "Total amount fetched successfully",
      });
    } catch (error) {
      if (error instanceof Error && error.message) {
        return this.sendHttpResponse(res, {
          error: error.message,
          message: "INTERNAL_SERVER_ERROR",
          code: 409,
        });
      } else {
        return this.sendHttpResponse(res, {
          error,
          message: "INTERNAL_SERVER_ERROR",
          code: 500,
        });
      }
    }
  };
  deposit = async (req: Request, res: Response): Promise<void> => {
    try {
      const args: DepositPayload = req.body;

      if (!args.amount || isNaN(args.amount) || args.amount <= 0) {
        return this.sendHttpResponse(res, {
          message: "Invalid deposit amount",
          error: "INVALID_AMOUNT",
          code: 400,
        });
      }
      const response = await userModel.deposit(args);

      return this.sendHttpResponse(res, response);
    } catch (error) {
      if (error instanceof Error && error.message) {
        return this.sendHttpResponse(res, {
          error: error.message,
          message: "INTERNAL_SERVER_ERROR",
          code: 409,
        });
      } else {
        return this.sendHttpResponse(res, {
          error,
          message: "INTERNAL_SERVER_ERROR",
          code: 500,
        });
      }
    }
  };
}
export default UserController;
