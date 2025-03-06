import { useDatabase, Script } from "@/components/DataContext";
import Header from "@/components/Header";
import { formatTime } from "@/modules/Util";
import { useRouter } from "next/router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Stream } from "stream";

function base64ToBlob(base64: string, mimeType: string) {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: mimeType });
}

const Recorder = () => {
  const [state, setState] = useState<"recording" | "paused" | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [time, setTime] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const lastIdRef = useRef<string | null>(null);

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
      const formData = new FormData();
      formData.append("file", audioBlob, `recording${ext}`);

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
        // console.log(data);
      } catch (error) {
        console.error("Error:", error);
        // 에러 처리
      }
    },
    []
  );

  const { create } = useDatabase();
  const router = useRouter();

  const webSpeachTranscribe = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (recognitionRef.current) {
      recognitionRef.current.stop(); // 기존 인스턴스 중지
    }

    const recognition = new SpeechRecognition();
    // recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = true;

    // recognition.onresult = (event) => {
    //   const transcript = Array.from(event.results)
    //     .map((result) => result[0].transcript)
    //     .join("");
    //   setTranscription(transcript);
    // };
    let recognitionStartTime: number | null = null;

    recognition.onstart = () => {
      recognitionStartTime = performance.now(); // Record the exact start time
    };

    recognition.onresult = (event) => {
      console.log("recognition.onresult", event);

      const results: Script[] = Array.from(event.results).map(
        (result, index) => {
          const relativeTime = performance.now() - (recognitionStartTime || 0);
          const avgSpeechSpeed = 200; // Approximate per-word duration
          const transcript = result[0].transcript;
          const wordsCount = transcript.split(" ").length;

          return {
            start: Number(relativeTime), // Ensure it's explicitly a number
            end: Number(relativeTime + wordsCount * avgSpeechSpeed),
            text: transcript,
          };
        }
      );

      const fullTranscript = results.map((r) => r.text).join(" ");

      const id = `${Date.now()}`;
      lastIdRef.current = id;

      create({
        id,
        text: fullTranscript,
        scripts: results,
        photos,
        createdAt: Date.now(),
      });

      // router.push('/recoding/${id}')
      // console.log("Speech Recognition Results:", results);
      setTranscription(fullTranscript);
    };

    recognitionRef.current = recognition; // 새로운 인스턴스 저장
    recognition.start();
  }, [create, photos]);

  const recognitionStartTimeRef = useRef<number | null>(null);

  const fakeTranscribe = useCallback(() => {
    if (!recognitionStartTimeRef.current) {
      recognitionStartTimeRef.current = performance.now(); // Set if not already
    }

    const dummySentences = [
      "This is a sample transcription for testing purposes.",
      "Another example of fake transcription text.",
      "This function simulates a speech-to-text conversion.",
      "React Native is great for building mobile applications.",
      "You can customize this text to fit your needs.",
    ];

    const results: Script[] = dummySentences.map((sentence, index) => {
      const relativeTime = performance.now() - recognitionStartTimeRef.current!;
      const avgSpeechSpeed = 200;
      const wordsCount = sentence.split(" ").length;

      return {
        start: Number(relativeTime + index * 1000),
        end: Number(relativeTime + index * 1000 + wordsCount * avgSpeechSpeed),
        text: sentence,
      };
    });

    const fullTranscript = results.map((r) => r.text).join(" ");

    const id = `${Date.now()}`;
    lastIdRef.current = id;

    create({
      id,
      text: fullTranscript,
      scripts: results,
      photos,
      createdAt: Date.now(),
    });

    setTranscription(fullTranscript);
  }, [create, photos]);

  const onStartRecord = useCallback(() => {
    console.log("--- onStartRecord...");
    setTime(0);
    setAudioUrl(null);
    setTranscription("");
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
      //transcribeAudio({ url, ext });

      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setTranscription((prevTranscription) => {
        console.log("transcription:", prevTranscription);
        return prevTranscription; // 상태 유지
      });
      // router.push(`/recording/${lastIdRef.current}/`);
    },
    [stopTimer, showToast]
  );

  const onPauseRecord = useCallback(() => {
    stopTimer();
    setState("paused");
  }, [stopTimer]);

  const onResumeRecord = useCallback(() => {
    startTimer();
    setState("recording");
  }, [startTimer]);

  const hasReactNativeWebview =
    typeof window != "undefined" && window.ReactNativeWebView != null;

  const postMessageToRN = useCallback(
    ({ type, data }: { type: string; data?: any }) => {
      window.ReactNativeWebView?.postMessage(JSON.stringify({ type, data }));
    },
    []
  );

  useEffect(() => {
    if (hasReactNativeWebview) {
      const handleMessage = (event: any) => {
        console.log("handleMessage", event);
        const { type, data } = JSON.parse(event.data);
        console.log("type", type);
        if (type === "onStartRecord") {
          console.log("calling onStartRecord");
          onStartRecord();
          webSpeachTranscribe();
        } else if (type === "onStopRecord") {
          console.log("data", data);
          console.log("data.audio", data.audio);

          const { mimeType, ext } = data;
          const audio = data["audio"];
          console.log("audio, mimeType, ext", audio, mimeType, ext);

          console.log(audio?.slice(0, 100)); // Prints first 100 characters

          //data is base64
          const blob = base64ToBlob(audio, mimeType);
          const url = URL.createObjectURL(blob);
          onStopRecord({ url, ext });
        } else if (type === "OnPauseRecord") {
          onPauseRecord();
        } else if (type === "OnResumeRecord") {
          onResumeRecord();
        } else if (type === "onTakePhoto") {
          setPhotos((prev) => prev.concat([data]));
        }
      };
      window.addEventListener("message", handleMessage);
      document.addEventListener("message", handleMessage); //for android

      return () => {
        window.removeEventListener("message", handleMessage);
        document.removeEventListener("message", handleMessage); //for android
      };
    }
  }, [
    hasReactNativeWebview,
    onStartRecord,
    onPauseRecord,
    onResumeRecord,
    onStopRecord,
    webSpeachTranscribe,
  ]);
  const record = useCallback(() => {
    if (hasReactNativeWebview) {
      postMessageToRN({ type: "start-record" });
      return;
    }

    window.navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then((stream) => {
        const mimeType = "audio/webm";
        const mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.onstart = () => {
          onStartRecord();
          webSpeachTranscribe();
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
          // onGotoTranscription();
        };
        mediaRecorder.start();
      });
  }, [
    onStartRecord,
    onStopRecord,
    webSpeachTranscribe,
    hasReactNativeWebview,
    postMessageToRN,
  ]);

  const stop = useCallback(() => {
    if (hasReactNativeWebview) {
      postMessageToRN({ type: "stop-record" });
      return;
    }
    if (mediaRecorderRef.current != null) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, [hasReactNativeWebview, postMessageToRN]);

  const pause = useCallback(() => {
    if (hasReactNativeWebview) {
      postMessageToRN({ type: "pause-record" });
      return;
    }
    if (mediaRecorderRef.current != null) {
      mediaRecorderRef.current.pause();
    }
  }, [hasReactNativeWebview, postMessageToRN]);

  const resume = useCallback(() => {
    if (hasReactNativeWebview) {
      postMessageToRN({ type: "resume-record" });
      return;
    }
    if (mediaRecorderRef.current != null) {
      mediaRecorderRef.current.resume();
    }
  }, [hasReactNativeWebview, postMessageToRN]);

  const onPressRecord = useCallback(() => {
    record();
  }, [record]);

  const onPressSave = useCallback(() => {
    stop();
  }, [stop]);

  const onPressPause = useCallback(() => {
    if (state === "recording") {
      pause();
      onPauseRecord();
    } else if (state === "paused") {
      resume();
      onResumeRecord();
    }
  }, [pause, resume, state, onPauseRecord, onResumeRecord]);

  const onPressCamera = useCallback(() => {
    postMessageToRN({ type: "open-camera" });
  }, [postMessageToRN]);

  const onGotoTranscription = useCallback(() => {
    console.log("url", `/recording/${lastIdRef.current}/`);
    if (lastIdRef.current === null) fakeTranscribe();
    router.push(`/recording/${lastIdRef.current}/`);
  }, [router, fakeTranscribe]);

  const onGotoPhotoBox = useCallback(() => {
    console.log("url", `/recording/${lastIdRef.current}/`);
    if (lastIdRef.current === null) fakeTranscribe();
    router.push(`/recording/${lastIdRef.current}/photo`);
  }, [router]);

  return (
    <div className="h-screen  bg-[#F6F6F9] flex flex-col">
      <Header
        title="Recording"
        renderRight={() => {
          if (false && !hasReactNativeWebview) {
            return <></>;
          }
          return (
            <button className="mr-[16px]" onClick={onPressCamera}>
              <span className="material-icons text-[#8E8E93] text-[30px]">
                photo_camera
              </span>
            </button>
          );
        }}
      />
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
          <>
            <audio controls>
              <source src={audioUrl} />
            </audio>
            <button
              className="mt-[16px] bg-[#09CC7F] rounded-[27px] px-[42px] py-[16px] items-center flex"
              onClick={onGotoTranscription}
            >
              <span className="ml-[4px] text-[15px] text-white font-[600]">
                Transcription
              </span>
            </button>
          </>
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
