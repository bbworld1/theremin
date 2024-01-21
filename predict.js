import {
    GestureRecognizer,
    DrawingUtils,
    PoseLandmarker
} from '@mediapipe/tasks-vision';
import * as Tone from 'tone';
import * as teoria from 'teoria';
import * as core from '@magenta/music/esm/core';
import { getNotes } from './theory';

const notes = ["C4", "D4", "E4", "F4", "G4", "A4", "B4"];
let lastVideoTime = -1;
const canvas = document.querySelector("#video-container canvas");
const humans = {};

Tone.start()
let prevLeftGesture = null;
let prevRightGesture = null;
let prevLeftPos = null;
let prevRightPos = null;
let prevLeftRot = 0;
let prevRightRot = 0;
let chordPlaying = null;
let chordReverb = new Tone.Freeverb().toDestination();
let chordFilter = new Tone.Filter(20000, "lowpass").connect(chordReverb);
let pitchShift = new Tone.PitchShift().connect(chordFilter);
let chordSynth = [0, 0, 0, 0, 0].map(() => new Tone.Synth().connect(pitchShift));
chordSynth.forEach(a => a.set({ volume: -1000 }));
console.log(chordSynth);

// recorders
const recorder = new Tone.Recorder();
const synth = new Tone.Synth().connect(recorder);
let recording;

let slideToggle = false;
document.getElementById("slideToggle").addEventListener("click", () => {
    slideToggle = !slideToggle;
})

let soundOn = false;
document.getElementById("toggleActivation").addEventListener("click", () => {
    soundOn = !soundOn;
    chordSynth.map(a => a.triggerRelease());
    chordPlaying = null;
});

let record = false;
document.getElementById("toggleRecord").addEventListener("click", () => {
    record = !record;
    if (record) {
        recorder.start();
        console.log("recording audio");
    } else {
        recorder.stop((buffer) => {
            recording = new Blob([buffer], { type: "audio/webm" });
            console.log("stopping recording audio");
        });

    }
})
document.getElementById("videoDownload").addEventListener("click", () => {
    if (recording) {
        console.log('downloading audio');
        const anchor = document.createElement("a");
        
        if (recording instanceof Blob) {
            const dorl = URL.createObjectURL(recording);
            anchor.download = "recording.webm";
            anchor.href = dorl;
            anchor.click();
        } else {
            console.error("Invalid recording format");
        }
    } else {
        console.error("No recording available");
    }
})


export async function predictWebcam(video, gestureRecognizer, ctx) {
    let nowInMs = Date.now();
    let handResults;
    const scale = video.videoWidth / video.offsetWidth;

    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        handResults = gestureRecognizer.recognizeForVideo(video, nowInMs);
    }
    if (handResults?.landmarks) {
        ctx.save();
        ctx.clearRect(0, 0, video.offsetWidth, video.offsetHeight);
        const drawingUtils = new DrawingUtils(ctx);
        canvas.width = video.offsetWidth;
        canvas.height = video.offsetHeight;

        let leftHand = null;
        let rightHand = null;
        for (let [index, landmarks] of handResults.landmarks.entries()) {
            if (!handResults.handedness[index]?.[0]) continue;
            if (handResults.handedness[index][0].categoryName === "Left") {
                rightHand = {
                    x: landmarks[0].x,
                    y: landmarks[0].y,
                    z: landmarks[0].z,
                    rot: Math.atan2((landmarks[9].y - landmarks[0].y), (landmarks[9].x - landmarks[0].x)) * 180 / Math.PI,
                    gesture: handResults.gestures[index][0].categoryName
                };
            } else if (handResults.handedness[index][0].categoryName === "Right") {
                leftHand = {
                    x: landmarks[0].x,
                    y: landmarks[0].y,
                    z: landmarks[0].z,
                    rot: Math.atan2(-(landmarks[9].y - landmarks[0].y), (landmarks[9].x - landmarks[0].x)) * 180 / Math.PI,
                    gesture: handResults.gestures[index][0].categoryName
                };
            }

            drawingUtils.drawConnectors(
                landmarks,
                GestureRecognizer.HAND_CONNECTIONS,
                {
                    color: "#FF0000",
                    lineWidth: 5
                }
            );
            drawingUtils.drawLandmarks(landmarks, {
                color: "#00FF00",
                lineWidth: 2
            });
        }

        if (leftHand) {
            if (leftHand.gesture === "Open_Palm") {
                if (soundOn) {
                    if (!chordPlaying) {
                        const now = Tone.now();
                      
                        chordSynth.map(a => { a.triggerRelease(); a.set({ volume: -1000 }) });
                        const [root, freqs, adj] = getNotes(leftHand.x, leftHand.y);
                        for (let [i, freq] of freqs.entries()) {
                        chordSynth[i].set({ volume: -20 });

                            chordSynth[i].triggerAttack(freq, now);
                        }
                        chordPlaying = root;
                        prevLeftRot = leftHand.rot;
                    } else {
                        if (slideToggle) {
                            const [root, freqs, adj] = getNotes(leftHand.x, leftHand.y);
                          
                            for (let [i, synth] of chordSynth.entries()) {
                            if (!freqs[i]) {
                                chordSynth[i].triggerRelease();
                                chordSynth[i].set({ volume: -1000 });
                                synth.oscillator.frequency.set(0);
                            } else if (synth.volume.value === -1000) {
                                const now = Tone.now();
                                chordSynth[i].set({ volume: -20 });
                                chordSynth[i].triggerAttack(freqs[i], now);
                            } else {
                                    chordSynth[i].oscillator.frequency.rampTo(freqs[i], 0.1);
                            }

                            }
                        }
                        // pitchShift.pitch = teoria.interval(root, chordPlaying).semitones() + (adj);
                    }
                }
            } else if (prevLeftGesture !== "Closed_Fist") {
                const now = Tone.now();
                chordSynth.map(a => { a.triggerRelease(); a.set({ volume: -1000 }) });
                chordPlaying = null;
            }
            // if (slideToggle) {
            //     const normal = Math.min(1, Math.max(-1, (leftHand.rot - prevLeftRot) / 60));
            //     console.log(leftHand.rot);
            //     if (Math.abs(normal) >= 0.05) {
            //         pitchShift.pitch = ((normal) * 2);
            //     }
            // }
            prevLeftGesture = leftHand.gesture;
        }

        ctx.restore();
    }

    window.requestAnimationFrame(() => predictWebcam(video, gestureRecognizer, ctx));
}