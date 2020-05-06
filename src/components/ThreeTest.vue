<template>
  <div class="d-flex full-width mt-2 mx-2">
    <div class="d-flex mr-2 flex-column full-width">
      <div class="d-flex mb-2 full-width">
        <v-card
          class="d-flex align-center justify-space-between mr-2 pa-1"
          :style="{ flexBasis: displayFileTree ? fileTreeWidth: 'auto'}"
        >
          <v-btn small fab icon @click="toggleFileTree">
            <v-icon color="primary">mdi-file-tree</v-icon>
          </v-btn>

          <v-btn
            small
            fab
            icon
            @click="()=>{ displayProjectsInTree = !displayProjectsInTree }"
            :class="{ 'display-none': !displayFileTree }"
          >
            <v-icon color="primary">mdi-folder-swap-outline</v-icon>
          </v-btn>
        </v-card>
        <v-card class="d-flex align-center flex-grow-1 justify-space-between pr-1 pl-2">
          <div>
            <span class="headline mr-1">{{ selectedProject }}</span>
            <span>/{{ filepath }}</span>
          </div>
          <div>
            <span
              v-bind:class="{ 'display-none': !displaySaveMessage }"
              class="grey--text text--darken-1"
            >
              saved
            </span>
            <v-btn small fab icon @click="quickSave">
              <v-icon color="primary" @click="quickSave" :disabled="saving">
                mdi-content-save
              </v-icon>
            </v-btn>
          </div>
        </v-card>
      </div>
      <div class="d-flex full-width full-height">
        <v-card
          :class="{ 'display-none': !displayFileTree }"
          class="full-height mr-2"
          :style="{ flexBasis: fileTreeWidth, overflow: 'auto' }"
        >
          <FileTree
            :root-path="displayProjectsInTree ? projectDirectoryPath : selectedProjectPath"
            :project-select="displayProjectsInTree"
            @select="path => { displayProjectsInTree ? switchProject(path) : switchFile(path) }"
          />
        </v-card>
        <codemirror
          v-model="code"
          v-bind:options="{ mode: 'python', theme: 'rubyblue' }"
        />
      </div>
      <EditorControls
        class="mt-2"
        :scene-choices="sceneChoices"
        :chosen-scene-prop="chosenScene"
        :disabled="!pythonFileSelected || displayProjectsInTree || animating"
        :animation-action="animationAction"
        :output-resolution="outputResolution"
        :fps="fps"
        @chosen-scene-update="newScene => this.chosenScene = newScene"
        @refresh-scene-choices="refreshSceneChoices"
        @run-manim="runManim"
        @update-animation-action="value => animationAction = value"
        @update-output-resolution="value => outputResolution = value"
        @update-fps="value => fps = value"
      />
    </div>
    <div
      id="preview-container"
      :style="{
        width: `${rendererWidth}px`,
        height: `${rendererHeight}px`,
      }"
      class="flex-shrink-0"
    >
      <video
        v-if="displayVideo"
        controls
        :src="videoUrl"
        type="video/mp4"
        class="full-width full-height"
      />
    </div>
  </div>
</template>

<script>
  /* eslint-disable */
  import * as THREE from "three";
  import * as consts from "../constants.js";
  import * as fs from "fs-extra";
  import EditorControls from  "./EditorControls.vue";
  import FileTree from  "./FileTree.vue";
  import path from "path";
  import { ManimInterface } from "../ManimInterface.js";
  import { Mobject } from  "../Mobject.js";
  const Store = require('electron-store');
  import { spawn } from "child_process";

  import { codemirror } from 'vue-codemirror'
  import 'codemirror/lib/codemirror.css'
  import 'codemirror/theme/rubyblue.css'
  import 'codemirror/mode/python/python.js'

  export default {
    name: "ThreeTest",
    components: {
      codemirror,
      EditorControls,
      FileTree,
    },
    data() {
      return {
        code: "",
        sceneChoices: [],
        chosenScene: "",
        saving: false,
        displaySaveMessage: false,
        displayFileTree: false,
        displayProjectsInTree: false,
        animating: false,
        animationAction: "preview",
        videoUrl: "",
        displayVideo: false,
        fps: 30,
        outputResolution: 720,

        workspacePath: '',
        projectDirectory: "projects",
        selectedProject: "default",
        filepath: "example_scenes.py",
      };
    },
    created() {
      this.aspectRatio = 16 / 9;
      this.sceneHeight = 8;
      this.rendererHeight = 270;
      this.cameraNear = 1; // z = 2
      this.cameraFar = 5;  // z = -2
      this.cameraZPosition = 3;
      this.previewFps = 30;

      this.scene = null;
      this.camera = null;
      this.renderer = null;

      this.frameData = [];

      // Maps Mobject IDs from Python to their respective Mobjects in
      // Javascript.
      this.mobjectDict = {};

      this.manimConfig = {
        python: {
          pythonPath: '',
          pythonOptions: ['-u'],
        },
        manim: {
          manimPath: '',
        },
      };
      this.manimInterface = null;
      this.store = new Store({ schema: consts.STORAGE_SCHEMA });
      this.fileTreeWidth = '250px';

      this.resizeAndRender = () => {
        if (this.renderer === null) return;
        this.resizeRenderer();
        this.renderer.render(this.scene, this.camera);
      };
      window.addEventListener('resize', this.resizeAndRender);
      this.ffmpegPath = null;
    },
    mounted() {
      let paths = this.store.get('paths', null);
      if (paths === null) {
        this.$router.replace(consts.CONFIG_URL);
        return;
      }
      this.manimConfig.manim.manimPath = paths.manim;
      this.manimConfig.python.pythonPath = paths.python;
      this.workspacePath = paths.workspace;
      this.ffmpegPath = paths.ffmpeg;

      this.loadCode().then(code => {
        this.code = code;
        return this.manimInterface.getSceneChoices(this.selectedProjectPath, this.projectFilePath);
      }).then(sceneChoices => {
        this.sceneChoices = sceneChoices;
        this.chosenScene = this.sceneChoices[0];
      });

      // Scene
      this.scene = new THREE.Scene();

      // Camera
      this.camera = new THREE.OrthographicCamera(
        /*left=*/-this.sceneWidth / 2,
        /*right=*/this.sceneWidth / 2,
        /*top=*/this.sceneHeight / 2,
        /*bottom=*/-this.sceneHeight / 2,
        /*near=*/this.cameraNear,
        /*far=*/this.cameraFar,
      );
      this.camera.position.z = this.cameraZPosition;

      // Renderer
      this.renderer = new THREE.WebGLRenderer({ antialias: true });
      document.getElementById("preview-container").appendChild(
        this.renderer.domElement
      );
      this.renderer.setSize(this.rendererWidth, this.rendererHeight, true);
      this.resizeRenderer();

      this.manimInterface = new ManimInterface(this.manimConfig);
    },
    computed: {
      sceneWidth() { return this.sceneHeight * this.aspectRatio },
      rendererWidth() { return this.rendererHeight * this.aspectRatio },
      resolutionHeight() { return this.outputResolution },
      resolutionWidth() { return this.resolutionHeight * this.aspectRatio },
      previewFpsInterval() { return consts.MS_PER_SECOND / this.previewFps },
      projectFilePath() {
        return path.join(
          this.workspacePath,
          this.projectDirectory,
          this.selectedProject,
          this.filepath,
        );
      },
      selectedProjectPath() {
        return path.join(
          this.workspacePath,
          this.projectDirectory,
          this.selectedProject,
        );
      },
      projectDirectoryPath() {
        return path.join(
          this.workspacePath,
          this.projectDirectory,
        );
      },
      pythonFileSelected() { return this.filepath.endsWith('.py') },
      videoDirectoryPath() {
        return path.join(
          this.selectedProjectPath,
          "media",
          "videos",
          `${this.filepath.split('.py')[0]}`,
          `${this.resolutionHeight}p${this.fps}`,
        );
      },
      videoFilePath() {
        return path.join(
          this.videoDirectoryPath,
          `${this.chosenScene}.mp4`,
        );
      },
    },
    watch: {
      saving(saveStatus) {
        if (!saveStatus) {
          this.displaySaveMessage = true;
        }
      },
      code() { this.displaySaveMessage = false; },
      displayVideo(displayingVideo) {
        if (displayingVideo) {
          let renderer = this.renderer.domElement;
          renderer.parentElement.removeChild(renderer);
        } else {
          document.getElementById("preview-container").appendChild(
            this.renderer.domElement,
          );
        }
      },
      animationAction(action) {
        if (action === "export") {
          this.displayVideo = true;
          window.removeEventListener('resize', this.resizeAndRender);
        } else {
          this.displayVideo = false;
          window.addEventListener('resize', this.resizeAndRender);
        }
      },
    },
    methods: {
      loadCode() {
        return fs.promises.readFile(this.projectFilePath, { encoding: "utf8" });
      },
      quickSave() {
        if (this.saving) return;
        this.saving = true;
        fs.writeFile(
          this.projectFilePath,
          this.code,
          { encoding: "utf8" },
          () => {
            this.saving = false;
            this.refreshSceneChoices();
          },
        );
      },
      switchFile(filePath) {
        if (filePath === this.filepath) return;

        this.filepath = filePath;
        this.loadCode().then(code => {
          this.code = code;
          if (this.pythonFileSelected) {
            return this.manimInterface.getSceneChoices(this.selectedProjectPath, this.projectFilePath);
          }
        }).then(sceneChoices => {
          if (sceneChoices) {
            this.sceneChoices = sceneChoices;
            this.chosenScene = this.sceneChoices[0];
          }
        });
      },
      switchProject(project) {
        this.displayProjectsInTree = false;
        this.selectedProject = project;
      },
      toggleFileTree() {
        this.displayFileTree = !this.displayFileTree;
      },
      refreshSceneChoices() {
        this.manimInterface
          .getSceneChoices(this.selectedProjectPath, this.projectFilePath)
          .then(sceneChoices => this.sceneChoices = sceneChoices);
      },
      runManim() {
        this.clearFrameData();
        this.animating = true;
        if (this.animationAction === "preview") {
          this.manimInterface
            .getFrameData(
              this.selectedProjectPath,
              this.projectFilePath,
              this.chosenScene,
              this.previewFps,
            )
            .then(frameData => {
              this.frameData = frameData;
              this.animateFrameData();
            });
        } else {
          this.manimInterface
            .getFrameData(
              this.selectedProjectPath,
              this.projectFilePath,
              this.chosenScene,
              this.fps,
            )
            .then(frameData => {
              this.frameData = frameData;
              this.exportFrameData();
            });
        }
      },
      renderFrame(frameNumber) {
        let frameData = this.frameData[frameNumber];
        // Add each Mobject in the frame.
        let currentFrameMobjectIds = new Set();
        for (let mobjectData of frameData) {
          let {
            id,
            points,
            style,
            needsRedraw,
            needsTriangulation,
          } = mobjectData;
          currentFrameMobjectIds.add(id);
          if (id in this.mobjectDict) {
            this.mobjectDict[id].update(
              points,
              style,
              needsRedraw,
              needsTriangulation,
            );
          } else {
            this.mobjectDict[id] = new Mobject(id, points, style);
          }
          // As long as all Mobjects are direct children of the Scene
          // double-adding them has no effect.
          this.scene.add(this.mobjectDict[id]);
        }

        // Remove each Mobject that isn't in the frame.
        for (let i = this.scene.children.length - 1; i >= 0; i--) {
          let child = this.scene.children[i];
          if (!(currentFrameMobjectIds.has(child.mobjectId))) {
            this.scene.remove(child);
          }
        }

        // Render the frame.
        this.renderer.render(this.scene, this.camera);
      },
      clearFrameData() {
        // Clear the Scene.
        for (let i = this.scene.children.length - 1; i >= 0; i--) {
          this.scene.remove(this.scene.children[i]);
        }
        // Dispose the Mobjects.
        for (let mobject of Object.values(this.mobjectDict)) {
          mobject.dispose();
        }
        this.frameData.length = 0;
        this.mobjectDict = {};
      },
      animateFrameData() {
        let lastFrameTimestamp = window.performance.now();
        let currentFrame = 0;
        let animate = () => {
          if (currentFrame !== this.frameData.length) {
            requestAnimationFrame(animate);

            // Throttle FPS (https://stackoverflow.com/a/19772220/3753494).
            let now = window.performance.now();
            let elapsed = now - lastFrameTimestamp;
            if (elapsed <= this.previewFpsInterval) return;
            lastFrameTimestamp = now - (elapsed % this.previewFpsInterval);

            this.renderFrame(currentFrame++);
          } else {
            this.animating = false;
          }
        }
        animate();
      },
      exportFrameData() {
        fs.ensureDir(this.videoDirectoryPath);

        let cat = spawn("cat");
        let ffmpeg = spawn(
          this.ffmpegPath, [
            "-y",
            "-loglevel", "info",
            "-f", "image2pipe",
            "-c:v", "png",
            "-r", `${this.fps}`,
            "-i", "-",
            "-an",
            "-vcodec", "libx264",
            "-pix_fmt", "yuv420p",
            this.videoFilePath,
          ]);
        ffmpeg.stdout.on('data', data => {
          console.log(`ffmpeg stdout: ${data}`);
        });
        ffmpeg.stderr.on('data', data => {
          console.log(`ffmpeg stderr: ${data}`);
        });
        ffmpeg.on('close', code => {
          if (code !== 0) {
            console.error(`ffmpeg exited with error code ${code}.`);
          } else {
            this.resizeRenderer();
            this.videoUrl = new URL(`file://${this.videoFilePath}`);
            this.displayVideo = true;
            this.animating = false;
          }
        });

        cat.stdout.pipe(ffmpeg.stdin);

        this.renderer.setSize(
          this.resolutionWidth,
          this.resolutionHeight,
          false,
        );
        this.displayVideo = false;
        let p = Promise.resolve();
        for (let i = 0; i < this.frameData.length; i++) {
          p = p.then(_ => new Promise(resolve => {
            this.renderFrame(i);
            this.renderer.domElement.toBlob(blob => {
              blob.arrayBuffer().then(arr => {
                cat.stdin.write(new Uint8Array(arr));
                resolve();
              });
            });
          }));
        }
        p = p.then(_ => cat.stdin.end());
      },
      resizeRenderer() {
        const canvas = this.renderer.domElement;
        const pixelRatio = window.devicePixelRatio;
        const width  = canvas.clientWidth  * pixelRatio | 0;
        const height = canvas.clientHeight * pixelRatio | 0;
        this.renderer.setSize(width, height, false);
      },
    },
  }
</script>

<style>
/* Copied from https://discuss.codemirror.net/t/size-inside-flexbox/1359/5 to
 * size CodeMirror correctly within a flexbox element.
 */
.vue-codemirror {
  flex: 1 1 auto;
  margin-top: 0;
  height: 100%;
  position: relative;
}
.CodeMirror {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  height: 100%;
}
</style>
