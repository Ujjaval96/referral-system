import { Model, DataTypes } from 'sequelize';
import sequelize from "../db";

type OtpAttributes = {
  id: number;
  code: string;
  attempt: number;
  lastSentAt: Date;
  retries: number;
  target: string;
  lastCodeVerified: boolean;
  blocked: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type OtpCreationAttributes = Partial<OtpAttributes> & Pick<OtpAttributes, 'target'>;

export interface OtpInstance extends Model<OtpAttributes, OtpCreationAttributes>, OtpAttributes { }

const Otp = sequelize.define<OtpInstance>('otp', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false,
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'code'
  },
  attempt: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    allowNull: false,
    field: 'attempt'
  },
  lastSentAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    allowNull: false,
    field: 'lastsentat',
  },
  retries: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    field:'retries'
  },
  target: {
    type: DataTypes.STRING,
    allowNull: false,
    field:'target'
  },
  lastCodeVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'lastcodeverified',
  },
  blocked: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field:'blocked'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'createdat',
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'updatedat',
  },
});

export default Otp;