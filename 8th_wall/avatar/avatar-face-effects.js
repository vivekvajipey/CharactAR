// ////////////////////////////
// AVATAR FACE EFFECTS COMPONENT
// ////////////////////////////
const avatarFaceComponent = () => {
    const avatarAnchorComponent = {
      schema: {
        mouthOpen: {type: 'number', default: 0},
        jawOpen: {type: 'number', default: 0},
        lipsClose: {type: 'number', default: 0},
        mouthL: {type: 'number', default: 0},
        mouthR: {type: 'number', default: 0},
        eyebrowL: {type: 'number', default: 0},
        eyebrowR: {type: 'number', default: 0},
      },
      init() {
        let id_ = null
        // lower lip
        this.lower = document.createElement('xrextras-face-attachment')
        this.lower.setAttribute('alignToSurface', 'true')
        this.lower.setAttribute('point', 'lowerLip')
        this.lower.id = 'lowerLip'
        this.el.appendChild(this.lower)
        // upper lip
        this.upper = document.createElement('xrextras-face-attachment')
        this.upper.setAttribute('alignToSurface', 'true')
        this.upper.setAttribute('point', 'upperLip')
        this.upper.id = 'upperLip'
        this.el.appendChild(this.upper)
        // mouth left
        this.mouthLeft = document.createElement('xrextras-face-attachment')
        this.mouthLeft.setAttribute('alignToSurface', 'true')
        this.mouthLeft.setAttribute('point', 'mouthLeftCorner')
        this.mouthLeft.id = 'mouthLeft'
        this.el.appendChild(this.mouthLeft)
        // mouth right
        this.mouthRight = document.createElement('xrextras-face-attachment')
        this.mouthRight.setAttribute('alignToSurface', 'true')
        this.mouthRight.setAttribute('point', 'mouthRightCorner')
        this.mouthRight.id = 'mouthRight'
        this.el.appendChild(this.mouthRight)
        // mouth center
        this.mouthCenter = document.createElement('xrextras-face-attachment')
        this.mouthCenter.setAttribute('alignToSurface', 'true')
        this.mouthCenter.setAttribute('point', 'mouth')
        this.mouthCenter.id = 'mouthCenter'
        this.el.appendChild(this.mouthCenter)
        // brow left
        this.browLeft = document.createElement('xrextras-face-attachment')
        this.browLeft.setAttribute('alignToSurface', 'true')
        this.browLeft.setAttribute('point', 'leftEyebrowMiddle')
        this.browLeft.id = 'browLeft'
        this.el.appendChild(this.browLeft)
        const show = ({detail}) => {
          if (id_ && detail.id !== id_) {
            return
          }
          id_ = detail.id
          const {position, rotation, scale} = detail.transform
          this.el.object3D.visible = true
          this.el.object3D.position.copy(position)
          this.el.object3D.quaternion.copy(rotation)
          this.el.object3D.scale.set(scale, scale, scale)
        }
        const hide = ({detail}) => {
          id_ = null
          this.el.object3D.visible = false
        }
        this.el.sceneEl.addEventListener('xrfacefound', show)
        this.el.sceneEl.addEventListener('xrfaceupdated', show)
        this.el.sceneEl.addEventListener('xrfacelost', hide)
      },
      tick() {
        const blendAmt = function (value, min, max) {
          return (value - min) / (max - min)
        }
        // distance between upper and lower lips
        const mouthYDist = this.upper.object3D.position.y - this.lower.object3D.position.y
        const mouthXDist = this.mouthLeft.object3D.position.x - this.mouthRight.object3D.position.x
        const mouthLeftYDist = this.mouthLeft.object3D.position.y - this.mouthCenter.object3D.position.y
        this.data.mouthOpen = blendAmt(mouthYDist, 0, 0.25)
        const mouthFunnelAmt = blendAmt(mouthXDist, 0.45, 0.25)
        const mouthSmileAmt = blendAmt(mouthLeftYDist, 0, 0.1)
        this.data.eyebrowL = blendAmt(this.browLeft.object3D.position.y, 0.14, 0.19)
        if (this.data.mouthOpen > 0.175) {
          this.data.jawOpen = +this.data.mouthOpen / 4  // blend the jawOpen and mouthOpen values
          this.data.lipsClose = 0
        } else {
          this.data.jawOpen = 0
          this.data.lipsClose = 0.2
        }
        this.el.children[0].setAttribute('gltf-morph__mouth', {
          morphtarget: 'mouthOpen',
          value: this.data.mouthOpen,
        })
        this.el.children[0].setAttribute('gltf-morph__jaw', {
          morphtarget: 'jawOpen',
          value: this.data.jawOpen,
        })
        this.el.children[0].setAttribute('gltf-morph__mouthClose', {
          morphtarget: 'mouthClose',
          value: this.data.lipsClose,
        })
        this.el.children[0].setAttribute('gltf-morph__mouthSmile', {
          morphtarget: 'mouthSmile',
          value: mouthSmileAmt,
        })
        this.el.children[0].setAttribute('gltf-morph__mouthFunnel', {
          morphtarget: 'mouthFunnel',
          value: mouthFunnelAmt,
        })
        // eyebrows //
        this.el.children[0].setAttribute('gltf-morph__browLeft', {
          morphtarget: 'browInnerUp',
          value: this.data.eyebrowL,
        })
        this.el.children[0].setAttribute('gltf-morph__browOuterUpLeft', {
          morphtarget: 'browOuterUpLeft',
          value: this.data.eyebrowL,
        })
        this.el.children[0].setAttribute('gltf-morph__browOuterUpRight', {
          morphtarget: 'browOuterUpRight',
          value: this.data.eyebrowL,
        })
      },
    }
    const gltfMorphComponent = {
      multiple: true,
      schema: {
        morphtarget: {type: 'string', default: ''},
        value: {type: 'number', default: 0},
      },
      init() {
        this.el.addEventListener('object3dset', () => {
          this.morpher()
        })
      },
      update() {
        this.morpher()
      },
      morpher() {
        const mesh = this.el.object3D
        mesh.traverse((o) => {
          if (o.morphTargetInfluences && o.userData.targetNames) {
            const pos = o.userData.targetNames.indexOf(this.data.morphtarget)
            o.morphTargetInfluences[pos] = this.data.value
          }
        })
      },
    }
    return {
      'avatar-anchor': avatarAnchorComponent,
      'gltf-morph': gltfMorphComponent,
    }
  }
  export {avatarFaceComponent}
  