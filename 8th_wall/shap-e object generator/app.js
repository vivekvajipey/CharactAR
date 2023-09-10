// Copyright (c) 2022 8th Wall, Inc.
//
// app.js is the main entry point for your 8th Wall app. Code here will execute after head.html
// is loaded, and before body.html is loaded.

import './index.css'

import {avatarMoveComponent, swapCamComponent, avatarRecenterComponent} from './components/components'
import {Inworld} from 'inworld'

window.Inworld = Inworld

import {inworldComponent} from './ai/inworld'
AFRAME.registerComponent('inworld', inworldComponent())

AFRAME.registerComponent('avatar-move', avatarMoveComponent)
AFRAME.registerComponent('avatar-recenter', avatarRecenterComponent)
AFRAME.registerComponent('swap-camera', swapCamComponent())

import {responsiveImmersiveComponent} from './components/responsive-immersive'
AFRAME.registerComponent('responsive-immersive', responsiveImmersiveComponent)

import {receiveMessage} from './avatar/avatar-instantiate'
window.addEventListener('message', receiveMessage, false)

import {avatarFaceComponent} from './avatar/avatar-face-effects'
const registerComponents = components => Object.keys(components).map(k => AFRAME.registerComponent(k, components[k]))
registerComponents(avatarFaceComponent())

import {animationRigComponent} from './avatar/rig-animation.js'
AFRAME.registerComponent('rig-animation', animationRigComponent)

// Force 8thwall to request mic permissions on load as well
const onxrloaded = () => {
  XR8.addCameraPipelineModule({
    name: 'microphone',
    requiredPermissions: () => ([XR8.XrPermissions.permissions().MICROPHONE]),
  })
}
window.XR8 ? onxrloaded() : window.addEventListener('xrloaded', onxrloaded)

AFRAME.registerComponent('follow-avatar', {
  tick() {
    const model = document.getElementById('avatar')
    const modelPosition = model.object3D.position
    const img = document.querySelector('a-image')
    if (img) {
      img.setAttribute('position',
        `${modelPosition.x + 1} ${modelPosition.y + 4.5} ${modelPosition.z}`)
    }
  },
})