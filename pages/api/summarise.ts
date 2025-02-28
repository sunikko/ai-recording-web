import { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text } = req.body;

  try {
    // const data = await openai.chat.completions.create({
    //   model: "gpt-3.5-turbo",
    //   messages: [
    //     {
    //       role: "user",
    //       content: `please summarise in one sentence: \n\n${text}`,
    //     },
    //   ],
    // });

    // const summary = data.choices[0].message.content?.trim();
    const summary = "It's a type of AI model";
    res.status(200).json({ summary });
  } catch (error: any) {
    console.log("Summarise Error", error);
    res.status(500).json({ error: error.message });
  }
};

export default handler;
