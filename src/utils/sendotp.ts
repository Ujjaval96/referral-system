import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const APIKEY = process.env.PINBOT_APIKEY!;
const PINBOT_URL = process.env.PINBOT_URL!;

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
export async function sendOtp(phone: string): Promise<void> {

  const otp = generateOtp();
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: phone,
    type: "template",
    template: {
      name: "otp",
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: otp }]
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
  try {
    const response = await axios.post(PINBOT_URL, payload, {
      headers: {
        "Content-Type": "application/json",
        apikey: APIKEY,
      },
    });
    console.log("API Response:", response.data);
  } catch (error: any) {
    if (error.response) {
      console.error("Error Response:", error.response.data);
    } else {
      console.error("Error:", error.message);
    }
  }

  console.log(`OTP sent to ${phone}: ${otp}`);
}
