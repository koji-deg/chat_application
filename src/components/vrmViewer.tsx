import { useContext, useCallback, useState } from "react";
import { ViewerContext } from "../features/vrmViewer/viewerContext";
import { buildUrl } from "@/utils/buildUrl";
import { toggleAvatar } from '@/features/constants/toggleAvatar'; 

export default function VrmViewer() {
  const { viewer } = useContext(ViewerContext);
  const [selectedAvatar, setSelectedAvatar] = useState('avatar1');
  const [isLoading, setIsLoading] = useState(false); // ローディング状態を管理

  const loadVrmForAvatar = useCallback(
    (avatar: string) => {
      const avatarVrmUrl = avatar === 'avatar1' 
        ? buildUrl("/AvatarSample_B.vrm") // avatar1用のVRMファイル
        : buildUrl("/AvatarSample_B_man.vrm"); // avatar2用のVRMファイル

      const loadAvatarVrm = async () => {
        try {
          setIsLoading(true); // ローディング開始
          await viewer.loadVrm(avatarVrmUrl); // VRMファイルを非同期でロード
        } catch (error) {
          console.error("Error loading VRM:", error); // エラーをキャッチしてログ出力
        } finally {
          setIsLoading(false); // ローディング終了
        }
      };

      loadAvatarVrm();
    },
    [viewer]
  );

  // アバター切り替えのためのハンドラー
  const handleToggleAvatar = useCallback(() => {
    toggleAvatar(setSelectedAvatar, setSelectedAvatar => {
      const newAvatar = setSelectedAvatar === 'avatar1' ? 'avatar2' : 'avatar1';
      loadVrmForAvatar(newAvatar); // アバター切り替え時にVRMファイルもロードする
      return newAvatar;
    });
  }, [loadVrmForAvatar]);

  const canvasRef = useCallback(
    (canvas: HTMLCanvasElement) => {
      if (canvas) {
        viewer.setup(canvas);
        loadVrmForAvatar(selectedAvatar); // 初期アバターのVRMを読み込む

        // Drag and DropでVRMを差し替え
        const handleDragOver = (event: DragEvent) => {
          event.preventDefault();
        };

        const handleDrop = (event: DragEvent) => {
          event.preventDefault();

          const files = event.dataTransfer?.files;
          if (!files || files.length === 0) {
            return;
          }

          const file = files[0];
          const fileType = file.name.split(".").pop()?.toLowerCase();
          if (fileType === "vrm") {
            const blob = new Blob([file], { type: "application/octet-stream" });
            const url = window.URL.createObjectURL(blob);

            // VRMを非同期でロード
            const loadDroppedVrm = async () => {
              try {
                setIsLoading(true); // ローディング開始
                await viewer.loadVrm(url); // ファイルのロード
              } catch (error) {
                console.error("Error loading dropped VRM:", error); // エラーをキャッチ
              } finally {
                setIsLoading(false); // ローディング終了
              }
            };

            loadDroppedVrm();
          } else {
            console.warn("Unsupported file type:", fileType); // ファイルタイプが異なる場合に警告
          }
        };

        // イベントリスナーの追加
        canvas.addEventListener("dragover", handleDragOver);
        canvas.addEventListener("drop", handleDrop);

        // クリーンアップ関数でイベントリスナーを削除
        return () => {
          canvas.removeEventListener("dragover", handleDragOver);
          canvas.removeEventListener("drop", handleDrop);
        };
      }
    },
    [viewer, selectedAvatar, loadVrmForAvatar]
  );

  return (
    <div className={"absolute top-0 left-0 w-screen h-[100svh]"}>
      <button onClick={handleToggleAvatar}>
        Toggle Avatar
      </button>
      <canvas ref={canvasRef} className={"h-full w-full"}></canvas>
      {isLoading && <div className="loading-spinner">Loading...</div>} {/* ローディング中の表示 */}
    </div>
  );
}
