import * as THREE from 'three';
import GLTFLoader from 'three-gltf-loader';
import OrbitControls from 'three-orbit-controls';
import * as THREEx from 'ar.js';
import riggedWolfGLTF from './rigged-wolf.gltf';
import wolfAlbedo from './img/wolf-albedo.png';
import wolfSpec from './img/wolf-spec.png';
import wolfNormal from './img/wolf-normal.png';

const ready = cb => {
  /in/.test(document.readyState) // in = loadINg
    ? setTimeout(ready.bind(null, cb), 9)
    : cb();
}

// Reset camera and renderer on resize
const windowResize = (renderer, camera) => {
  const [ windowWidth, windowHeight ] = [ window.innerWidth, window.innerHeight ];
  camera.aspect = windowWidth / windowHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(windowWidth, windowHeight);
};

ready(function() {
  console.log(THREEx.ArToolKitSource);
  let mixer;
  const clock = new THREE.Clock();
  const [ windowWidth, windowHeight ] = [ window.innerWidth, window.innerHeight ];
  // Set up renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(windowWidth, windowHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.gammaOutput = true;
  // renderer.vr.enabled = true;
  // renderer.vr.userHeight = 0;
  document.body.appendChild(renderer.domElement);
  // document.body.appendChild( WEBVR.createButton( renderer, { frameOfReferenceType: 'eye-level' } ) );

  // Set up scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xaaaaaa);

  // Add light to scene
  const hemlight = new THREE.HemisphereLight(0xfff0f0, 0x606066, 0.5);
  const spotlight = new THREE.SpotLight(0xffffff);
  hemlight.position.set(10, 10, 10);
  spotlight.position.set(10000, 10000, 10000);
  spotlight.castShadow = true;
  spotlight.shadow.bias = 0.0001;
  spotlight.shadow.mapSize.width = 2048;
  spotlight.shadow.mapSize.height = 2048;
  scene.add(hemlight);
  scene.add(spotlight);

  // Add camera
  const camera = new THREE.PerspectiveCamera(45, windowWidth / windowHeight, 1, 1000);
  camera.position.z = 400;

  // Controls
  const _orbitControls = OrbitControls(THREE);
  const controls = new _orbitControls(camera);

  // Update dimensions on resize
  window.onresize = () => windowResize(renderer, camera);

  // render scene
  const render = () => {
    controls.update();
    mixer.update(0.75 * clock.getDelta());
    if(arToolkitSource.ready){
      arToolkitContext.update(arToolkitSource.domElement);
    }
    scene.visible = camera.visible;
    renderer.render(scene, camera);
  }
  const animate = renderer => {
    renderer.setAnimationLoop(render);
  }

  // Prepare geometries and meshes
  const loader = new GLTFLoader();
  loader.load(riggedWolfGLTF, gltf => {
    const object = gltf.scene;
    const gltfAnimation = gltf.animations;
    object.rotateY(40);
    scene.add(object);
    object.traverse(node => {
      if(node.material && 'envMap' in node.material){
        console.log(node);
        const albedoTexture = new THREE.TextureLoader().load(wolfAlbedo);
        const normalTexture = new THREE.TextureLoader().load(wolfNormal);
        const specularityTexture = new THREE.TextureLoader().load(wolfSpec);
        node.material.normalMap = normalTexture;
        node.material.map = albedoTexture;
        node.material.lightMap = specularityTexture;
        node.material.envMap = null;
        node.material.needsUpdate = true;
        // node.material.wireframe = true;
      }
    });
    if(gltfAnimation && gltfAnimation.length) {
      mixer = new THREE.AnimationMixer(object);
      gltfAnimation.forEach(animation => {
        mixer.clipAction(animation).play();
        animate(renderer);
      });
    }
  });

  // AR.js
  const arToolkitSource = new THREEx.ArToolKitSource({
    sourceType: 'webcam'
  });
  arToolkitSource.init(function onReady() {
    arToolkitSource.copyElementSizeTo(renderer.domElement);
  });
  const arToolkitContext = new THREEx.ArToolKitContext({
    cameraParameterUrl: './camera_para.dat',
    detectionMode: 'mono',
  });
  arToolkitContext.init(function onCompleted(){
    camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
  });
  const markerControls = new THREEx.ArMarkerControls(arToolkitContext, camera, {
    type: 'pattern',
    patternUrl: './patt.hiro',
    changeMatrixMode: 'cameraTransformMatrix'
  });
  // scene.visible = false;
});
