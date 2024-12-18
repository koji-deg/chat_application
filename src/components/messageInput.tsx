﻿import { IconButton } from "./iconButton";
import { useTranslation } from 'react-i18next';
import { useState, useEffect, useCallback, useRef} from 'react';
//import { switchToNodAnimation, resetAnimation } from "@/components/vrmViewer"; // Assuming relative path to VrmViewer

type Props = {
  userMessage: string;
  isMicRecording: boolean;
  isChatProcessing: boolean;
  onChangeUserMessage: (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  onClickSendButton: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onClickMicButton: (event: React.MouseEvent<HTMLButtonElement>) => void;
};

export const MessageInput = ({
  userMessage,
  isMicRecording,
  isChatProcessing,
  onChangeUserMessage,
  onClickMicButton,
  onClickSendButton,
}: Props) => {
  const { t } = useTranslation();
  const [rows, setRows] = useState(1);
  const [loadingDots, setLoadingDots] = useState('');

  useEffect(() => {
    if (isChatProcessing) {
      const interval = setInterval(() => {
        setLoadingDots(prev => {
          if (prev === '...') return '';
          return prev + '.';
        });
      }, 200);

      return () => clearInterval(interval);
    }
  }, [isChatProcessing]);

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
  if (!event.nativeEvent.isComposing && event.key === 'Enter' && !event.shiftKey && userMessage.trim() !== '') {
    handleSendMessage(event); // handleSendMessageで送信とアニメーション再生
    setRows(1);
  } else if (event.key === 'Enter' && event.shiftKey) {
    setRows(rows + 1);
  } else if (event.key === 'Backspace' && rows > 1 && userMessage.slice(-1) === '\n') {
    setRows(rows - 1);
  }
};

const handleSendMessage = (event: React.MouseEvent<HTMLButtonElement> | React.KeyboardEvent<HTMLTextAreaElement>) => {
    // アニメーションを再生するためのカスタムイベントを発火
    const canvas = document.querySelector("canvas");
    if (canvas) {
      const playNodAnimationEvent = new Event("playNodAnimation");
      canvas.dispatchEvent(playNodAnimationEvent);
    }
    // 送信ボタンのクリック処理を呼び出す
    onClickSendButton(event as React.MouseEvent<HTMLButtonElement>);
  };

  return (
    <div className="absolute bottom-0 z-20 w-screen">
      <div className="bg-base text-black">
        <div className="mx-auto max-w-4xl p-16">
          <div className="grid grid-flow-col gap-[8px] grid-cols-[min-content_1fr_min-content]">
            <IconButton
              iconName="24/Microphone"
              className="bg-secondary hover:bg-secondary-hover active:bg-secondary-press disabled:bg-secondary-disabled"
              isProcessing={isMicRecording}
              disabled={isChatProcessing}
              onClick={onClickMicButton}
            />
            <textarea
              placeholder={isChatProcessing ? `${t('AnswerGenerating')}${loadingDots}` : "コメントを入力してください（例：こんにちは、今週の振り返りを手伝って！）"}
              onChange={onChangeUserMessage}
              onKeyDown={handleKeyPress}
              disabled={isChatProcessing}
              className="bg-surface1 hover:bg-surface1-hover focus:bg-surface1 disabled:bg-surface1-disabled disabled:text-primary-disabled rounded-16 w-full px-16 text-text-primary typography-16 font-bold disabled"
              value={isChatProcessing ? '' : userMessage}
              rows={rows}
              style={{ lineHeight: '1.5', padding: '8px 16px', resize: 'none' }}
            ></textarea>

            <IconButton
              iconName="24/Send"
              className="bg-secondary hover:bg-secondary-hover active:bg-secondary-press disabled:bg-secondary-disabled"
              isProcessing={isChatProcessing}
              disabled={isChatProcessing || !userMessage}
              onClick={handleSendMessage} // handleSendMessageで送信とアニメーション再生
            />
          </div>
        </div>
      </div>
    </div>
  );
};