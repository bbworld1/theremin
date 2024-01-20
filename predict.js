
import * as Tone from 'tone'

import {
    GestureRecognizer,
    DrawingUtils
} from '@mediapipe/tasks-vision';


Tone.start();

// Create a simple synth with set amplitude
const synth = new Tone.Synth({
  oscillator: {
    type: "sine" // You can change the oscillator type (sine, square, sawtooth, triangle)
  },
  envelope: {
    attack: 0.1,
    decay: 0.2,
    sustain: 1.0,
    release: 0.3
  },
  volume: -20 // Set the desired amplitude level in decibels
}).toDestination();

// Attach click event listener to the button
const playButton = document.getElementById("playButton");
playButton.addEventListener("click", playSound);

function playSound() {
  synth.triggerAttackRelease("C4", "8n");
}

let lastVideoTime = -1;
let state = [];
let lastState = [];
const canvas = document.querySelector("#video-container canvas");

export async function predictWebcam(video, gestureRecognizer, ctx) {
    let nowInMs = Date.now();
    let results;
    state = [];
    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        results = gestureRecognizer.recognizeForVideo(video, nowInMs);
        if (results.landmarks.length > 0) {
            for (let i = 0; i < results.landmarks.length; i++) {
                state.push([results.gestures[i][0].categoryName, results.landmarks[i][0]]);
                //console.log("hand " + i + " | " + results.gestures[i][0].categoryName);
                //console.log(results.landmarks[i][0]);
            }
            let hand1 = state[0];
            synth.volume.value = hand1[1]['y']*-20;
            //synth.envelope.attack = hand1[1]['x']*0.1;
            //synth.envelope.release = hand1[1]['x']*0.4;

            let muted_gestures = ['None', 'Closed_Fist'];
            console.log(hand1[0]);
            console.log(muted_gestures.includes(hand1[0]));
            if (!(muted_gestures.includes(hand1[0]))) {
                //if (lastState.length > 0 && muted_gestures.includes(lastState[0][0])) {
                //    console.log("play");
                //    playSound();
                //}
                playSound();
            }
        }
        lastState = state;
    }
    if (results?.landmarks) {
        ctx.save();
        ctx.clearRect(0, 0, video.offsetWidth, video.offsetHeight);
        const drawingUtils = new DrawingUtils(ctx);
        canvas.width = video.offsetWidth;
        canvas.height = video.offsetHeight;

        for (const landmarks of results.landmarks) {
            drawingUtils.drawConnectors(
                landmarks,
                GestureRecognizer.HAND_CONNECTIONS,
                {
                    color: "#00FF00",
                    lineWidth: 5
                }
            );
            drawingUtils.drawLandmarks(landmarks, {
                color: "#FF0000",
                lineWidth: 2
            });
        }
        ctx.restore();
    }

    window.requestAnimationFrame(() => predictWebcam(video, gestureRecognizer, ctx));
}