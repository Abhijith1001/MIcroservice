import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { Kafka } from "kafkajs";

dotenv.config();

const EMAIL_TO = "abhijiithb@gmail.com";

// Prefer .env, but fall back to sensible Gmail defaults you already use
const SMTP_HOST = process.env.EMAIL_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.EMAIL_PORT || 587);
const SMTP_SECURE = process.env.EMAIL_SECURE === "true";
const SMTP_USER = process.env.EMAIL_USER || "soniwdew@gmail.com";
const SMTP_PASS = process.env.EMAIL_PASSWORD || "vlwp zcal mrrw bzix";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

const sendConfirmationEmail = async (cart = [], amount = 0) => {
  const cartLines = cart
    .map((item) => `- ${item.name || "Item"}: $${((item.price ?? 0)).toFixed(2)}`)
    .join("\n");

  const info = await transporter.sendMail({
    from:
      process.env.EMAIL_FROM ||
      process.env.EMAIL_USER ||
      "soniwdew@gmail.com",
    to: EMAIL_TO,
    subject: "Payment confirmed",
    text: `Payment for $${((amount || 0) / 100).toFixed(2)} succeeded.\nItems:\n${cartLines}`,
  });

  console.log("Nodemailer sent:", info.messageId, info.response);
  return info;
};

const kafka = new Kafka({
  clientId: "email-service",
  brokers: ["kafka:9092"],
});

const consumer = kafka.consumer({ groupId: "email-service" });

const run = async () => {
  try {
    await consumer.connect();
    await consumer.subscribe({ topic: "payment-successful", fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ message }) => {
        const payload = JSON.parse(message.value.toString());
        const { cart, userId, amount } = payload;
        console.log(`Email service: received payment event for ${userId}`);

        try {
          await sendConfirmationEmail(cart, amount);
          console.log("Email sent");
        } catch (err) {
          console.error("Failed to send email", err);
        }
      },
    });
  } catch (err) {
    console.error(err);
  }
};

run();