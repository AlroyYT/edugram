import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import "katex/dist/katex.min.css";

import { backend_url } from "./config";

interface Message {
  role: "user" | "model";
  text: string;
}

const SUGGESTIONS = [
  "Explain quantum entanglement simply",
  "Write a Python web scraper",
  "What are black holes made of?",
  "Give me a 7-day workout plan",
];

export default function LomSignAssistant() {

  /******************************************************
   *
   * Chat States
   *
   ******************************************************/

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamedText, setStreamedText] = useState("");

  /******************************************************
   *
   * Sign Language States
   *
   ******************************************************/

  const [signMode, setSignMode] = useState(false);

  const [currentGesture, setCurrentGesture] = useState("");

  const [gestureSentence, setGestureSentence] = useState("");

  const [signHistory, setSignHistory] = useState<string[]>([]);

  const [arduinoConnected, setArduinoConnected] = useState(false);

  const [animationText, setAnimationText] = useState("");

  /******************************************************
   *
   * Refs
   *
   ******************************************************/

  const bottomRef = useRef<HTMLDivElement>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const websocketRef = useRef<WebSocket | null>(null);

  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const lastGestureRef = useRef("");

  const animationQueueRef = useRef<string[]>([]);

  /******************************************************
   *
   * Auto Scroll
   *
   ******************************************************/

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, streamedText]);

  useEffect(() => {

    if (!signMode) {

        websocketRef.current?.close();
        setArduinoConnected(false);

        return;
    }

    const ws = new WebSocket("ws://127.0.0.1:8000/ws/sign-text/");

    websocketRef.current = ws;

    ws.onopen = () => {

        console.log("Arduino Connected");

        setArduinoConnected(true);

    };

    ws.onclose = () => {

        console.log("Arduino Disconnected");

        setArduinoConnected(false);

    };

    ws.onerror = () => {

        console.log("WebSocket Error");

        setArduinoConnected(false);

    };

    return () => {

        ws.close();

    };

}, [signMode]);

  /******************************************************
   *
   * Auto Resize
   *
   ******************************************************/

  const autoResize = () => {
    const ta = textareaRef.current;

    if (!ta) return;

    ta.style.height = "auto";

    ta.style.height =
      Math.min(ta.scrollHeight, 200) + "px";
  };

  /******************************************************
   *
   * Send Prompt to Jarvis
   *
   ******************************************************/

  const send = async (
    overrideText?: string
  ) => {

    const text =
      (overrideText ?? input).trim();

    if (!text || loading) return;

    const userMsg: Message = {
      role: "user",
      text,
    };

    const newMessages = [
      ...messages,
      userMsg,
    ];

    setMessages(newMessages);

    setInput("");

    setLoading(true);

    setStreamedText("");

    if (textareaRef.current)
      textareaRef.current.style.height = "auto";

    try {

      const res = await fetch("/api/root", {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          messages: newMessages,
        }),
      });

      if (!res.ok)
        throw new Error();

      const reader =
        res.body!.getReader();

      const decoder =
        new TextDecoder();

      let accumulated = "";

      while (true) {

        const {
          done,
          value,
        } = await reader.read();

        if (done) break;

        const chunk =
          decoder.decode(value, {
            stream: true,
          });

        const lines =
          chunk.split("\n");

        for (const line of lines) {

          if (
            !line.startsWith("data: ")
          )
            continue;

          const data =
            line.slice(6);

          if (data === "[DONE]")
            continue;

          try {

            const parsed =
              JSON.parse(data);

            if (
              parsed.text
            ) {

              accumulated +=
                parsed.text;

              setStreamedText(
                accumulated
              );
            }

          } catch {}
        }
      }

      setMessages([
        ...newMessages,
        {
          role: "model",
          text: accumulated,
        },
      ]);

      /*****************************************
       *
       * NEW
       *
       * Start Sign Animation
       *
       *****************************************/

      if (
        signMode &&
        accumulated.trim()
      ) {

        setAnimationText(
          accumulated
        );
      }

      setStreamedText("");

    } catch {

      setMessages([
        ...newMessages,
        {
          role: "model",
          text:
            "Something went wrong.",
        },
      ]);

      setStreamedText("");
    }

    finally {

      setLoading(false);

    }

  };

  /******************************************************
   *
   * Arduino WebSocket
   *
   ******************************************************/

  useEffect(() => {

    if (!signMode)
      return;

    const ws =
      new WebSocket(
        backend_url.replace(
          "http",
          "ws"
        ) +
          "/ws/sign-text/"
      );

    websocketRef.current = ws;

    ws.onopen = () => {

      console.log(
        "Arduino Connected"
      );

      setArduinoConnected(
        true
      );

    };

    ws.onclose = () => {

      console.log(
        "Arduino Disconnected"
      );

      setArduinoConnected(
        false
      );

    };

    ws.onerror = () => {

      setArduinoConnected(
        false
      );

    };

    ws.onmessage = (
      event
    ) => {

      try {

        const data =
          JSON.parse(
            event.data
          );

        const word =
          data.word?.trim();

        if (!word)
          return;

        if (
          word ===
          lastGestureRef.current
        )
          return;

        lastGestureRef.current =
          word;

        setCurrentGesture(
          word
        );

        setGestureSentence(
          (prev) =>

            prev
              ? prev +
                  " " +
                  word
              : word
        );

        /**********************************
         *
         * Reset 4 sec timer
         *
         **********************************/

        if (
          idleTimerRef.current
        ) {

          clearTimeout(
            idleTimerRef.current
          );

        }

        idleTimerRef.current =
          setTimeout(() => {

            setGestureSentence(
              (sentence) => {

                if (
                  !sentence.trim()
                )
                  return "";

                setSignHistory(
                  (
                    history
                  ) => [

                    sentence,

                    ...history,

                  ]
                );

                send(
                  sentence
                );

                return "";

              }
            );

          }, 4000);

      }

      catch (err) {

        console.error(
          err
        );

      }

    };

    return () => {

      ws.close();

      if (
        idleTimerRef.current
      )

        clearTimeout(
          idleTimerRef.current
        );

    };

  }, [signMode]);

  return null;
}
