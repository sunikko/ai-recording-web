import formidable from "formidable";
import { NextApiRequest, NextApiResponse } from "next";

const handler = (req: NextApiRequest, res: NextApiResponse) => {
  //Input: audio input
  //openAI: audio -> text
  //output: text
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const form = formidable({ keepExtensions: true });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ error: "Form parsing error" });
    }

    const file = files.file?.[0];
    if (file == null) {
      console.error("File is undefined");
      return res.status(500).json({ erro: "Transcription failed" });
    }
  });
};

export default handler;
