import Header from "@/components/Header";
import { formatTime } from "@/modules/Util";
import { useCallback, useRef, useState } from "react";
import { Stream } from "stream";

const Recorder = () => {
  const [state, setState] = useState<"recording" | "paused" | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [time, setTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setTime((prev) => prev + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const onStartRecord = useCallback(() => {
    startTimer();
    setState("recording");
  }, [startTimer]);

  const onStopRecord = useCallback(
    ({ url }: { url: string }) => {
      setAudioUrl(url);
      stopTimer();
      setState(null);
    },
    [stopTimer]
  );

  const record = useCallback(() => {
    window.navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((stream) => {
        const mimeType = "audio/webm";
        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.onstart = () => {
          onStartRecord();
        };
        mediaRecorder.ondataavailable = (event) => {
          chunksRef.current.push(event.data);
        };
        mediaRecorder.onstop = () => {
          const blob = new Blob(chunksRef.current, {
            type: chunksRef.current[0].type,
          });
          chunksRef.current = [];
          const url = URL.createObjectURL(blob);
          onStopRecord({ url });
          stream.getAudioTracks().forEach((track) => track.stop());
        };
        mediaRecorder.start();
      });
  }, [onStartRecord, onStopRecord]);

  const recordStop = useCallback(() => {
    if (mediaRecorderRef.current != null) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const onPressRecord = useCallback(() => {
    record();
  }, [record]);

  const onPressSave = useCallback(() => {
    recordStop();
  }, [recordStop]);

  return (
    <div className="h-screen  bg-[#F6F6F9] flex flex-col">
      <Header title="Recording" />
      <div className="flex flex-1 flex-col items-center pt-[211px]">
        {state === "recording" ? (
          <button className="w-[120px] h-[120px] rounded-[80px] bg-[#1A1A1A]">
            <span className="material-icons text-white text-[70px]">mic</span>
          </button>
        ) : state === "paused" ? (
          <button className="w-[120px] h-[120px] rounded-[80px] bg-[#1A1A1A]">
            <span className="material-icons text-white text-[70px]">pause</span>
          </button>
        ) : (
          <button
            className="w-[120px] h-[120px] rounded-[80px] bg-[#1A1A1A]"
            onClick={onPressRecord}
          >
            <span className="material-icons text-[#09CC7F] text-[70px]">
              mic
            </span>
          </button>
        )}
        <p
          className={`mt-[42px] text-[20px] font-[600] ${
            state === "recording" || state === "paused"
              ? "text-[#303030]"
              : "text-[#AEAEB2]"
          }`}
        >
          {formatTime(time)}
        </p>
        {state === "recording" && (
          <button className="mt-[42px] bg-[#1A1A1A] rounded-[27px] px-[42px] py-[16px] items-center flex">
            <span className="material-icons text-white !text-[20px]">
              pause
            </span>
            <span className="ml-[4px] text-[15px] text-white font-[600]">
              Pause
            </span>
          </button>
        )}
        {(state === "recording" || state === "paused") && (
          <button
            className={`${
              state === "paused" ? "mt-[42px]" : "mt-[16px]"
            } bg-[#09CC7F] rounded-[27px] px-[42px] py-[16px] items-center flex`}
            onClick={onPressSave}
          >
            <span className="material-icons text-white !text-[20px]">
              check
            </span>
            <span className="ml-[4px] text-[15px] text-white font-[600]">
              Save
            </span>
          </button>
        )}
        {audioUrl != null && (
          <audio controls>
            <source src={audioUrl} />
          </audio>
        )}
        {toastVisible && (
          <div className="absolute bottom-[21px] flex border-[1.5px] border-[#09CC7F] w-[358px] py-[13px] px-[17px] rounded-[6px] bg-[#F9FEFF]">
            <span className="material-icons text-[#00DDA8] !text-[24px]">
              check
            </span>
            <p className="ml-[7px] text-[15px] font-[600] text-[#4A4A4A]">
              저장이 완료되었습니다.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Recorder;
