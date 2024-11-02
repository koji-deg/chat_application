import { useContext, useCallback, useState } from "react";
import { ViewerContext } from "../features/vrmViewer/viewerContext";
import { buildUrl } from "@/utils/buildUrl";
//import { toggleAvatar } from '@/features/constants/toggleAvatar'; 

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

  const switchToNodAnimation = () => {
    viewer.loadVrma(buildUrl("/うなづき.vrma"));
  };

  const resetAnimation = () => {
    setTimeout(() => {
      viewer.loadVrma(buildUrl("/idle2.vrma"));
    }, 4800);
  };


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

        // Add event listener for custom 'playNodAnimation' event
        canvas.addEventListener("playNodAnimation", () => {
          switchToNodAnimation(); // nod animationを再生
          resetAnimation(); // 1.5秒後にidle animationに戻す
        });

        // Drag and DropでVRMを差し替え
        canvas.addEventListener("dragover", function (event) {
          event.preventDefault();
        });

        canvas.addEventListener("drop", function (event) {
          event.preventDefault();

          const files = event.dataTransfer?.files;
          if (!files) {
            return;
          }

          const file = files[0];
          if (!file) {
            return;
          }

          const file_type = file.name.split(".").pop();
          const blob = new Blob([file], { type: "application/octet-stream" });
          const url = window.URL.createObjectURL(blob);
          if (file_type === "vrm") {
            viewer.loadVrm(url);
          } else if (file_type === "vrma") {
            viewer.loadVrma(url);
          } {/*else if (file_type === "fbx") {
            viewer.loadFbx(url);
          }*/}
        });
      }
    },
    [viewer, selectedAvatar, loadVrmForAvatar]
  );

  return (
    <div className={"absolute top-0 left-0 w-screen h-[100svh]"}>
     <canvas ref={canvasRef} className={"h-full w-full"}></canvas>
      {isLoading && <div className="loading-spinner"></div>} {/* ローディング中の表示 */}
    </div>
  );
}
