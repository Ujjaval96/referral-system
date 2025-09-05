import User from "./User";
import Wallet from "./Wallet";
import Transaction from "./Transaction";

// User ↔ Wallet (1:1)
User.hasOne(Wallet, { foreignKey: "userId", as: "wallet" });
Wallet.belongsTo(User, { foreignKey: "userId", as: "user" });

// User ↔ Transaction (1:M)
User.hasMany(Transaction, { foreignKey: "userId", as: "transactions" });
Transaction.belongsTo(User, { foreignKey: "userId", as: "user" });

// Wallet ↔ Transaction (1:M)
Wallet.hasMany(Transaction, { foreignKey: "walletId", as: "transactions" });
Transaction.belongsTo(Wallet, { foreignKey: "walletId", as: "wallet" });
// 
export { User, Wallet, Transaction };
