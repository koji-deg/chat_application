import * as THREE from "three";
import { Model } from "./model";
import { loadVRMAnimation } from "@/lib/VRMAnimation/loadVRMAnimation";
import { buildUrl } from "@/utils/buildUrl";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
// import { loadMixamoAnimation } from '@/lib/fbxAnimation/loadMixamoAnimation';

/**
 * three.jsを使った3Dビューワー
 *
 * setup()でcanvasを渡してから使う
 */
export class Viewer {
  public isReady: boolean;
  public model?: Model;

  private _renderer?: THREE.WebGLRenderer;
  private _clock: THREE.Clock;
  private _scene: THREE.Scene;
  private _camera?: THREE.PerspectiveCamera;
  private _cameraControls?: OrbitControls;
  private _currentAnimationUrl: string;       // 追加
  private _currentAnimationType: string;      // 追加

  private _isMobileView: boolean = false; // 追加: モバイル表示かどうかのフラグ


  constructor() {
    
  // current animation
    this._currentAnimationUrl = buildUrl("/idle2.vrma");
    this._currentAnimationType = "vrma";
  
  this.isReady = false;

    // scene
    const scene = new THREE.Scene();
    this._scene = scene;

    // light
    const directionalLight = new THREE.DirectionalLight(0XFF8C00, 0.5); // ライトの色と強度
  directionalLight.position.set(-1.0, 1.5, 1.0); // 左上前方の位置
  directionalLight.target.position.set(0, 0, 0); // シーンの中央を向くようにターゲット設定
  scene.add(directionalLight);
  scene.add(directionalLight.target);

    const ambientLight = new THREE.AmbientLight(0XFAFAFF, 0.6);
    scene.add(ambientLight);

    // animate
    this._clock = new THREE.Clock();
    this._clock.start();
  }

  public unloadVRM() {
    if (this.model?.vrm) {
      // シーンからモデルを削除
      this._scene.remove(this.model.vrm.scene);

      // メモリの解放
      this.model.vrm.scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((material) => material.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });

      // モデルの削除
      this.model = undefined;
    }
  }

  public loadVrm(url: string) {
    if (this.model?.vrm) {
      this.unloadVRM();
    }

    // gltf and vrm
    this.model = new Model(this._camera || new THREE.Object3D());
    this.model.loadVRM(url).then(async () => {
      if (!this.model?.vrm) return;

      // Disable frustum culling
      this.model.vrm.scene.traverse((obj) => {
        obj.frustumCulled = false;
      });

      this._scene.add(this.model.vrm.scene);

      // モデルの角度を回転
  this.model.vrm.scene.rotation.y = THREE.MathUtils.degToRad(-15); // 15度左に回転

   // モデルを手前側に傾ける (X軸方向の回転)
  this.model.vrm.scene.rotation.x = THREE.MathUtils.degToRad(5); // 5度手前に傾ける

      if (this._currentAnimationUrl && this._currentAnimationType === "vrma") {
      const vrma = await loadVRMAnimation(this._currentAnimationUrl);
      if (vrma) this.model.loadAnimation(vrma);
      } {/*else if (this._currentAnimationUrl && this._currentAnimationType === "fbx") {
        this.loadFbx(this._currentAnimationUrl);
      }*/}


      // HACK: アニメーションの原点がずれているので再生後にカメラ位置を調整する
      requestAnimationFrame(() => {
        this.resetCamera();
      });
    });
  }

  public async loadVrma(url: string) {
  console.log("loadVrmaが呼ばれました:", url);  // デバッグログ
  if (this.model?.vrm) {
    this._currentAnimationUrl = url;
    this._currentAnimationType = "vrma";
    const vrma = await loadVRMAnimation(this._currentAnimationUrl);
    if (vrma) {
      await this.model.loadAnimation(vrma);
    }
    requestAnimationFrame(() => {
      this.resetCamera();
    });
  }
}



  /**
   * Reactで管理しているCanvasを後から設定する
   */
  public setup(canvas: HTMLCanvasElement) {
    const parentElement = canvas.parentElement;
    const width = parentElement?.clientWidth || canvas.width;
    const height = parentElement?.clientHeight || canvas.height;
    // renderer
    this._renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true,
      antialias: true,
    });
    this._renderer.outputEncoding = THREE.sRGBEncoding;
    this._renderer.setSize(width, height);
    this._renderer.setPixelRatio(window.devicePixelRatio);

    // camera
    this._camera = new THREE.PerspectiveCamera(20.0, width / height, 0.1, 20.0);
    this._camera.position.set(0, 1.3, 1.5);
    this._cameraControls?.target.set(0, 1.3, 0);
    this._cameraControls?.update();
    // camera controls
    this._cameraControls = new OrbitControls(
      this._camera,
      this._renderer.domElement
    );
    this._cameraControls.screenSpacePanning = true;
    this._cameraControls.update();

    window.addEventListener("resize", () => {
      this.resize();
    });
    this.isReady = true;
    this.update();
  }

  /**
   * canvasの親要素を参照してサイズを変更する
   */
  public resize() {
    if (!this._renderer) return;

    const parentElement = this._renderer.domElement.parentElement;
    if (!parentElement) return;

    this._renderer.setPixelRatio(window.devicePixelRatio);
    this._renderer.setSize(
      parentElement.clientWidth,
      parentElement.clientHeight
    );

    if (!this._camera) return;
    this._camera.aspect =
      parentElement.clientWidth / parentElement.clientHeight;
    this._camera.updateProjectionMatrix();

 // headノードのワールド座標を取得
  const headNode = this.model.vrm.humanoid.getNormalizedBoneNode("head");
  if (headNode) {
    const headWPos = headNode.getWorldPosition(new THREE.Vector3());

    // モバイルビューとデスクトップビューの判定
    const mobileAspectRatioThreshold = 0.75;
    if (this._camera.aspect < mobileAspectRatioThreshold) {
      this._isMobileView = true;
      this._camera.position.set(0, 0, 2);
      //this.model.vrm.scene.scale.set(0.7, 0.7, 0.7);
      this.model.vrm.scene.position.set(0, -1, -0.5);
      this._cameraControls?.target.set(-1, -1, 2);
      this._cameraControls?.target.set(headWPos.x, headWPos.y - 0.1, headWPos.z);
    } else {
      this._isMobileView = false;
      //this._camera.position.set(0, headWPos.y + 0, headWPos.z + 1.5);
      //this.model.vrm.scene.scale.set(1, 1, 1);
      //this.model.vrm.scene.position.set(0, headWPos.y - 1, 0);
      this._camera.position.set(0, 1.3, 1.5);
      this.model.vrm.scene.position.set(0, 0, 0);
      this._cameraControls?.target.set(0, 1.3, 0);
      this._cameraControls?.target.set(headWPos.x, headWPos.y + 0.02, headWPos.z);
    }

    // カメラのターゲットを headWPos に設定
    this._cameraControls?.update();
  }
  }

  /**
   * VRMのheadノードを参照してカメラ位置を調整する
   */
  public resetCamera() {
    const headNode = this.model?.vrm?.humanoid.getNormalizedBoneNode("head");

    if (headNode) {
      const headWPos = headNode.getWorldPosition(new THREE.Vector3());
      this._camera?.position.set(
        this._camera.position.x,
        headWPos.y,
        this._camera.position.z
      );
      this._cameraControls?.target.set(headWPos.x, headWPos.y + 0.02, headWPos.z);
      this._cameraControls?.update();
    }
  }

  public update = () => {
    requestAnimationFrame(this.update);
    const delta = this._clock.getDelta();
    // update vrm components
    if (this.model) {
      this.model.update(delta);
    }

    if (this._renderer && this._camera) {
      this._renderer.render(this._scene, this._camera);
    }
  };
}
