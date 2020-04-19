import { PythonShell } from "python-shell";

class ManimInterface {
  constructor(manimPath, config) {
    this.manimPath = manimPath;
    this.config = config;
  }

  getFrameData(filePath, scene) {
    return new Promise(resolve => {
      let frameData = [];
      new PythonShell(
        this.manimPath,
        Object.assign(
          this.config.python,
          {
            args: [filePath, scene, "--print_frames_only", "-l"],
            mode: 'json',
          },
        ),
      )
      .on('message', results => frameData.push(results))
      .on('error', error => console.warn(error))
      .on('close', () => resolve(frameData));
    });
  }

  getSceneChoices(filePath) {
    return new Promise(resolve => {
      let choices = [];
      new PythonShell(
        this.manimPath,
        Object.assign(
          this.config.python,
          { args: [filePath, "--display_scenes"] },
        ),
      )
      .on('message', scene => choices.push(scene))
      .on('error', error => console.warn(error))
      .on('close', () => resolve(choices));
    });
  }
}

export { ManimInterface };
