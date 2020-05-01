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
        @chosen-scene-update="(newScene)=>{this.chosenScene=newScene}"
        @refresh-scene-choices="refreshSceneChoices"
        @run-manim="runManim"
        @update-animation-action="value => animationAction = value"
      />
    </div>
    <canvas class="renderer-element" ref="renderer"/>
  </div>
</template>

<script>
  /* eslint-disable */
  import * as THREE from "three";
  import * as consts from "../constants.js";
  import * as fs from "fs";
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
        animationAction: "export",

        workspacePath: '',
        projectDirectory: "projects",
        selectedProject: "default",
        filepath: "example_scenes.py",
      };
    },
    created() {
      this.fps = 15;
      this.aspectRatio = 16 / 9;
      this.rendererHeight = 576; // Set to 720 for 720p
      this.sceneHeight = 8;
      this.cameraNear = 1; // z = 2
      this.cameraFar = 5;  // z = -2
      this.cameraZPosition = 3;

      this.scene = null;
      this.camera = null;
      this.renderer = null;

      this.frameData = [];
      this.twoScene = null;

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
          pixelHeight: this.rendererHeight,
          pixelWidth: this.rendererWidth,
        },
      };
      this.manimInterface = null;
      this.store = new Store({ schema: consts.STORAGE_SCHEMA });
      this.fileTreeWidth = '250px';
    },
    mounted() {
      let paths = this.store.get('paths', null);
      if (paths === null) {
        this.$router.push(consts.CONFIG_URL);
      } else {
        this.manimConfig.manim.manimPath = paths.manim;
        this.manimConfig.python.pythonPath = paths.python;
        this.workspacePath = paths.workspace;
      }

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
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.$refs.renderer,
        antialias: true,
      });
      this.renderer.setSize(
        this.rendererWidth,
        this.rendererHeight,
        false,
      );

      this.manimInterface = new ManimInterface(this.manimConfig);
    },
    computed: {
      sceneWidth() { return this.sceneHeight * this.aspectRatio; },
      rendererWidth() { return this.rendererHeight * this.aspectRatio; },
      fpsInterval() { return consts.MS_PER_SECOND / this.fps; },
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
    },
    watch: {
      saving(saveStatus) {
        if (!saveStatus) {
          this.displaySaveMessage = true;
        }
      },
      code() { this.displaySaveMessage = false; }
    },
    methods: {
      loadCode() {
        return fs.promises.readFile(
          this.projectFilePath,
          { encoding: "utf8" },
        );
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
        this.animating = true;
        if (this.animationAction === "preview") {
          this.manimInterface
            .getFrameData(this.selectedProjectPath, this.projectFilePath, this.chosenScene)
            .then(frameData => {
              this.frameData = frameData;
              this.animateFrameData();
            });
        } else {
          this.manimInterface
            .getFrameData(this.selectedProjectPath, this.projectFilePath, this.chosenScene)
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
            if (elapsed <= this.fpsInterval) return;
            lastFrameTimestamp = now - (elapsed % this.fpsInterval);

            this.renderFrame(currentFrame++);
          } else {
            this.clearFrameData();
            this.animating = false;
          }
        }
        animate();
      },
      exportFrameData() {
        let cat = spawn("cat");
        let ffmpeg = spawn(
          // "cat",
          "ffmpeg",
          [
            "-y",
            "-loglevel", "info",
            "-f", "image2pipe",
            // "-s", `${this.rendererWidth}x${this.rendererHeight}`,
            "-c:v", "png",
            "-r", `${this.fps}`,
            "-i", "-",

            "-an",
            "-vcodec", "libx264",
            "-pix_fmt", "yuv420p",
            "output.mp4",
          ],
        );
        ffmpeg.stdout.on('data', data => {
          console.log(`ffmpeg stdout: ${data}`);
        });
        ffmpeg.stderr.on('data', data => {
          console.log(`ffmpeg stderr: ${data}`);
        });
        cat.stdout.pipe(ffmpeg.stdin);

        let bufs = [];
        let p = Promise.resolve();
        for (let i = 0; i < 1/* this.frameData.length */; i++) {
          p = p.then(_ => new Promise(resolve => {
            this.renderFrame(i);
            this.renderer.domElement.toBlob(blob => {
              blob.arrayBuffer().then(arr => {
                console.log('writing...');
                let uInt8Arr = new Uint8Array(arr);
                cat.stdin.write(uInt8Arr);
                // bufs.push(uInt8Arr);
                resolve();
              });
            });
          }));
        }
        p = p.then(_ => {
          for (let buf of bufs) {
            // ffmpeg.stdin.write(buf);
            // cat.stdin.write(buf);
          }
          // ffmpeg.stdin.end();
          cat.stdin.end();
          this.animating = false;
        });
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
.renderer-element {
  width: 480px;
  height: 270px;
}
</style>
