import {PLYLoader} from './ply-loader'
// import {SimplifyModifier} from 'three/examples/jsm/modifiers/SimplifyModifier.js'

/* globals NAF */
const objectGenerator = {
  schema: {
    apiKey: {type: 'string'},
    siteUrl: {type: 'string'},
    siteName: {type: 'string'},
  },

  init() {
    console.log('objectGenerator init')
    this.generateObject = this.generateObject.bind(this)
    this.objectUrl = null

    const generateBtn = document.getElementById('generateBtn')
    console.log('Grabbed generate button...')
    if (generateBtn) {
      console.log('Adding event listeners')
      generateBtn.addEventListener('click', async () => {
        console.log('genereate button clicked')
        const promptInput = document.getElementById('prompt')
        console.log(promptInput.value)
        if (promptInput && promptInput.value) {
          await this.generateObject(promptInput.value)
        }
      })
    }
  },

  async generateObject(prompt) {
    const response = await this.postToAPI(prompt)
    console.log(response)
    if (response?.generations && response.generations.length > 0) {
      const objUri = response.generations[0].uri
      const objLoader = new PLYLoader()

      objLoader.load(objUri, (geometry) => {
        // const modifier = new SimplifyModifier()
        const simplificationCount = 2000
        console.log('Object Loaded')
        // const simplifiedGeometry = modifier.modify(geometry, simplificationCount)
        geometry.computeVertexNormals()
        const material = new THREE.MeshStandardMaterial({vertexColors: true, flatShading: true})
        const mesh = new THREE.Mesh(geometry, material)

        const entityEl = document.createElement('a-entity')

        console.log('entity created')
        entityEl.setObject3D('mesh', mesh)

        entityEl.setAttribute('rotation', {x: -90, y: 180, z: 180})
        entityEl.setAttribute('networked', {
          template: 'object',
          persistent: true,
          owner: 'scene',
        })
        geometry.computeBoundingBox()  // Compute the bounding box of the geometry
        const bbox = geometry.boundingBox
        const height = bbox.max.y - bbox.min.y  // Calculate the height of the object

        const distance = 3  // Set the distance in front of the camera (you can adjust this value)

        const cameraEl = document.getElementById('camera')
        const cameraPosition = cameraEl.getAttribute('position')
        const cameraRotation = cameraEl.getAttribute('rotation')

        // Create a forwards vector and apply the camera's rotation
        const forwardVector = new THREE.Vector3(0, 0, -distance)
        forwardVector.applyQuaternion(
          new THREE.Quaternion().setFromEuler(
            new THREE.Euler(
              THREE.MathUtils.degToRad(cameraRotation.x),
              THREE.MathUtils.degToRad(cameraRotation.y),
              THREE.MathUtils.degToRad(cameraRotation.z),
              'YXZ'  // This is the default order A-Frame uses for rotations
            )
          )
        )

        // Calculate the final object position by adding the camera position and the rotated forward vector
        const finalPosition = new THREE.Vector3().addVectors(
          new THREE.Vector3(cameraPosition.x, cameraPosition.y, cameraPosition.z),
          forwardVector
        )

        // Move the entity above ground and set the position
        const heightAdjustment = height / 2
        const position = new THREE.Vector3(
          finalPosition.x,
          heightAdjustment,
          finalPosition.z
        )
        entityEl.setAttribute('position', position)
        console.log('taking ownership now...and adding to scene')
        // entityEl.setAttribute('owner', 'persistent: true; owner: scene')
        this.el.sceneEl.appendChild(entityEl)
        NAF.utils.takeOwnership(entityEl)

        console.log('appending to the scene')
      })
    }
  },

  async postToAPI(prompt) {
    const response = await fetch('https://openrouter.ai/api/v1/objects/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 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',
        'HTTP-Referer': 'https://8thwall.com/yanninour',
        'X-Title': '8th Wall',
      },
      body: JSON.stringify({
        prompt,
        num_inference_steps: 16,
        num_outputs: 1,
        extension: 'ply',
        model: 'openai/shap-e',
      }),
    })

    const json = await response.json()
    console.log(json)

    return json
  },
}

export {objectGenerator}
