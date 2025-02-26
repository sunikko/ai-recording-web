import Header from "@/components/Header";
import { formatTime } from "@/modules/Util";
import { useCallback, useEffect, useRef, useState } from "react";
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

  const showToast = useCallback(() => {
    setToastVisible(true);
  }, []);

  useEffect(() => {
    if (toastVisible) {
      const id = setTimeout(() => {
        console.log("Toast 숨김 실행, ID:", id);
        setToastVisible(false);
      }, 2000);

      console.log("setTimeout ID:", id, typeof id); // ✅ id의 타입 확인

      return () => {
        if (typeof id === "number") {
          clearTimeout(id);
        } else {
          console.error("🚨 id!", id);
        }
      };
    }
  }, [toastVisible]);

  const transcribeAudio = useCallback(
    async ({ url, ext }: { url: string; ext: string }) => {
      console.log("transcribeAudio:", url, ext);
      const response = await fetch(url);
      const audioBlob = await response.blob();

      if (!audioBlob || audioBlob.size === 0) {
        console.error("No audio data available");
        return;
      }

      //   const formData = new FormData();
      //   formData.append("file", audioBlob, `recording${ext}`);

      const formData = new FormData();

      // Instead of this:
      // formData.append('file', audioBlob);

      // Do this:
      if (audioBlob !== null) {
        formData.append("file", audioBlob, "audio.webm");
      } else {
        formData.append("file", ""); // or omit this line to not send the field at all
      }

      // Add other necessary fields
      formData.append("model", "whisper-1");
      formData.append("language", "en");

      try {
        const transcriptionResponse = await fetch("/api/transcribe", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error("Transcription failed");
        }

        const data = await transcriptionResponse.json();
        console.log(data);
      } catch (error) {
        console.error("Error:", error);
        // 에러 처리
      }
    },
    []
  );

  const onStartRecord = useCallback(() => {
    setTime(0);
    setAudioUrl(null);
    startTimer();
    setState("recording");
  }, [startTimer]);

  const onStopRecord = useCallback(
    ({ url, ext }: { url: string; ext: string }) => {
      console.log("onStopRecord", url);
      setAudioUrl(url);
      stopTimer();
      setState(null);
      showToast();
      transcribeAudio({ url, ext });
    },
    [stopTimer, showToast, transcribeAudio]
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
          onStopRecord({ url, ext: "webm" });
          if (stream) {
            stream.getAudioTracks().forEach((track) => track.stop());
          }
        };
        mediaRecorder.start();
      });
  }, [onStartRecord, onStopRecord]);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current != null) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, []);

  const pause = useCallback(() => {
    if (mediaRecorderRef.current != null) {
      mediaRecorderRef.current.pause();
    }
  }, []);

  const resume = useCallback(() => {
    if (mediaRecorderRef.current != null) {
      mediaRecorderRef.current.resume();
    }
  }, []);

  const onPressRecord = useCallback(() => {
    record();
  }, [record]);

  const onPressSave = useCallback(() => {
    stop();
  }, [stop]);

  const onPressPause = useCallback(() => {
    if (state === "recording") {
      pause();
      stopTimer();
      setState("paused");
    } else if (state === "paused") {
      resume();
      startTimer();
      setState("recording");
    }
  }, [pause, resume, stopTimer, startTimer, state]);

  return (
    <div className="h-screen  bg-[#F6F6F9] flex flex-col">
      <Header title="Recording" />
      <div className="flex flex-1 flex-col items-center pt-[211px]">
        {state === "recording" ? (
          <button
            className="w-[120px] h-[120px] rounded-[80px] bg-[#1A1A1A]"
            onClick={onPressPause}
          >
            <span className="material-icons text-white text-[70px]">mic</span>
          </button>
        ) : state === "paused" ? (
          <button
            className="w-[120px] h-[120px] rounded-[80px] bg-[#1A1A1A]"
            onClick={onPressPause}
          >
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
          <button
            className="mt-[42px] bg-[#1A1A1A] rounded-[27px] px-[42px] py-[16px] items-center flex"
            onClick={onPressPause}
          >
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
              Saved successfully.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Recorder;
