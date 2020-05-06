import { PythonShell } from "python-shell";
import * as utils from "./utils";
import { remote } from "electron";

class ManimInterface {
  constructor(config) {
    this.config = config;
    this.globalEnv = remote.getGlobal('process').env;
  }

  getFrameData(projectPath, filePath, scene, fps) {
    return new Promise(resolve => {
      let frameData = [];
      this.manim = new PythonShell(
        this.config.manim.manimPath,
        Object.assign(
          this.config.python,
          {
            args: [
              filePath,
              scene,
              "--print_frames_only",
              "--change_directory", projectPath,
              "--frame_rate", fps,
              // "--use_javascript_svg_interpretation",
            ],
            env: Object.assign(this.globalEnv, { PYTHONPATH: projectPath }),
          },
        ),
      )
      .on('message', results => {
        try {
          results = JSON.parse(results);
        } catch (err) {
          console.warn(`Intercepted message from Python: ${results}`);
          return;
        }
        let { message, data } = results;
        switch (message) {
          case 'frame':
            frameData.push(data);
            break;
          case 'svgRequest':
            this.manim.send(utils.svgStringToPoints(data));
            break;
          case 'debug':
            console.log(`Received debug message from Python: ${data}`);
            break;
          default:
            console.warn(`Received JSON with unknown type: ${results}`);
        }
      })
      .on('error', error => console.warn(error))
      .on('close', () => resolve(frameData));
    });
  }

  getSceneChoices(projectPath, filePath) {
    return new Promise(resolve => {
      new PythonShell(
        this.config.manim.manimPath,
        Object.assign(
          this.config.python,
          {
            args: [
              filePath,
              "--display_scenes",
              "--change_directory", projectPath,
            ],
            env: Object.assign(this.globalEnv, { PYTHONPATH: projectPath }),
          },
        ),
      )
      .on('message', results => {
        try {
          results = JSON.parse(results);
        } catch (err) {
          console.warn(`Intercepted message from Python: ${results}`);
          return;
        }
        let { message, data } = results;
        switch (message) {
          case 'debug':
            console.log(`Received debug message from Python: ${data}`);
            break;
          case 'scenes':
            resolve(data);
            break;
          default:
            console.warn(`Received JSON with unknown type: ${results}`);
        }
      })
      .on('error', error => console.warn(error))
    });
  }
}

export { ManimInterface };
