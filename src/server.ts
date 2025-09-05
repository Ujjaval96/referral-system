import app from "./app";
import sequelize from "./db";
import dotenv from "dotenv";

// Just import models once (index.ts handles everything)
import "./models";

dotenv.config();

const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected");

    await sequelize.sync({ alter: true }); 
    console.log("✅ All tables created / updated");

    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Error starting server:", err);
  }
  
})();
