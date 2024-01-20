
import * as Tone from 'tone'

import './style.css'
import javascriptLogo from './javascript.svg'
import viteLogo from '/vite.svg'
import { setupCounter } from './counter.js'
import {
  GestureRecognizer,
  FilesetResolver,
} from '@mediapipe/tasks-vision';
import {
  askWebcamPermissions,
  captureCamera
} from './webcam';
import {
  predictWebcam
} from './predict';

window.onload = async () => {
  const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
  console.log(vision);
  const gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath:
        "/gesture_recognizer.task",
      delegate: "GPU"
    },
    runningMode: "VIDEO",
    numHands: 2
  });
  const video = document.querySelector("#video-container video");
  const canvas = document.querySelector("#video-container canvas");
  const ctx = canvas.getContext("2d");
  await askWebcamPermissions();
  await captureCamera(video);
  //await Tone.start();
  video.addEventListener("loadeddata", () => predictWebcam(video, gestureRecognizer, ctx));
}

//const poses = await detector.estimatePoses(image);

//document.querySelector('#app').innerHTML = `
//  <div>
//    <a href="https://vitejs.dev" target="_blank">
//      <img src="${viteLogo}" class="logo" alt="Vite logo" />
//    </a>
//    <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript" target="_blank">
//      <img src="${javascriptLogo}" class="logo vanilla" alt="JavaScript logo" />
//    </a>
//    <h1>Hello Vite!</h1>
//    <div class="card">
//      <button id="counter" type="button"></button>
//    </div>
//    <p class="read-the-docs">
//      Click on the Vite logo to learn more
//    </p>
//  </div>
//`

setupCounter(document.querySelector('#counter'))
