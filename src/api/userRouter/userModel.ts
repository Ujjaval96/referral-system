import Decimal from "decimal.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { sendOtp }   from "../../utils/sendotp";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import sequelize from "../../db";
import { Sequelize, Transaction as SequelizeTransaction, QueryTypes } from "sequelize";
import { customAlphabet } from "nanoid";
import { DepositPayload } from "./payloads";
import { User, Wallet, Transaction,Otp } from "../../models";
import { UserInstance } from "../../models/User";
const JWT_SECRET = process.env.JWT_SECRET!;

interface ServiceResponse<T = unknown> {
  data?: T;
  error?: string | unknown;
  code: number;
}
interface VerifyOTPOptions {
  isSignup?: boolean;
}

type Auth = {
  token: string;
  user: UserInstance;
};
interface AuthResponse {
  token: string;
  qrCode: string;
  user: UserInstance;
}
const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 8);
const otp=customAlphabet("0123456789",6);
class UserModel {

async signup(
  name: string,
  email: string,
  phoneNumber: string,
  password: string,
  referralCode?: string
): Promise<ServiceResponse<{ user: Partial<UserInstance>; token: string }>> {
  try {
    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) return { error: "Email already in use", code: 409 };

    // Handle referral
    let referrerPath: string | undefined;
    let referredBy: number | null = null;

    if (referralCode) {
      const parent = await User.findOne({ where: { referredCode: referralCode } });
      if (!parent) return { error: "Referral code not found", code: 404 };

      referrerPath = parent.path;
      referredBy = parent.id;
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const referredCode = nanoid(); // generate this user's referral code

    // Create new user (temporary path = "")
    const newUser = await User.create({
      name,
      email,
      password: hashedPassword,
      path: "", // will update below
      phoneNumber,
      twoFASecret: null,
      referredBy,
      referredCode,
      is2FAVerified: false,
    });

    // Build final path
    let finalPath: string;
    if (referrerPath && referrerPath.trim() !== "") {
      finalPath = `${referrerPath}.${newUser.id}`;
    } else if (referredBy) {
      // If parent path was empty, fallback to parentId
      finalPath = `${referredBy}.${newUser.id}`;
    } else {
      // No referral
      finalPath = `${newUser.id}`;
    }

    // Update user with correct path
    await newUser.update({ path: finalPath });

    // Create wallet
    await Wallet.create({ userId: newUser.id, balance: 0.0 });

    // Generate JWT
    const tokenPayload = {
      id: newUser.id,
      email: newUser.email,
      path: finalPath,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: "1d" });

    const safeUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      path: newUser.path,
      referredCode: newUser.referredCode,
      is2FAVerified: newUser.is2FAVerified,
      createdAt: newUser.createdAt,
      updatedAt: newUser.updatedAt,
    };

    return { data: { user: safeUser, token }, code: 201 };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : String(error),
      code: 500,
    };
  }
}




enable = async (email: string): Promise<{ qrCode?: string; twoFAEnabled: boolean; message: string }> => {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new Error("User not found");
  }

  if (user.twoFASecret) {
    return {
      twoFAEnabled: true,
      message: "Two-factor authentication is already enabled",
    };
  }

  const twoFASecret = speakeasy.generateSecret({
    name: `MyApp (${email})`,
    issuer: "MyApp",
  });

  if (!twoFASecret.otpauth_url) {
    throw new Error("Failed to generate OTP Auth URL");
  }

  user.twoFASecret = twoFASecret.base32;
  await user.save();

  const qrFolder = path.join(__dirname, "../../../qr");
  if (!fs.existsSync(qrFolder)) {
    fs.mkdirSync(qrFolder, { recursive: true });
  }

  const qrFilePath = path.join(qrFolder, `2fa-${email}.png`);
  await qrcode.toFile(qrFilePath, twoFASecret.otpauth_url, { type: "png" });
  const qrCode = await qrcode.toDataURL(twoFASecret.otpauth_url);

  return {
    qrCode,
    twoFAEnabled: true,
    message: "2FA setup initiated successfully",
  };
};


  login=async (
    email: string,
    password: string
  ): Promise<ServiceResponse<{ requires2FA: boolean; twoFAEnabled: boolean; token?: string }>> => {
    try {
      const user = await User.findOne({ where: { email } });

      if (!user) {
        return {
          error: "Invalid email or password",
          code: 401,
        };
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return {
          error: "Invalid email or password",
          code: 401,
        };
      }

      const is2FAEnabled = Boolean(user.twoFASecret) && user.is2FAVerified;

      if (is2FAEnabled) {
        return {
          data: {
            requires2FA: true,
            twoFAEnabled: true,
          },
          code: 200,
        };
      }

      const tokenPayload = {
        id: user.id,
        email: user.email,
        path:user.path,
      };

      const token = jwt.sign(tokenPayload, JWT_SECRET, {
        expiresIn: "1d",
      });

      return {
        data: {
          requires2FA: false,
          twoFAEnabled: false,
          token,
        },
        code: 200,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        code: 500,
      };
    }
  };
 
  async verifyUserOTP(
  email: string,
  token: string,
): Promise<ServiceResponse<{ token: string; user: Partial<UserInstance> }>> {
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return { error: "User not found", code: 404 };
    console.log(user.name)
    const verified = speakeasy.totp.verify({
      secret: user.twoFASecret!,
      encoding: "base32",
      token: token.trim(),
      step: 30, 
      window: 2, 
    });

    if (!verified) return { error: "Invalid or expired OTP", code: 401 };

    user.is2FAVerified=true;
    await user.save();
    const payload: Record<string, any> = { id: user.id, email:user.email,path: user.path };
  
    const jwtToken = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: "1d" });

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      path: user.path,
      referredCode: user.referredCode,
      is2FAVerified: user.is2FAVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return { data: { token: jwtToken, user: safeUser }, code: 200 };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error), code: 500 };
  }
}

async sendOtp(phone:string): Promise<boolean> {
  try {
    if (!phone) return false;
    await sendOtp(phone)
    return true;
  } catch (err: any) {
    console.error(err.message);
    return false;
  }
};

 async verifyResetToken(
    phoneNumber: string,
    resetToken: string
  ): Promise<boolean> {
    const user = await Otp.findOne({
      where: { target: phoneNumber, code: resetToken },
    });
    return !!user;
  }



//   async sendotp(
// ): Promise<ServiceResponse<{ data:any}>>
// {

// };

  //  deposit = async (args: DepositPayload) => {
  //   const { amount, _uid } = args;
  //   if (!amount || isNaN(amount) || Number(amount) <= 0) {
  //     throw new Error("Invalid deposit amount. Must be a positive number.");
  //   }

  //   const t: SequelizeTransaction = await sequelize.transaction();

  //   try {
  //     const user = await User.findByPk(_uid, { transaction: t, lock: t.LOCK.UPDATE });
  //     if (!user) throw new Error("User not found");

  //     const wallet = await Wallet.findOne({
  //       where: { userId: user.id },
  //       transaction: t,
  //       lock: t.LOCK.UPDATE,
  //     });
  //     if (!wallet) throw new Error("Wallet not found");
  //     const newBalance = new Decimal(wallet.balance).plus(amount);
  //     wallet.balance = Number(newBalance.toFixed(2));
  //     await wallet.save({ transaction: t });

  //     await Transaction.create(
  //       {
  //         userId: user.id,
  //         walletId: wallet.id,
  //         type: "DEPOSIT",
  //         amount: Number(new Decimal(amount).toFixed(2)),
  //         status: "COMPLETED",
  //         remark: `Deposit of ${amount}`,
  //       },
  //       { transaction: t }
  //     );
  //     if (user.path) {
  //       const pathParts = user.path.split(".");
  //       const bonusRates = [0.5, 0.2, 0.2, 0.2, 0.2];

  //       for (let level = 1; level <= 5; level++) {
  //         if (pathParts.length > level) {
  //           const ancestorPath = pathParts.slice(0, -level).join(".");
  //           const ancestor = await User.findOne({
  //             where: { path: ancestorPath },
  //             transaction: t,
  //             lock: t.LOCK.UPDATE,
  //           });

  //           if (ancestor) {
  //             const ancestorWallet = await Wallet.findOne({
  //               where: { userId: ancestor.id },
  //               transaction: t,
  //               lock: t.LOCK.UPDATE,
  //             });

  //             if (ancestorWallet) {
  //               const bonus = new Decimal(amount).mul(bonusRates[level - 1]);
  //               const updatedBalance = new Decimal(ancestorWallet.balance).plus(bonus);
  //               ancestorWallet.balance = Number(updatedBalance.toFixed(2));
  //               await ancestorWallet.save({ transaction: t });

  //               await Transaction.create(
  //                 {
  //                   userId: ancestor.id,
  //                   walletId: ancestorWallet.id,
  //                   type: "BONUS",
  //                   amount: Number(updatedBalance.toFixed(2)),
  //                   status: "COMPLETED",
  //                   remark: `${bonusRates[level - 1] * 100}% bonus from level ${level} descendant (user ${user.id}) deposit`,
  //                 },
  //                 { transaction: t }
  //               );

  //               console.log(
  //                 `Ancestor User ${ancestor.id} received bonus ${bonus.toFixed(
  //                   2
  //                 )} from level ${level} (descendant User ${user.id} deposit of ${amount})`
  //               );
  //             }
  //           }
  //         }
  //       }
  //     }
  //     await t.commit();

  //     return {
  //       data: { depositAmount: new Decimal(amount).toFixed(2), newBalance: wallet.balance },
  //       message: "Deposit successful with bonuses",
  //     };
  //   } catch (err) {
  //     await t.rollback();
  //     console.error("Deposit failed:", err);
  //     throw err;
  //   }
  // };
  deposit = async (args: DepositPayload) => {
    const { amount, id, path } = args;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      throw new Error("Invalid deposit amount. Must be a positive number.");
    }

    const t = await sequelize.transaction();

    try {
      const wallet = await Wallet.findOne({
        where: { userId: id },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      if (!wallet) throw new Error("Wallet not found");

      wallet.balance = Number(new Decimal(wallet.balance).plus(amount).toFixed(2));
      await wallet.save({ transaction: t });

      await Transaction.create({
        userId: id,
        walletId: wallet.id,
        type: "DEPOSIT",
        amount: Number(new Decimal(amount).toFixed(2)),
        status: "COMPLETED",
        remark: `Deposit of ${amount}`,
      }, { transaction: t });

      if (path) {
        const bonusRates = [0.5, 0.2, 0.2, 0.2, 0.2];

        const ancestorsRaw = await sequelize.query(`
        SELECT u.id, w.id AS wallet_id, u.path
        FROM users u
        JOIN wallets w ON w.user_id = u.id
        WHERE u.path::ltree @> :userPath::ltree AND u.id != :userId
        ORDER BY nlevel(u.path::ltree) DESC
        LIMIT 5
      `, {
          replacements: { userPath: path, userId: id },
          type: QueryTypes.SELECT,
          transaction: t,
        });

        const bonusAncestors = (ancestorsRaw as any[]).filter(a => a.id && a.wallet_id);//remove null
        const appliedBonusRates = bonusRates.slice(0, bonusAncestors.length);

        const ancestorWallets = await Wallet.findAll({
          where: { id: bonusAncestors.map(a => a.wallet_id) },
          transaction: t,
          lock: t.LOCK.UPDATE,
        });

        for (let i = 0; i < bonusAncestors.length; i++) {
          const ancestor = bonusAncestors[i];
          const ancestorWallet = ancestorWallets.find(w => w.id === ancestor.wallet_id);
          if (!ancestorWallet) continue;

          const bonus = new Decimal(amount).mul(appliedBonusRates[i]);
          ancestorWallet.balance = Number(new Decimal(ancestorWallet.balance).plus(bonus).toFixed(2));
          await ancestorWallet.save({ transaction: t });

          await Transaction.create({
            userId: ancestor.id,
            walletId: ancestorWallet.id,
            type: "BONUS",
            amount: Number(bonus.toFixed(2)),
            status: "COMPLETED",
            remark: `${appliedBonusRates[i] * 100}% bonus from level ${i + 1} descendant (user ${id}) deposit`,
          }, { transaction: t });
        }
      }

      await t.commit();

      return {
        data: {
          depositAmount: new Decimal(amount).toFixed(2),
          newBalance: wallet.balance,
        },
        message: "Deposit successful with bonuses",
        code: 200,
      };
    } catch (err) {
      await t.rollback();
      console.error("Deposit failed:", err instanceof Error ? err.message : err);
      throw err;
    }
  };

   getUserTotalAmount = async (userId: number): Promise<number> => {
    console.log(userId);
    const wallet = await Wallet.findOne({ where: { userId } });
    return wallet ? Number(wallet.balance) : 0;

  };



}

export default UserModel;
