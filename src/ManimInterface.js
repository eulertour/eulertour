import { PythonShell } from "python-shell";
import * as utils from "./utils";

class ManimInterface {
  constructor(config) {
    this.config = config;
  }

  getFrameData(filePath, scene) {
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
              // "--use_javascript_svg_interpretation",
              "-l",
            ],
            mode: 'json',
          },
        ),
      )
      .on('message', results => {
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
            console.warn(`Received message with unknown type: ${results}`);
        }
      })
      .on('error', error => console.warn(error))
      .on('close', () => resolve(frameData));
    });
  }

  getSceneChoices(filePath) {
    return new Promise(resolve => {
      new PythonShell(
        this.config.manim.manimPath,
        Object.assign(
          this.config.python,
          { args: [filePath, "--display_scenes"], mode: 'json' },
        ),
      )
      .on('message', scenes => resolve(scenes))
      .on('error', error => console.warn(error))
    });
  }
}

export { ManimInterface };
