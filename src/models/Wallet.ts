/* eslint-disable quotes */
import { Model, DataTypes } from "sequelize";
import sequelize from "../db";
import { UserInstance } from "./User";

type WalletAttributes = {
  id: number;
  userId: number;
  balance: number;
  createdAt?: Date;
  updatedAt?: Date;
};

type WalletCreationAttributes = Partial<WalletAttributes> & Pick<WalletAttributes, "userId">;

export interface WalletInstance
  extends Model<WalletAttributes, WalletCreationAttributes>,
    WalletAttributes {
  user?: UserInstance;
}

const Wallet = sequelize.define<WalletInstance>("wallet", {
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
      model: "users", // table name
      key: "id",
    },
  },
  balance: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0.0,
    field: "balance",
    validate: {
      isDecimal: { msg:  "Balance must be a decimal number" },
      min: {
        args: [0],
        msg:  "Balance cannot be negative",
      },
    },
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

export default Wallet;
