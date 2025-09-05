/* eslint-disable quotes */
import { Model, DataTypes } from "sequelize";
import sequelize from "../db";
import { UserInstance } from "./User";
import { WalletInstance } from "./Wallet";

type TransactionAttributes = {
  id: number;
  userId: number;
  walletId: number;
  amount: number;
  type: "DEPOSIT" | "WITHDRAW" | "BONUS";
  status: "PENDING" | "COMPLETED" | "FAILED";
  remark?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

type TransactionCreationAttributes = Partial<TransactionAttributes> &
  Pick<TransactionAttributes, "userId" | "walletId" | "amount" | "type">;

export interface TransactionInstance
  extends Model<TransactionAttributes, TransactionCreationAttributes>,
    TransactionAttributes {
  user?: UserInstance;
  wallet?: WalletInstance;
}

const Transaction = sequelize.define<TransactionInstance>("transaction", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    field: "id",
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: "user_id",
    references: {
      model: "users",
      key: "id",
    },
  },
  walletId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: "wallet_id",
    references: {
      model: "wallets",
      key: "id",
    },
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    field: "amount",
    validate: {
      isDecimal: { msg:  "Amount must be a decimal number" },
      min: {
        args: [0],
        msg: "Amount must be greater than 0",
      },
    },
  },
  type: {
    type: DataTypes.ENUM("DEPOSIT", "WITHDRAW", "BONUS"),
    allowNull: false,
    field: "type",
  },
  status: {
    type: DataTypes.ENUM("PENDING", "COMPLETED", "FAILED"),
    allowNull: false,
    defaultValue: "PENDING",
    field: "status",
  },
  remark: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: "remark",
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: "created_at",
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: "updated_at",
  },
});

export default Transaction;
