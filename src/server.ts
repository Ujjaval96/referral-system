import app from "./app";
import sequelize from "./db";
import dotenv from "dotenv";
import "./models";

dotenv.config();

const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await sequelize.authenticate();
    console.log(" Database connected");

    await sequelize.sync({ alter: true }); //// Updates tables without dropping
    console.log(" All tables created / updated");

    app.listen(PORT, () => {
      console.log(` Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error(" Error starting server:", err);
  }
  
})();
