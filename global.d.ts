// TypeScript doesn't recognize window.ReactNativeWebView by default since it's not a standard window property.
interface Window {
  ReactNativeWebView?: {
    postMessage: (message: string) => void;
  };
}
