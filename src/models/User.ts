/* eslint-disable quotes */
import { Model, DataTypes } from "sequelize";
import sequelize from "../db";  
import responses from "../responses";

export type UserAttributes = {
  id: number;
  name: string;
  email: string;
  password: string;
  path: string;              // referral tree path (ltree-like, e.g., "1.2.3")
  referredBy?: number | null; // Can be number, null, or undefined
  createdAt?: Date;
  updatedAt?: Date;
};


export type UserCreationAttributes = Partial<UserAttributes> &
  Pick<UserAttributes, "email" | "password">;

export interface UserInstance
  extends Model<UserAttributes, UserCreationAttributes>,
    UserAttributes {}

const User = sequelize.define<UserInstance>(
  "user",
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "name",
      validate: {
        notEmpty: { msg: responses.MSG004 || "Name cannot be empty" },
      },
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: "email",
      validate: {
        isEmail: { msg: responses.MSG008 || "Invalid email format" },
        notEmpty: { msg: responses.MSG007 || "Email cannot be empty" },
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "password",
      validate: {
        len: {
          args: [6, 100],
          msg: responses.MSG006 || "Password must be at least 6 characters",
        },
      },
    },
    path: {
  type: DataTypes.STRING,
  allowNull: false,
  field: "path",
},

    referredBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "referred_by",
      references: {
        model: "users",
        key: "id",
      },
    },
    createdAt: {
      type: DataTypes.DATE,
      field: "created_at",
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: "updated_at",
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "users",
    modelName: "User",
    timestamps: true,
  }
);

export default User;
