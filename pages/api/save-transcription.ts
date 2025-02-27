import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { transcript, duration } = req.body;

    if (!transcript || !duration) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const filePath = path.join(process.cwd(), "public", "transcriptions.json");
    const existingData = fs.existsSync(filePath)
      ? JSON.parse(fs.readFileSync(filePath, "utf-8"))
      : [];

    const newEntry = {
      id: Date.now(),
      transcript,
      duration,
      createdAt: new Date().toISOString(),
    };

    existingData.push(newEntry);
    fs.writeFileSync(filePath, JSON.stringify(existingData, null, 2));

    return res
      .status(200)
      .json({ message: "Transcription saved!", data: newEntry });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
}
