import { Data, useDatabase } from "@/components/DataContext";
import Header from "@/components/Header";
import { formatTime } from "@/modules/Util";
import { useRouter } from "next/router";
import { useCallback, useEffect, useState } from "react";

const Tab = ({
  title,
  focused,
  onClick,
}: {
  title: string;
  focused?: boolean;
  onClick?: () => void;
}) => {
  return (
    <button
      className={`flex flex-1 justify-center items-center text-[16px] font-[500] py-[11px] ${
        focused
          ? "border-b-[2px] border-[#09CC7F] text-[#1A1A1A]"
          : "text-[#848487]"
      }`}
      onClick={onClick}
    >
      {title}
    </button>
  );
};

const Script = ({
  scripts,
  onPressSummarise,
}: {
  scripts: { start: number; end: number; text: string }[];
  onPressSummarise?: () => void;
}) => {
  return (
    <div className="flex flex-col px-[16px] py-[24px]">
      <button
        className="relative bg-[#09CC7F] mb-[18px] flex justify-center items-center py-[13px] rounded-[6px] text-[16px] font-[700] text-[#FFFFFF]"
        onClick={onPressSummarise}
      >
        Summary
        <span className="material-icons text-white text-[24px] absolute right-[17px]">
          east
        </span>
      </button>
      <div className="flex flex-col gap-[18px]">
        {scripts.map((script, index) => {
          return (
            <div key={index}>
              <div className="text-[#848487] text-[15px] font-[400]">
                {`${formatTime(script.start)}-${formatTime(script.end)}`}
              </div>
              <div className="mt-[10px] text-[15px] font-[400] text-[#1A1A1A]">
                {script.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Recording = () => {
  const router = useRouter();

  const [data, setData] = useState<Data | null>(null);
  const { get } = useDatabase();

  useEffect(() => {
    if (typeof router.query.id === "string") {
      const document = get({ id: router.query.id });
      if (document != null) {
        setData(document);
        return;
      } else {
        throw new Error("Cannot load data");
      }
    }
  }, [get, router.query.id]);

  const [focusedTab, setFocusedTab] = useState<"script" | "summary">("script");

  const onPressScriptTab = useCallback(() => {
    setFocusedTab("script");
  }, []);
  const onPressSummaryTab = useCallback(() => {
    setFocusedTab("summary");
  }, []);

  const [summarising, setSummarising] = useState(false);
  const onPressSummarise = useCallback(async () => {
    const text = data?.text;

    if (text == null) {
      return;
    }

    setSummarising(true);

    try {
      const response = await fetch("/api/summarise", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const result = await response.json();
      console.log("result", result.summary);
    } catch (error) {
      console.error(error);
    } finally {
      setSummarising(false);
    }
  }, [data?.text]);

  return (
    <div className="h-screen bg-[#F6F6F9] flex flex-col">
      <Header title={"Voice Record"} />
      <div className="flex">
        <Tab
          title={"Voice Record"}
          focused={focusedTab === "script"}
          onClick={onPressScriptTab}
        />
        <Tab
          title={"Summary"}
          focused={focusedTab === "summary"}
          onClick={onPressSummaryTab}
        />
      </div>

      <div className="flex-1 overflow-y-scroll overscroll-none">
        {data?.scripts != null && (
          <Script scripts={data.scripts} onPressSummarise={onPressSummarise} />
        )}
      </div>
    </div>
  );
};

export default Recording;
