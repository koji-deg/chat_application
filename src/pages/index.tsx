import { useCallback, useContext, useEffect, useState, useRef } from "react";
import VrmViewer from "@/components/vrmViewer";
import { ViewerContext } from "@/features/vrmViewer/viewerContext";
import {
  Message,
  textsToScreenplay,
  Screenplay,
} from "@/features/messages/messages";
import { speakCharacter } from "@/features/messages/speakCharacter";
import { MessageInputContainer } from "@/components/messageInputContainer";
import { SYSTEM_PROMPT } from "@/features/constants/systemPromptConstants";
import { KoeiroParam, DEFAULT_PARAM } from "@/features/constants/koeiroParam";
import { AIService, AIServiceConfig, getAIChatResponseStream } from "@/features/chat/aiChatFactory";
import { Introduction } from "@/components/introduction";
import { Menu } from "@/components/menu";
import { Meta } from "@/components/meta";
import "@/lib/i18n";
import { useTranslation } from 'react-i18next';
import { fetchAndProcessComments } from "@/features/youtube/youtubeComments";
import { buildUrl } from "@/utils/buildUrl";
// ここで toggleAvatar 関数をインポート
import { toggleAvatar } from '@/features/constants/toggleAvatar'; 

import { vrma } from "@/components/vrmViewer";


// サーバーサイドでAPIキーを取得する関数（SSR）
export async function getServerSideProps(context: any) {
  const ssrOpenAiKey = process.env.OPEN_AI_KEY;
  const ssrElevenlabsKey = process.env.ELEVENLABS_API_KEY;

  // エラーハンドリング
  if (!ssrOpenAiKey || !ssrElevenlabsKey) {
    return {
      props: {
        error: "APIキーが見つかりません",
      },
    };
  }

  // SSRからクライアント側に渡すpropsを返す
  return {
    props: {
      ssrOpenAiKey,
      ssrElevenlabsKey,
    },
  };
}

export default function Home({ ssrOpenAiKey, ssrElevenlabsKey }: { ssrOpenAiKey: string, ssrElevenlabsKey: string }) {
  const { viewer } = useContext(ViewerContext);

  const [systemPrompt, setSystemPrompt] = useState(SYSTEM_PROMPT);
  const [selectAIService, setSelectAIService] = useState("openai");
  const [selectAIModel, setSelectAIModel] = useState("gpt-4o-mini");
  const [openAiKey, setOpenAiKey] = useState(ssrOpenAiKey || "NG");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [googleKey, setGoogleKey] = useState("");
  const [groqKey, setGroqKey] = useState("");
  const [localLlmUrl, setLocalLlmUrl] = useState("");
  const [difyKey, setDifyKey] = useState("");
  const [difyUrl, setDifyUrl] = useState("");
  const [difyConversationId, setDifyConversationId] = useState("");
  const [selectVoice, setSelectVoice] = useState("elevenlabs");
  const [selectLanguage, setSelectLanguage] = useState("JP"); // TODO: 要整理, JP, EN
  const [selectVoiceLanguage, setSelectVoiceLanguage] = useState("ja-JP"); // TODO: 要整理, ja-JP, en-US
  const [changeEnglishToJapanese, setChangeEnglishToJapanese] = useState(false);
  const [koeiromapKey, setKoeiromapKey] = useState("");
  const [voicevoxSpeaker, setVoicevoxSpeaker] = useState("2");
  const [googleTtsType, setGoogleTtsType] = useState(process.env.NEXT_PUBLIC_GOOGLE_TTS_TYPE && process.env.NEXT_PUBLIC_GOOGLE_TTS_TYPE !== "" ? process.env.NEXT_PUBLIC_GOOGLE_TTS_TYPE : "");
  const [stylebertvits2ServerUrl, setStylebertvits2ServerURL] = useState("http://127.0.0.1:5000");
  const [stylebertvits2ModelId, setStylebertvits2ModelId] = useState("0");
  const [stylebertvits2Style, setStylebertvits2Style] = useState("Neutral");
  const [youtubeMode, setYoutubeMode] = useState(false);
  const [youtubeApiKey, setYoutubeApiKey] = useState("");
  const [youtubeLiveId, setYoutubeLiveId] = useState("");
  const [conversationContinuityMode, setConversationContinuityMode] = useState(false);
  const [koeiroParam, setKoeiroParam] = useState<KoeiroParam>(DEFAULT_PARAM);
  const [chatProcessing, setChatProcessing] = useState(false);
  const [chatLog, setChatLog] = useState<Message[]>([]);
  const [codeLog, setCodeLog] = useState<Message[]>([]);
  const [assistantMessage, setAssistantMessage] = useState("");
  const [webSocketMode, changeWebSocketMode] = useState(false);
  const [isVoicePlaying, setIsVoicePlaying] = useState(false); // WebSocketモード用の設定
  const { t } = useTranslation();
  const INTERVAL_MILL_SECONDS_RETRIEVING_COMMENTS = 5000; // 5秒
  const [backgroundImageUrl, setBackgroundImageUrl] = useState(
    process.env.NEXT_PUBLIC_BACKGROUND_IMAGE_PATH !== undefined ? process.env.NEXT_PUBLIC_BACKGROUND_IMAGE_PATH : "/bg-c.png"
  );
  const [dontShowIntroduction, setDontShowIntroduction] = useState(true);
  const [gsviTtsServerUrl, setGSVITTSServerUrl] = useState(process.env.NEXT_PUBLIC_LOCAL_TTS_URL && process.env.NEXT_PUBLIC_LOCAL_TTS_URL !== "" ? process.env.NEXT_PUBLIC_LOCAL_TTS_URL : "http://127.0.0.1:5000/tts");
  const [gsviTtsModelId, setGSVITTSModelID] = useState("");
  const [gsviTtsBatchSize, setGSVITTSBatchSize] = useState(2);
  const [gsviTtsSpeechRate, setGSVITTSSpeechRate] = useState(1.0);
  const [elevenlabsApiKey, setElevenlabsApiKey] = useState(ssrElevenlabsKey || "");
  const [elevenlabsVoiceId, setElevenlabsVoiceId] = useState("8EkOjt4xTPGMclNlh1pk");
  const [youtubeNextPageToken, setYoutubeNextPageToken] = useState("");
  const [youtubeContinuationCount, setYoutubeContinuationCount] = useState(0);
  const [youtubeNoCommentCount, setYoutubeNoCommentCount] = useState(0);
  const [youtubeSleepMode, setYoutubeSleepMode] = useState(false);
  const [chatProcessingCount, setChatProcessingCount] = useState(0);
  const [characterName, setCharacterName] = useState("AIアシスタント");
  const [showCharacterName, setShowCharacterName] = useState(true);

  const [selectedAvatar, setSelectedAvatar] = useState('avatar1'); // 初期はアバター1を選択

  const incrementChatProcessingCount = () => {
    setChatProcessingCount(prevCount => prevCount + 1);
  };

  const decrementChatProcessingCount = () => {
    setChatProcessingCount(prevCount => prevCount - 1);
  }

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const correctPassword = "aichat24"; // 正しいパスワードをここに設定

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === correctPassword) {
      setIsAuthenticated(true);
    } else {
      setErrorMessage("Incorrect password, please try again.");
    }
};

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
  if (isAuthenticated && audioRef.current) {
    audioRef.current.loop = true;
    audioRef.current.play().then(() => {
      // play()が完了した後に音量を設定
      if (audioRef.current) {  // 再度 null チェック
        audioRef.current.volume = 0.3; // 初期音量を30%に設定
      }
    }).catch((error) => {
      console.error("オーディオの再生に失敗しました:", error);
    });
  }
}, [isAuthenticated, audioRef.current]);  // isAuthenticated と audioRef.current が変わった時に再実行
 


  useEffect(() => {
    const storedData = window.localStorage.getItem("chatVRMParams");
    if (storedData) {
      const params = JSON.parse(storedData);
      setSystemPrompt(params.systemPrompt || SYSTEM_PROMPT);
      setKoeiroParam(params.koeiroParam || DEFAULT_PARAM);
      setChatLog(Array.isArray(params.chatLog) ? params.chatLog : []);
      setCodeLog(Array.isArray(params.codeLog) ? params.codeLog : []);
      setSelectAIService(params.selectAIService || "openai");
      setSelectAIModel(params.selectAIModel || "gpt-3.5-turbo");
      setOpenAiKey(params.openAiKey || "");
      setAnthropicKey(params.anthropicKey || "");
      setGoogleKey(params.googleKey || "");
      setGroqKey(params.groqKey || "");
      setLocalLlmUrl(params.localLlmUrl || "");
      setDifyKey(params.difyKey || "");
      setDifyUrl(params.difyUrl || "");
      setDifyConversationId(params.difyConversationId || "");
      setSelectVoice(params.selectVoice || "elevenlabs");
      setSelectLanguage(params.selectLanguage || "JP");
      setSelectVoiceLanguage(params.selectVoiceLanguage || "ja-JP");
      setChangeEnglishToJapanese(params.changeEnglishToJapanese || false);
      setKoeiromapKey(params.koeiromapKey || "");
      setVoicevoxSpeaker(params.voicevoxSpeaker || "2");
      setGoogleTtsType(params.googleTtsType || "en-US-Neural2-F");
      setYoutubeMode(params.youtubeMode || false);
      setYoutubeApiKey(params.youtubeApiKey || "");
      setYoutubeLiveId(params.youtubeLiveId || "");
      setConversationContinuityMode(params.conversationContinuityMode || false);
      changeWebSocketMode(params.webSocketMode || false);
      setStylebertvits2ServerURL(params.stylebertvits2ServerUrl || "http://127.0.0.1:5000");
      setStylebertvits2ModelId(params.stylebertvits2ModelId || "0");
      setStylebertvits2Style(params.stylebertvits2Style || "Neutral");
      setDontShowIntroduction(params.dontShowIntroduction || false);
      setGSVITTSServerUrl(params.gsviTtsServerUrl || "http://127.0.0.1:5000/tts");
      setGSVITTSModelID(params.gsviTtsModelId || "");
      setGSVITTSBatchSize(params.gsviTtsBatchSize || 2);
      setGSVITTSSpeechRate(params.gsviTtsSpeechRate || 1.0);
      setElevenlabsApiKey(params.elevenlabsApiKey || "");
      setElevenlabsVoiceId(params.elevenlabsVoiceId || "");
      setCharacterName(params.characterName || "AIアシスタント");
      setShowCharacterName(params.showCharacterName || true);
    }
  }, []);

  useEffect(() => {
    const params = {
      systemPrompt,
      koeiroParam,
      chatLog,
      codeLog,
      selectAIService,
      selectAIModel,
      openAiKey,
      anthropicKey,
      googleKey,
      groqKey,
      localLlmUrl,
      difyKey,
      difyUrl,
      difyConversationId,
      selectVoice,
      selectLanguage,
      selectVoiceLanguage,
      changeEnglishToJapanese,
      koeiromapKey,
      voicevoxSpeaker,
      googleTtsType,
      youtubeMode,
      youtubeApiKey,
      youtubeLiveId,
      conversationContinuityMode,
      webSocketMode,
      stylebertvits2ServerUrl,
      stylebertvits2ModelId,
      stylebertvits2Style,
      dontShowIntroduction,
      gsviTtsServerUrl,
      gsviTtsModelId,
      gsviTtsBatchSize,
      gsviTtsSpeechRate,
      elevenlabsApiKey,
      elevenlabsVoiceId,
      characterName,
      showCharacterName
    };
    process.nextTick(() =>
      window.localStorage.setItem(
        "chatVRMParams", JSON.stringify(params)
      )
    );
  }, [
    systemPrompt,
    koeiroParam,
    chatLog,
    codeLog,
    selectAIService,
    selectAIModel,
    openAiKey,
    anthropicKey,
    googleKey,
    localLlmUrl,
    groqKey,
    difyKey,
    difyUrl,
    difyConversationId,
    selectVoice,
    selectLanguage,
    selectVoiceLanguage,
    changeEnglishToJapanese,
    koeiromapKey,
    voicevoxSpeaker,
    googleTtsType,
    youtubeMode,
    youtubeApiKey,
    youtubeLiveId,
    conversationContinuityMode,
    webSocketMode,
    stylebertvits2ServerUrl,
    stylebertvits2ModelId,
    stylebertvits2Style,
    dontShowIntroduction,
    gsviTtsServerUrl,
    gsviTtsModelId,
    gsviTtsBatchSize,
    gsviTtsSpeechRate,
    elevenlabsApiKey,
    elevenlabsVoiceId,
    characterName,
    showCharacterName
  ]);

  const handleChangeChatLog = useCallback(
    (targetIndex: number, text: string) => {
      const newChatLog = chatLog.map((v: Message, i) => {
        return i === targetIndex ? { role: v.role, content: text } : v;
      });

      setChatLog(newChatLog);
    },
    [chatLog]
  );

  const handleChangeCodeLog = useCallback(
    async (targetIndex: number, text: string) => {
      const newCodeLog = codeLog.map((v: Message, i) => {
        return i === targetIndex ? { role: v.role, content: text} : v;
      });

      setCodeLog(newCodeLog);
    },
    [codeLog]
  );

  /**
   * 文ごとに音声を直列でリクエストしながら再生する
   */
  const handleSpeakAi = useCallback(
    async (
      screenplay: Screenplay,
      onStart?: () => void,
      onEnd?: () => void
    ) => {
      speakCharacter(
        screenplay,
        viewer,
        selectVoice,
        selectLanguage,
        koeiromapKey,
        voicevoxSpeaker,
        googleTtsType,
        stylebertvits2ServerUrl,
        stylebertvits2ModelId,
        stylebertvits2Style,
        gsviTtsServerUrl,
        gsviTtsModelId,
        gsviTtsBatchSize,
        gsviTtsSpeechRate,
        elevenlabsApiKey,
        elevenlabsVoiceId,
        changeEnglishToJapanese,
        onStart,
        onEnd
      );
    },
    [
      viewer,
      selectVoice,
      selectLanguage,
      koeiromapKey,
      voicevoxSpeaker,
      googleTtsType,
      stylebertvits2ServerUrl,
      stylebertvits2ModelId,
      stylebertvits2Style,
      gsviTtsServerUrl,
      gsviTtsModelId,
      gsviTtsBatchSize,
      gsviTtsSpeechRate,
      elevenlabsApiKey,
      elevenlabsVoiceId,
      changeEnglishToJapanese
    ]
  );

  const wsRef = useRef<WebSocket | null>(null);

  /**
   * AIからの応答を処理する関数
   * @param currentChatLog ログに残るメッセージの配列
   * @param messages 解答生成に使用するメッセージの配列
   */
  const processAIResponse = useCallback(async (currentChatLog: Message[], messages: Message[]) => {
    setChatProcessing(true);
    let stream;

    const aiServiceConfig: AIServiceConfig = {
      openai: { key: openAiKey || process.env.OPEN_AI_KEY || "", model: selectAIModel },
      anthropic: { key: anthropicKey || process.env.NEXT_PUBLIC_ANTHROPIC_KEY || "", model: selectAIModel },
      google: { key: googleKey || process.env.NEXT_PUBLIC_GOOGLE_KEY || "", model: selectAIModel },
      localLlm: { url: localLlmUrl || process.env.NEXT_PUBLIC_LOCAL_LLM_URL || "", model: selectAIModel || process.env.NEXT_PUBLIC_LOCAL_LLM_MODEL || "" },
      groq: { key: groqKey || process.env.NEXT_PUBLIC_GROQ_KEY || "", model: selectAIModel },
      dify: { 
        key: difyKey || process.env.NEXT_PUBLIC_DIFY_KEY || "", 
        url: difyUrl || process.env.NEXT_PUBLIC_DIFY_URL || "",
        conversationId: difyConversationId,
        setConversationId: setDifyConversationId
      }
    };

    try {
      stream = await getAIChatResponseStream(selectAIService as AIService, messages, aiServiceConfig);
    } catch (e) {
      console.error(e);
      stream = null;
    }

    if (stream == null) {
      setChatProcessing(false);
      return;
    }

    const reader = stream.getReader();
    let receivedMessage = "";
    let aiTextLog: Message[] = []; // 会話ログ欄で使用
    let tag = "";
    let isCodeBlock = false;
    let codeBlockText = "";
    const sentences = new Array<string>(); // AssistantMessage欄で使用
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done && receivedMessage.length === 0) break;

        if (value) receivedMessage += value;

        // 返答内容のタグ部分と返答部分を分離
        const tagMatch = receivedMessage.match(/^\[(.*?)\]/);
        if (tagMatch && tagMatch[0]) {
          tag = tagMatch[0];
          receivedMessage = receivedMessage.slice(tag.length);
        }

        // 返答を一文単位で切り出して処理する
        while (receivedMessage.length > 0) {
          const sentenceMatch = receivedMessage.match(/^(.+?[。．.!?！？\n]|.{20,}[、,])/);
          if (sentenceMatch?.[0]) {
            let sentence = sentenceMatch[0];
            // 区切った文字をsentencesに追加
            sentences.push(sentence);
            // 区切った文字の残りでreceivedMessageを更新
            receivedMessage = receivedMessage.slice(sentence.length).trimStart();

            // 発話不要/不可能な文字列だった場合はスキップ
            if (
              !sentence.includes("```") && !sentence.replace(/^[\s\u3000\t\n\r\[\(\{「［（【『〈《〔｛«‹〘〚〛〙›»〕》〉』】）］」\}\)\]'"''""・、。,.!?！？:：;；\-_=+~～*＊@＠#＃$＄%％^＾&＆|｜\\＼/／`｀]+$/gu, "")
            ) {
              continue;
            }

            // タグと返答を結合（音声再生で使用される）
            let aiText = `${tag} ${sentence}`;
            console.log("aiText", aiText);

            if (isCodeBlock && !sentence.includes("```")) {
              codeBlockText += sentence;
              continue;
            }

            if (sentence.includes("```")) {
              if (isCodeBlock) {
                // コードブロックの終了処理
                const [codeEnd, ...restOfSentence] = sentence.split("```");
                aiTextLog.push({ role: "code", content: codeBlockText + codeEnd });
                aiText += `${tag} ${restOfSentence.join("```") || ""}`;

                // AssistantMessage欄の更新
                setAssistantMessage(sentences.join(" "));

                codeBlockText = "";
                isCodeBlock = false;
              } else {
                // コードブロックの開始処理
                isCodeBlock = true;
                [aiText, codeBlockText] = aiText.split("```");
              }

              sentence = sentence.replace(/```/g, "");
            }

            const aiTalks = textsToScreenplay([aiText], koeiroParam);
            aiTextLog.push({ role: "assistant", content: sentence });

            // 文ごとに音声を生成 & 再生、返答を表示
            const currentAssistantMessage = sentences.join(" ");

            handleSpeakAi(aiTalks[0], () => {
              setAssistantMessage(currentAssistantMessage);
              incrementChatProcessingCount();
            }, () => {
              decrementChatProcessingCount();
            });
          } else {
            // マッチする文がない場合、ループを抜ける
            break;
          }
        }

        // ストリームが終了し、receivedMessageが空でない場合の処理
        if (done && receivedMessage.length > 0) {
          // 残りのメッセージを処理
          let aiText = `${tag} ${receivedMessage}`;
          const aiTalks = textsToScreenplay([aiText], koeiroParam);
          aiTextLog.push({ role: "assistant", content: receivedMessage });
          sentences.push(receivedMessage);

          const currentAssistantMessage = sentences.join(" ");

          handleSpeakAi(aiTalks[0], () => {
            setAssistantMessage(currentAssistantMessage);
            incrementChatProcessingCount();
          }, () => {
            decrementChatProcessingCount();
          });

          receivedMessage = "";
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      reader.releaseLock();
    }

    // 直前のroleと同じならば、contentを結合し、空のcontentを除外する
    aiTextLog = aiTextLog.reduce((acc: Message[], item: Message) => {
      const lastItem = acc[acc.length - 1];
      if (lastItem && lastItem.role === item.role) {
        lastItem.content += " " + item.content;
      } else {
        acc.push({ ...item, content: item.content.trim() });
      }
      return acc;
    }, []).filter(item => item.content !== "");

    setChatLog([...currentChatLog, ...aiTextLog]);
    setChatProcessing(false);
  }, [selectAIService, openAiKey, selectAIModel, anthropicKey, googleKey, localLlmUrl, groqKey, difyKey, difyUrl, difyConversationId, koeiroParam, handleSpeakAi]);

  const preProcessAIResponse = useCallback(async (messages: Message[]) => {
    await processAIResponse(chatLog, messages);
  }, [chatLog, processAIResponse]);

  /**
   * アシスタントとの会話を行う
   */
  const handleSendChat = useCallback(
    async (text: string, role?: string) => {
      const newMessage = text;

      if (newMessage == null) {
        return;
      }

      if (webSocketMode) {
        // 未メンテなので不具合がある可能性あり
        console.log("websocket mode: true")
        setChatProcessing(true);

        if (role !== undefined && role !== "user") {
          // WebSocketからの返答を処理

          if (role == "assistant") {
            let aiText = `${"[neutral]"} ${newMessage}`;
            try {
              const aiTalks = textsToScreenplay([aiText], koeiroParam);

              // 文ごとに音声を生成 & 再生、返答を表示
              handleSpeakAi(aiTalks[0], async () => {
                // アシスタントの返答をログに追加
                const updateLog: Message[] = [
                  ...codeLog,
                  { role: "assistant", content: newMessage },
                ];
                setChatLog(updateLog);
                setCodeLog(updateLog);

                setAssistantMessage(newMessage);
                setIsVoicePlaying(false);
                setChatProcessing(false);
              });
            } catch (e) {
              setIsVoicePlaying(false);
              setChatProcessing(false);
            }
          } else if (role == "code" || role == "output" || role == "executing"){ // コードコメントの処理
            // ループ完了後にAI応答をコードログに追加
            const updateLog: Message[] = [
              ...codeLog,
              { role: role, content: newMessage },
            ];
            setCodeLog(updateLog);
            setChatProcessing(false);
          } else { // その他のコメントの処理（現想定では使用されないはず）
            console.log("error role:", role)
          }
        } else {
          // WebSocketで送信する処理

          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            // ユーザーの発言を追加して表示
            const updateLog: Message[] = [
              ...codeLog,
              { role: "user", content: newMessage },
            ];
            setChatLog(updateLog);
            setCodeLog(updateLog);

            // WebSocket送信
            wsRef.current.send(JSON.stringify({content: newMessage, type: "chat"}));
          } else {
            setAssistantMessage(t('NotConnectedToExternalAssistant'));
            setChatProcessing(false);
          }
        }
      } else {
        // ChatVRM original mode
        if (selectAIService === "openai" && !openAiKey && !process.env.OPEN_AI_KEY ||
        selectAIService === "anthropic" && !anthropicKey && !process.env.NEXT_PUBLIC_ANTHROPIC_KEY ||
        selectAIService === "google" && !googleKey && !process.env.NEXT_PUBLIC_GOOGLE_KEY ||
        selectAIService === "groq" && !groqKey && !process.env.NEXT_PUBLIC_GROQ_KEY ||
        selectAIService === "dify" && !difyKey && !process.env.NEXT_PUBLIC_DIFY_KEY) {
          setAssistantMessage(t('APIKeyNotEntered'));
          return;
        }

        setChatProcessing(true);
        // ユーザーの発言を追加して表示
        const messageLog: Message[] = [
          ...chatLog,
          { role: "user", content: newMessage },
        ];
        setChatLog(messageLog);

        const processedMessageLog = messageLog.map(message => ({
          role: ['assistant', 'user', 'system'].includes(message.role) ? message.role : 'assistant',
          content: message.content
        }));

        const messages: Message[] = [
          {
            role: "system",
            content: systemPrompt,
          },
          ...processedMessageLog.slice(-10),
        ];

        try {
          await processAIResponse(messageLog, messages);
        } catch (e) {
          console.error(e);
        }
  
        setChatProcessing(false);
      }
    },
    [webSocketMode, koeiroParam, handleSpeakAi, codeLog, t, selectAIService, openAiKey, anthropicKey, googleKey, groqKey, difyKey, chatLog, systemPrompt, processAIResponse]
  );

  ///取得したコメントをストックするリストの作成（tmpMessages）
  interface tmpMessage {
    text: string;
    role: string;
    emotion: string;
  }
  const [tmpMessages, setTmpMessages] = useState<tmpMessage[]>([]);

  useEffect(() => {
    const handleOpen = (event: Event) => {
      console.log("WebSocket connection opened:", event);
    };
    const handleMessage = (event: MessageEvent) => {
      console.log("Received message:", event.data);
      const jsonData = JSON.parse(event.data);
      setTmpMessages((prevMessages) => [...prevMessages, jsonData]);
    };
    const handleError = (event: Event) => {
      console.error("WebSocket error:", event);
    };
    const handleClose = (event: Event) => {
      console.log("WebSocket connection closed:", event);
    };

    function setupWebsocket() {
      const ws = new WebSocket("ws://localhost:8000/ws");
      ws.addEventListener("open", handleOpen);
      ws.addEventListener("message", handleMessage);
      ws.addEventListener("error", handleError);
      ws.addEventListener("close", handleClose);
      return ws;
    }
    let ws = setupWebsocket();
    wsRef.current = ws;

    const reconnectInterval = setInterval(() => {
      if (webSocketMode && ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CONNECTING) {
        setChatProcessing(false);
        console.log("try reconnecting...");
        ws.close();
        ws = setupWebsocket();
        wsRef.current = ws;
      }
    }, 1000);

    return () => {
      clearInterval(reconnectInterval);
      ws.close();
    };
  }, [webSocketMode]);

  // WebSocketモード用の処理
  useEffect(() => {
    if (tmpMessages.length > 0 && !isVoicePlaying) {
      const message = tmpMessages[0];
      if (message.role == "assistant") { setIsVoicePlaying(true) };
      setTmpMessages((tmpMessages) => tmpMessages.slice(1));
      handleSendChat(message.text, message.role);
    }
  }, [tmpMessages, isVoicePlaying, handleSendChat]);

  // YouTubeコメントを取得する処理
  const fetchAndProcessCommentsCallback = useCallback(async() => {
    if (!openAiKey || !youtubeLiveId || !youtubeApiKey || chatProcessing || chatProcessingCount > 0) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, INTERVAL_MILL_SECONDS_RETRIEVING_COMMENTS));
    console.log("Call fetchAndProcessComments !!!");

    fetchAndProcessComments(
      systemPrompt,
      chatLog,
      selectAIService === "anthropic" ? anthropicKey : openAiKey,
      selectAIService,
      selectAIModel,
      youtubeLiveId,
      youtubeApiKey,
      youtubeNextPageToken,
      setYoutubeNextPageToken,
      youtubeNoCommentCount,
      setYoutubeNoCommentCount,
      youtubeContinuationCount,
      setYoutubeContinuationCount,
      youtubeSleepMode,
      setYoutubeSleepMode,
      conversationContinuityMode,
      handleSendChat,
      preProcessAIResponse
    );
  }, [openAiKey, youtubeLiveId, youtubeApiKey, chatProcessing, chatProcessingCount, systemPrompt, chatLog, selectAIService, anthropicKey, selectAIModel, youtubeNextPageToken, youtubeNoCommentCount, youtubeContinuationCount, youtubeSleepMode, conversationContinuityMode, handleSendChat, preProcessAIResponse]);

  useEffect(() => {
    console.log("chatProcessingCount:", chatProcessingCount);
    fetchAndProcessCommentsCallback();
  }, [chatProcessingCount, youtubeLiveId, youtubeApiKey, conversationContinuityMode]);

  useEffect(() => {
    if (youtubeNoCommentCount < 1) return;
    console.log("youtubeSleepMode:", youtubeSleepMode);
    setTimeout(() => {
      fetchAndProcessCommentsCallback();
    }, INTERVAL_MILL_SECONDS_RETRIEVING_COMMENTS);
  }, [youtubeNoCommentCount, conversationContinuityMode]);

  const [isHovered, setIsHovered] = useState(false);

  const notice_items = [
    '①5-10分程度を目安にご利用ください。',
    '②リンク・パスワードの情報は第三者に共有しないようご注意願います。',
    '③現状対話記録は残らない仕様になっておりますが、秘匿性の高い情報などはインプットしないようにご配慮願います。',
    '④音声が流れる仕様になっていますので、起動時にはご注意ください。'
  ];

  const infoItems = [
    {
      beforeText:'①',
      text: 'アンケート',
      link: 'https://forms.gle/WgSeXsCrMesKMez1A',
      afterText: 'へのご協力をお願いいたします。'
    },
    {
      text: '②下記のQRコードで、モバイル端末からもご使用いただけます'
    }
  ];


  const styles = {
  card: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
    maxWidth: '600px',
    margin: '16px auto', // 上下左右に余白を設定
    backgroundColor: '#fff'
  },
  list: {
    padding: '0',
    margin: '0',
    listStylePosition: 'inside' as const, // 型を修正
    textAlign: 'left' as const // 必要であればこちらも修正
  },
  listItem: {
    marginBottom: '8px'
  },
  link: {
    color: '#007BFF',
    textDecoration: 'none'
  }
};

  return (
    <>

    <div>
      {!isAuthenticated ? (
        
      <div style={{ textAlign: "center", marginTop: "20vh" }}>
      <h1 style={{ 
          padding: "20px", 
          fontSize: "40px", 
          fontWeight: "bold", 
          color: "#007BFF", 
          backgroundColor: "#F0F0F0",
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%", }}>
        振り返り支援機能（デモ版）
        </h1>    
      <h1 style={{ padding: "10px", fontSize: "20px" }}>パスワードを入力してください</h1>
          <form onSubmit={handlePasswordSubmit}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              style={{ padding: "10px", fontSize: "20px" }}
            />
            <button
      type="submit"
      style={{
        padding: "10px 20px",
        marginLeft: "10px",
        backgroundColor: isHovered ? "#ff5733" : "#c04621", // ホバー時の背景色を動的に変更
        color: "#ffffff",
        border: "none",
        borderRadius: "5px",
        cursor: "pointer",
        transition: "background-color 0.3s ease", // スムーズな色変化
      }}
      onMouseEnter={() => setIsHovered(true)} // ホバーしたときに状態を変更
      onMouseLeave={() => setIsHovered(false)} // ホバーを外したときに状態を元に戻す
    >
      Submit
    </button>
          </form>
          {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
        
          

          <div style={styles.card}>
          <p style={{ padding: "10px", fontSize: "20px" }}>【注意事項】</p>  
      <ol style={styles.list}>
        {notice_items.map((item, index) => ( 
        <li key={index} style={styles.listItem}>
            {item}
          </li>
        ))}
      </ol>
    </div>

    <div style={styles.card}>
          <p style={{ padding: "10px", fontSize: "20px" }}>【その他】</p>  
      <ol style={styles.list}>
  {infoItems.map((item, index) => (
    <li key={index} style={styles.listItem}>
      {item.link ? (
        <>
          {item.beforeText}
          <a href={item.link} style={styles.link} target="_blank" rel="noopener noreferrer">
            {item.text}
          </a>
          {item.afterText}
        </>
      ) : (
        item.text
      )}
    </li>
  ))}
</ol>

      <img src="./qrcode_aichat-application.vercel.app.png" width="200" />
    </div>

          </div>
      ) : (
        <div>
          {/* パスワードが正しい場合に表示されるコンテンツ */}
          <div className={"font-M_PLUS_2"} style={{ backgroundImage: `url(${buildUrl(backgroundImageUrl)})`, backgroundSize: 'cover', minHeight: '100vh' }}>

    
    
    <Meta />
        {!dontShowIntroduction && (
          <Introduction
            dontShowIntroduction={dontShowIntroduction}
            onChangeDontShowIntroduction={setDontShowIntroduction}
            selectLanguage={selectLanguage}
            setSelectLanguage={setSelectLanguage}
            setSelectVoiceLanguage={setSelectVoiceLanguage}
          />
        )}
        <VrmViewer />
        
        {/* BGMの再生用オーディオタグ */}
        <div style={{ textAlign: 'right' }}>
       <audio ref={audioRef} src={buildUrl("/bgm.mp3")} controls autoPlay loop></audio>
        </div>

        <MessageInputContainer
          isChatProcessing={chatProcessing}
          onChatProcessStart={handleSendChat}
          selectVoiceLanguage={selectVoiceLanguage}
        />


        <Menu
          selectAIService={selectAIService}
          onChangeAIService={setSelectAIService}
          selectAIModel={selectAIModel}
          setSelectAIModel={setSelectAIModel}
          openAiKey={openAiKey}
          onChangeOpenAiKey={setOpenAiKey}
          anthropicKey={anthropicKey}
          onChangeAnthropicKey={setAnthropicKey}
          googleKey={googleKey}
          onChangeGoogleKey={setGoogleKey}
          groqKey={groqKey}
          onChangeGroqKey={setGroqKey}
          localLlmUrl={localLlmUrl}
          onChangeLocalLlmUrl={setLocalLlmUrl}
          difyKey={difyKey}
          onChangeDifyKey={setDifyKey}
          difyUrl={difyUrl}
          onChangeDifyUrl={setDifyUrl}
          difyConversationId={difyConversationId}
          onChangeDifyConversationId={setDifyConversationId}
          systemPrompt={systemPrompt}
          chatLog={chatLog}
          codeLog={codeLog}
          koeiroParam={koeiroParam}
          assistantMessage={assistantMessage}
          koeiromapKey={koeiromapKey}
          voicevoxSpeaker={voicevoxSpeaker}
          googleTtsType={googleTtsType}
          stylebertvits2ServerUrl={stylebertvits2ServerUrl}
          stylebertvits2ModelId={stylebertvits2ModelId}
          stylebertvits2Style={stylebertvits2Style}
          youtubeMode={youtubeMode}
          youtubeApiKey={youtubeApiKey}
          youtubeLiveId={youtubeLiveId}
          conversationContinuityMode={conversationContinuityMode}
          onChangeSystemPrompt={setSystemPrompt}
          onChangeChatLog={handleChangeChatLog}
          onChangeCodeLog={handleChangeCodeLog}
          onChangeKoeiromapParam={setKoeiroParam}
          onChangeYoutubeMode={setYoutubeMode}
          onChangeYoutubeApiKey={setYoutubeApiKey}
          onChangeYoutubeLiveId={setYoutubeLiveId}
          onChangeConversationContinuityMode={setConversationContinuityMode}
          handleClickResetChatLog={() => setChatLog([])}
          handleClickResetCodeLog={() => setCodeLog([])}
          handleClickResetSystemPrompt={() => setSystemPrompt(SYSTEM_PROMPT)}
          onChangeKoeiromapKey={setKoeiromapKey}
          onChangeVoicevoxSpeaker={setVoicevoxSpeaker}
          onChangeGoogleTtsType={setGoogleTtsType}
          onChangeStyleBertVits2ServerUrl={setStylebertvits2ServerURL}
          onChangeStyleBertVits2ModelId={setStylebertvits2ModelId}
          onChangeStyleBertVits2Style={setStylebertvits2Style}
          webSocketMode={webSocketMode}
          changeWebSocketMode={changeWebSocketMode}
          selectVoice={selectVoice}
          setSelectVoice={setSelectVoice}
          selectLanguage={selectLanguage}
          setSelectLanguage={setSelectLanguage}
          setSelectVoiceLanguage={setSelectVoiceLanguage}
          changeEnglishToJapanese={changeEnglishToJapanese}
          setChangeEnglishToJapanese={setChangeEnglishToJapanese}
          setBackgroundImageUrl={setBackgroundImageUrl}
          gsviTtsServerUrl={gsviTtsServerUrl}
          onChangeGSVITtsServerUrl={setGSVITTSServerUrl}
          gsviTtsModelId={gsviTtsModelId}
          onChangeGSVITtsModelId={setGSVITTSModelID}
          gsviTtsBatchSize={gsviTtsBatchSize}
          onChangeGVITtsBatchSize={setGSVITTSBatchSize}
          gsviTtsSpeechRate={gsviTtsSpeechRate}
          onChangeGSVITtsSpeechRate={setGSVITTSSpeechRate}
          elevenlabsApiKey={elevenlabsApiKey}
          onChangeElevenlabsApiKey={setElevenlabsApiKey}
          elevenlabsVoiceId={elevenlabsVoiceId}
          onChangeElevenlabsVoiceId={setElevenlabsVoiceId}
          showCharacterName={showCharacterName}
          onChangeShowCharacterName={setShowCharacterName}
          characterName={characterName}
          onChangeCharacterName={setCharacterName}
        />

      </div>

        </div>
      )}
    </div>  


    </>
  );
}

