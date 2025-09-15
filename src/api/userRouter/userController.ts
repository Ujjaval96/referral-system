import { NextFunction, Request, response, Response } from "express";
import { Transaction as SequelizeTransaction } from "sequelize";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();
import { User, Otp } from "../../models";
import UserModel from './userModel';
const userModel: UserModel = new UserModel();
import { isValidEmail, isStrongPassword } from "../../utils/validate";
import sequelize from "../../db";
// import User from "../../models/User";
// import Wallet from "../models/Wallet";
// import Transaction from "../models/Transaction";
import { DepositPayload, SignupPayload, LoginPayload ,verifyOTPPayload} from "./payloads";
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
    const { name, email, phone_number, password, referralCode } = req.body as SignupPayload;

    if (!name || typeof name !== "string" || !name.trim()) {
      return this.sendHttpResponse(res, { error: "Name is required", code: 400 });
    }

    if (!email || typeof email !== "string" || !email.trim() || !isValidEmail(email)) {
      return this.sendHttpResponse(res, { error: "Valid email is required", code: 400 });
    }

    if (!phone_number || typeof phone_number !== "string" || !phone_number.trim()) {
      return this.sendHttpResponse(res, { error: "Phone number is required", code: 400 });
    }

    if (
      !password ||
      typeof password !== "string" ||
      password.trim().length < 8 ||
      !isStrongPassword(password)
    ) {
      return this.sendHttpResponse(res, {
        error: "Password must be at least 8 characters long, include uppercase, lowercase, number, and special character",
        code: 400,
      });
    }

    const cleanReferralCode =
      referralCode && typeof referralCode === "string" && referralCode.trim()
        ? referralCode.trim()
        : undefined;

    const result = await userModel.signup(
      name.trim(),
      email.trim(),
      phone_number.trim(),
      password.trim(),
      cleanReferralCode,
    );

    return this.sendHttpResponse(res, result);
  } catch (error) {
    return this.sendHttpResponse(
      res,
      error instanceof Error ? error : new Error(String(error)),
    );
  }
};

   enable2FA = async (req: Request, res: Response): Promise<void> => {
  try {
    const args = req.body as JwtAuthPayload;

    if (!args.email) {
      return this.sendHttpResponse(res, {
        message: "Email is required",
        error: "MISSING_EMAIL",
        code: 400,
      });
    }

    const result = await userModel.enable(args.email);

    return this.sendHttpResponse(res, {
      data: result,
      message: result.message, 
    });
  } catch (error) {
    return this.sendHttpResponse(res, {
      error: error instanceof Error ? error.message : String(error),
      message: "INTERNAL_SERVER_ERROR",
      code: 500,
    });
  }
};

  verifyOTP = async (req: Request, res: Response): Promise<void> => {
    try {
      const args= req.body as verifyOTPPayload;
      console.log(args);
      if (!args.email?.trim() || !isValidEmail(args.email)) {
        return this.sendHttpResponse(res, { error: "Valid email is required", code: 400 });
      }

      if (!args.token?.trim() || args.token.trim().length !== 6 || !/^\d{6}$/.test(args.token.trim())) {
        return this.sendHttpResponse(res, { error: "Valid 6-digit OTP is required", code: 400 });
      }

      const result = await userModel.verifyUserOTP(args.email.trim(), args.token.trim());
      return this.sendHttpResponse(res, result);
    } catch (error) {
      return this.sendHttpResponse(res, { error: error instanceof Error ? error.message : String(error), code: 500 });
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
      if (!password || typeof password !== "string" || password.trim().length < 8 || (!isStrongPassword(password))) {
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
  totalamount = async (req: Request, res: Response): Promise<void> => {
    try {
      const args = req.body as JwtAuthPayload;
      console.log(args);
      if (!args.id) {
        return this.sendHttpResponse(res, {
          message: "Unauthorized",
          error: "NO_USER_ID",
          code: 401,
        });
      }

      const totalAmount = await userModel.getUserTotalAmount(args.id);

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
  generateOtp = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };
 sendVerificationCode = async (req: Request, res: Response): Promise<void> => {
  const args = { ...req.body };

  try {
    // Check if a user already exists with this phone number
    const userExists = await User.count({ where: { phoneNumber: args.mobile } });
    if (userExists !== 0) {
      this.sendHttpResponse(res, {
        error: 'User already exists with this mobile number',
        message: 'User already exists with this mobile number',
        code: 400,
      });
      return;
    }

    const generatedOtp = this.generateOtp(); 
    const existingOtp = await Otp.findOne({ where: { target: args.mobile } });

    if (!existingOtp) {
      await Otp.create({
        code: generatedOtp,
        attempt: 1,
        lastSentAt: new Date(),
        retries: 0,
        target: args.mobile,
        lastCodeVerified: false,
        blocked: false,
      });
    } else {
      await Otp.update(
        {
          code: generatedOtp,
          attempt: 1,
          lastSentAt: new Date(),
          retries: 0,
          lastCodeVerified: false,
          blocked: false,
        },
        { where: { target: args.mobile } }
      );
    }

    const payload = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: args.mobile,
      type: "template",
      template: {
        name: "otp",
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [{ type: "text", text: generatedOtp }],
          },
          {
            type: "button",
            sub_type: "url",
            index: "0",
            parameters: [{ type: "payload", payload: "" }],
          },
        ],
      },
    };

    const response = await axios.post(process.env.PINBOT_URL!, payload, {
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.PINBOT_APIKEY!,
      },
    });
    console.log("API Response:", response.data);
  
  console.log(`OTP sent to ${args.mobile}: ${generatedOtp}`);

    this.sendHttpResponse(res, {
      message: `OTP sent successfully to ${args.mobile}`,
      code: 200,
    });

  } catch (error: any) {
    console.error("Error:", error.response?.data || error.message);
    this.sendHttpResponse(res, {
      error: "Failed to send OTP",
      message: error.message || "Internal server error",
      code: 500,
    });
  }
};

 verifyForgotOtp = async (req: Request, res: Response): Promise<void> => {
    const { phoneNumber, otp } = req.body;
    try {
      const isTokenValid = await userModel.verifyResetToken(phoneNumber, otp);
      if (!isTokenValid) {
        return this.sendHttpResponse(res, {
          error: 'Invalid OTP',
          message: 'Invalid OTP',
          code: 400,
        });
      }

      return this.sendHttpResponse(res, {
        data: { message: 'OTP Verified Successfully.' },
        code: 200,
      });
    } catch (error) {
      if (error instanceof Error && error.message) {
        return this.sendHttpResponse(res, {
          error: error.message,
          code: 409,
        });
      } else {
        return this.sendHttpResponse(res, {
          error: error,
          code: 500,
        });
      }
    }
  };


}
export default UserController;
