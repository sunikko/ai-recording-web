import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";

type Script = {
  start: number;
  end: number;
  text: string;
};

export type Data = {
  id: string;
  text: string;
  scripts: Script[];
  summary?: string;
};

type Database = { [id: string]: Data | undefined };

type ScriptContextType = {
  create: (data: Data) => void;
  get: ({ id }: { id: string }) => Data | undefined;
  update: ({ id, summary }: { id: string; summary?: string }) => void;
};

const ScriptContext = createContext<ScriptContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  //   const [database, setDatabase] = useState<Database>({});
  const [database, setDatabase] = useState<Database>({
    "1721464473516": {
      id: "1721464473516",
      text: "GPT stands for Generative Pre-trained Transformer. It's a type of artificial intelligence (AI) model that can produce human-like text, images, and more. GPT is a key part of generative AI, which is a technology that can create content.",
      scripts: [
        {
          start: 0,
          end: 11,
          text: "GPT stands for Generative Pre-trained Transformer.",
        },
        {
          start: 11,
          end: 24,
          text: "It's a type of artificial intelligence (AI) model that can produce human-like text, images, and more.",
        },
        {
          start: 24,
          end: 38,
          text: "GPT is a key part of generative AI, which is a technology that can create content.",
        },
      ],
    },
  });

  // console.log(database);

  const create = useCallback((data: Data) => {
    setDatabase((prev) => ({
      ...prev,
      [data.id]: data,
    }));
  }, []);

  const get = useCallback(
    ({ id }: { id: string }) => {
      return database[id];
    },
    [database]
  );

  const update = useCallback(
    ({ id, summary }: { id: string; summary?: string }) => {
      setDatabase((prevDatabase) => {
        const prevData = prevDatabase[id];
        if (prevData == null) return prevDatabase;
        return {
          ...prevDatabase,
          [id]: {
            ...prevData,
            ...(summary != null ? { summary } : {}),
          },
        };
      });
    },
    []
  );
  return (
    <ScriptContext.Provider value={{ create, get, update }}>
      {children}
    </ScriptContext.Provider>
  );
};

export const useDatabase = () => {
  const context = useContext(ScriptContext);
  if (context === undefined) {
    throw new Error("useDatabase must to be within a DataProvider");
  }
  return context;
};
