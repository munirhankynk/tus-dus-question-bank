import 'dotenv/config';

export default {
  expo: {
    name: "MedBank",
    slug: "tus_dus_question_bank",
    version: "1.0.0",
    orientation: "portrait",
    scheme: "medbank",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#1B2541"
    },
    ios: { supportsTablet: true },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#1B2541"
      }
    },
    web: { favicon: "./assets/images/favicon.png" },
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || "https://ohqggrpotcfzyrpfarbm.supabase.co",
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ocWdncnBvdGNmenlycGZhcmJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NDEyMDksImV4cCI6MjA4ODIxNzIwOX0.l8oD-IVG_BV2R5LDpytOAISgXi72JK1RgXfeCnBATuA",
    },
  },
};