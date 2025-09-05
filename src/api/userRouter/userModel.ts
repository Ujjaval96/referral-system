import Decimal from "decimal.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import sequelize from "../../db";
import { Sequelize, Transaction as SequelizeTransaction, QueryTypes } from "sequelize";

import { DepositPayload } from "./payloads";
import { User, Wallet, Transaction } from "../../models";
import { UserInstance } from "../../models/User";
const JWT_SECRET = process.env.JWT_SECRET!;

interface ServiceResponse<T = unknown> {
  data?: T;
  error?: string | unknown;
  code: number;
}
interface AuthResponse {
  token: string;
  user: UserInstance;
}

class UserModel {


  async signup(
    name: string,
    email: string,
    password: string,
    referralId?: number
  ): Promise<ServiceResponse<AuthResponse>> {
    try {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return { error: "Email already in use", code: 409 };
      }

      let referrerPath: string | undefined;
      let referredBy: number | null = null;

      if (referralId) {
        if (!Number.isInteger(referralId)) {
          return { error: "Invalid referral ID", code: 400 };
        }
        const parent = await User.findByPk(referralId);
        if (!parent) {
          return { error: "Referred user not found", code: 404 };
        }
        referrerPath = parent.path;
        referredBy = referralId;
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await User.create({
        name,
        email,
        password: hashedPassword,
        path: "",
        referredBy,
      });

      const finalPath = referrerPath
        ? `${referrerPath}.${newUser.id}`
        : `${newUser.id}`;

      await newUser.update({ path: finalPath });
      newUser.path = finalPath; 

      await Wallet.create({
        userId: newUser.id,
        balance: 0.0,
      });

      // 7. issue JWT
      const token = jwt.sign(
        { id: newUser.id, path: newUser.path },
        JWT_SECRET,
        { expiresIn: "1d" }
      );

      return { data: { token, user: newUser }, code: 201 };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : String(error),
        code: 500,
      };
    }
  }


  async login(email: string, password: string): Promise<ServiceResponse<AuthResponse>> {
    try {
      const user = await User.findOne({ where: { email } });
      if (!user) return { error: "Invalid email or password", code: 401 };

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return { error: "Invalid email or password", code: 401 };

      const token = jwt.sign(
        { id: user.id, path: user.path },
        process.env.JWT_SECRET!,
        { expiresIn: "1d" }
      );

      return { data: { token, user }, code: 200 };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : error,
        code: 500,
      };
    }
  }
  getUserTotalAmount = async (userId: number): Promise<number> => {

    const wallet = await Wallet.findOne({ where: { userId } });
    return wallet ? Number(wallet.balance) : 0;

  };

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
  const { amount, _uid, _path } = args;

  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    throw new Error("Invalid deposit amount. Must be a positive number.");
  }

  const t = await sequelize.transaction();

  try {
    const wallet = await Wallet.findOne({
      where: { userId: _uid },
      transaction: t,
      lock: t.LOCK.UPDATE,
    });
    if (!wallet) throw new Error("Wallet not found");

    wallet.balance = Number(new Decimal(wallet.balance).plus(amount).toFixed(2));
    await wallet.save({ transaction: t });

    await Transaction.create({
      userId: _uid,
      walletId: wallet.id,
      type: "DEPOSIT",
      amount: Number(new Decimal(amount).toFixed(2)),
      status: "COMPLETED",
      remark: `Deposit of ${amount}`,
    }, { transaction: t });

    if (_path) {
      const bonusRates = [0.5, 0.2, 0.2, 0.2, 0.2]; 

      const ancestorsRaw = await sequelize.query(`
        SELECT u.id, w.id AS wallet_id, u.path
        FROM users u
        JOIN wallets w ON w.user_id = u.id
        WHERE u.path::ltree @> :userPath::ltree AND u.id != :userId
        ORDER BY nlevel(u.path::ltree) DESC
        LIMIT 5
      `, {
        replacements: { userPath: _path, userId: _uid },
        type: QueryTypes.SELECT,
        transaction: t,
      });

      const bonusAncestors = (ancestorsRaw as any[]).filter(a => a.id && a.wallet_id);
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
          remark: `${appliedBonusRates[i] * 100}% bonus from level ${i + 1} descendant (user ${_uid}) deposit`,
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



}

export default UserModel;
