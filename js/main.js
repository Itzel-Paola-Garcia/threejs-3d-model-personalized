import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

let camera, scene, renderer, stats, object, loader, guiMorphsFolder;
const clock = new THREE.Clock();
let mixer;
const cones = [];

const params = {
    asset: 'Idle'
};

const assets = [
    'Idle',
    'Walking',
    'Walk In Circle',
    'Running',
    'Shuffling',
    'Kick Soccerball'
];

init();

function init() {
    const container = document.createElement('div');
    document.body.appendChild(container);

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(100, 200, 300);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x067006);
    scene.fog = new THREE.Fog(0x521f0a, 200, 1000);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 5);
    hemiLight.position.set(0, 200, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 5);
    dirLight.position.set(0, 200, 100);
    dirLight.castShadow = true;
    dirLight.shadow.camera.top = 180;
    dirLight.shadow.camera.bottom = -100;
    dirLight.shadow.camera.left = -120;
    dirLight.shadow.camera.right = 120;
    scene.add(dirLight);

    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshPhongMaterial({ color: 0x5e400c, depthWrite: false }));
    mesh.rotation.x = -Math.PI / 2;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const grid = new THREE.GridHelper(2000, 20, 0x000000, 0x000000);
    grid.material.opacity = 0.2;
    grid.material.transparent = true;
    scene.add(grid);

    loader = new FBXLoader();
    loadAsset(params.asset);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 100, 0);
    controls.update();

    window.addEventListener('resize', onWindowResize);

    stats = new Stats();
    container.appendChild(stats.dom);

    const gui = new GUI();
    gui.add(params, 'asset', assets).onChange(function (value) {
        loadAsset(value);
    });

    guiMorphsFolder = gui.addFolder('Morphs').hide();

    document.addEventListener('keydown', onDocumentKeyDown);

    const geometry = new THREE.ConeGeometry(20, 30, 20, 10);
    const material = new THREE.MeshPhongMaterial({ color: 0xd6f50c, flatShading: true });

    for (let i = 0; i < 1000; i++) {
        const cone = new THREE.Mesh(geometry, material);
        cone.position.x = Math.random() * 1600 - 800;
        cone.position.y = Math.random() * 1600 - 800; // Altura del cono
        cone.position.z = Math.random() * 1600 - 800;
        cone.castShadow = true;
        cone.receiveShadow = true;
        cones.push(cone);
        scene.add(cone);
    }
}

function loadAsset(asset) {
    loader.load('models/fbx/' + asset + '.fbx', function (group) {
        if (object) {
            object.traverse(function (child) {
                if (child.material) child.material.dispose();
                if (child.material && child.material.map) child.material.map.dispose();
                if (child.geometry) child.geometry.dispose();
            });
            scene.remove(object);
        }

        object = group;

        if (object.animations && object.animations.length) {
            mixer = new THREE.AnimationMixer(object);
            const action = mixer.clipAction(object.animations[0]);
            action.play();
        } else {
            mixer = null;
        }

        guiMorphsFolder.children.forEach((child) => child.destroy());
        guiMorphsFolder.hide();

        object.traverse(function (child) {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;

                if (child.morphTargetDictionary) {
                    guiMorphsFolder.show();
                    const meshFolder = guiMorphsFolder.addFolder(child.name || child.uuid);
                    Object.keys(child.morphTargetDictionary).forEach((key) => {
                        meshFolder.add(child.morphTargetInfluences, child.morphTargetDictionary[key], 0, 1, 0.01);
                    });
                }
            }
        });

        scene.add(object);
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    const delta = clock.getDelta();

    if (mixer) mixer.update(delta);

    checkCollisions();
    renderer.render(scene, camera);
    stats.update();
}

function onDocumentKeyDown(event) {
    const keyCode = event.which;
    const moveDistance = 10;

    if (object) {
        switch (keyCode) {
            case 87: // W
                object.position.z -= moveDistance;
                break;
            case 83: // S
                object.position.z += moveDistance;
                break;
            case 65: // A
                object.position.x -= moveDistance;
                break;
            case 68: // D
                object.position.x += moveDistance;
                break;
        }
    }
}

function checkCollisions() {
    if (!object) return;

    const objectBox = new THREE.Box3().setFromObject(object);

    cones.forEach(cone => {
        const coneBox = new THREE.Box3().setFromObject(cone);

        if (objectBox.intersectsBox(coneBox)) {
            // Mover el cono en una dirección aleatoria en el eje X o Z
            cone.position.x += Math.random() * 10 - 5;
            cone.position.z += Math.random() * 10 - 5;
        }
    });
}
