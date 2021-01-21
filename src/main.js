import * as THREE from 'three';
import { ARButton } from 'three/examples/jsm/webxr/ARButton.js';

let container;
let camera, scene, renderer;
let controller;

let reticle, panel;

let textureLoader;

let hitTestSource = null;
let hitTestSourceRequested = false;

init();
animate();

function init() {

    container = document.createElement('div');
    document.body.appendChild(container);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

    const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
    light.position.set(0.5, 1, 0.25);
    scene.add(light);

    //

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    container.appendChild(renderer.domElement);

    //

    document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

    //

    const geometry = new THREE.CylinderBufferGeometry(0.1, 0.1, 0.2, 32).translate(0, 0.1, 0);

    function onSelect() {

        if (reticle.visible) {

            const material = new THREE.MeshPhongMaterial({ color: 0xffffff * Math.random() });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.setFromMatrixPosition(reticle.matrix);
            mesh.scale.y = Math.random() * 2 + 1;
            scene.add(mesh);

        }

    }

    controller = renderer.xr.getController(0);
    controller.addEventListener('select', onSelect);
    scene.add(controller);

    reticle = new THREE.Mesh(
        new THREE.RingBufferGeometry(0.15, 0.2, 32).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial()
    );
    reticle.matrixAutoUpdate = false;
    reticle.visible = false;
    scene.add(reticle);

    panel = createPanel(.5);
    panel.matrixAutoUpdate = false;
    panel.visible = false;
    scene.add(panel);

    //
    try {
        textureLoader = new THREE.TextureLoader();
        textureLoader.load('./static/ksm-1.png', tex => {
            tex.flipY = true;
            panel.material.map = tex;
            panel.material.needsUpdate = true;
            panel.material.transparent = true;
        }, null, () => {
            log({ msg: key + " failed" });
        });
    } catch (e) {
        log({ msg: e.message });
    }
    window.addEventListener('resize', onWindowResize, false);

}


function createPanel(scale) {
    let geo = new THREE.PlaneGeometry(scale, scale),
        mat = new THREE.MeshBasicMaterial();
    return new THREE.Mesh(geo, mat);
}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

//

function animate() {

    renderer.setAnimationLoop(render);

}

function render(timestamp, frame) {

    if (frame) {

        const referenceSpace = renderer.xr.getReferenceSpace();
        const session = renderer.xr.getSession();

        if (hitTestSourceRequested === false) {

            session.requestReferenceSpace('viewer').then(function(referenceSpace) {

                session.requestHitTestSource({ space: referenceSpace }).then(function(source) {

                    hitTestSource = source;

                });

            });

            session.addEventListener('end', function() {

                hitTestSourceRequested = false;
                hitTestSource = null;

            });

            hitTestSourceRequested = true;

        }

        if (hitTestSource) {

            const hitTestResults = frame.getHitTestResults(hitTestSource);

            if (hitTestResults.length) {

                const hit = hitTestResults[0];

                //reticle.visible = true;
                let pose = hit.getPose(referenceSpace);
                reticle.matrix.fromArray(pose.transform.matrix);

                try {
                    panel.matrix.fromArray(pose.transform.matrix);
                    panel.visible = true;
                } catch (e) {
                    log({ error: e.message });
                }

            } else {

                panel.visible = false;
                reticle.visible = false;

            }

        }

    }

    renderer.render(scene, camera);

}

function log(msg) {
    document.querySelector(".debug").innerHTML += "<br/>" + JSON.stringify(msg);
}