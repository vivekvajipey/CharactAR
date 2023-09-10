// const model = document.getElementById("avatar")
// model.setAttribute("rig-animation", {
//   "clip": "Talking"
// })
import {Models, Chat, Image} from 'openai'

const inworldComponent = () => ({
  async init() {
    const params = new URLSearchParams(document.location.search.substring(1))
    const transcription = params.get('transcription') ? params.get('transcription') : 'You are a friendly person.'
    console.log('Inworld Init')
    this.sendButton = document.getElementById('ask')
    this.micButton = document.getElementById('record')
    this.textBox = document.getElementById('question')
    this.textBox.value = transcription
    const {sceneEl} = this.el
    console.log('Listeners added, waiting on reveal')
    this.isRecording = false
    // window.inworldClient.sendText('Your Name is Barack Obama, the former President. As my friend, I need you to pretend you are Barack Obama, the President, and talk in his style.')

    console.log('Reveal listener added.')
    this.sendButton.addEventListener('click', this.sendText.bind(this))
    this.micButton.addEventListener('click', this.toggleRecording.bind(this))
    this.textBox.addEventListener('keypress', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault()
        this.sendText()
      }
    })
    // this.el.sceneEl.addEventListener('inworld-history', this.onHistory.bind(this))
    this.generateObject = this.generateObject.bind(this)
    window.inworldClient = new window.Inworld({
      playerName: 'Friend',
      onHistoryChange: async (history) => {
        const latestHistory = history[history.length - 1]
        if (latestHistory.type === 'interaction_end') {
          console.log('Interaction Ended', JSON.stringify(latestHistory))
          // Find the section of history since the last interaction ended
          const sectionSinceLastInteraction = []
          for (let i = history.length - 2; i >= 0; i--) {
            if (history[i].type === 'interaction_end') {
              break
            }
            sectionSinceLastInteraction.unshift(history[i])
          }
          const image = document.querySelector('a-image')
          if (image) {
            image.setAttribute('visible', 'false')
          }
          // Now 'sectionSinceLastInteraction' contains the history since the last interaction ended
          const textWithTag = sectionSinceLastInteraction.map((entry) => {
            if (entry.source && entry.source.isPlayer) {
              return {text: entry.text, tag: 'user'}
            } else {
              return {text: entry.text, tag: 'assistant'}
            }
          })
          const prompt = await this.createChat(JSON.stringify(textWithTag))
          console.log('PROMPT:', prompt)

          await this.generateObject(prompt)
          this.isTalking = false
          console.log('user finished talking')
        } else if (latestHistory.type === 'actor' && latestHistory.source.isCharacter) {
          console.log('TALKING NOW')
          this.isTalking = true
          console.log('avatar starts talking')

          const imageExists = document.querySelector('a-image')
          if (!imageExists) {
            const scene = document.querySelector('a-scene')
            const image = document.createElement('a-image')
            image.setAttribute('src', 'https://static.8thwall.app/assets/speech-7mw4vic9s4.png')
            image.setAttribute('follow-avatar', '')
            scene.appendChild(image)
          } else {
            imageExists.setAttribute('visible', 'true')
          }
        }
        sceneEl.dispatchEvent(new CustomEvent('inworld-history', {detail: latestHistory}))
      },
      onLoaded() {
        console.log('Client Built')
        // window.inworldClient.sendText('Your Name is Barack Obama, the former President. As my friend, I need you to pretend you are barack obama, the president, and talk in his style.')
      },
      onReady() {
        console.log('Client Open')
      },
      onDisconnect() {
        console.log('Client Closed or Paused')
      },
      onMessage(evt) {
        // Currently just fire the entire event and check it in the listener
        sceneEl.dispatchEvent(new CustomEvent('inworld-message', {detail: evt}))
        // console.log('MESSAGE', JSON.stringify(evt))
      },
      onPhoneme(evt) {
        sceneEl.dispatchEvent(new CustomEvent('inworld-phoneme', {detail: evt}))
      },
    })
    await window.inworldClient.connect()
    console.log('Connection Call Made')
  },
  sendText() {
    window.inworldClient.sendText(this.textBox.value)
    this.textBox.value = ''
  },
  async toggleRecording() {
    console.log('Recording toggled.')
    this.micButton.classList.add('processing')
    await new Promise((resolve) => {
      setTimeout(resolve, 500)
    })
    this.isRecording = !this.isRecording
    if (this.isRecording) {
      try {
        await window.inworldClient.startRecording()
        this.micButton.classList.remove('processing')
        this.micButton.classList.add('recording')
        this.micButton.textContent = 'Stop Recording'
      } catch (e) {
        this.isRecording = false
      }
    } else {
      window.inworldClient.stopRecording()
      this.micButton.classList.remove('processing')
      this.micButton.classList.remove('recording')
      this.micButton.textContent = 'Start Recording'
      console.log('Start Recording Again')
    }
  },
  async generateObject(prompt) {
    try {
      const response = await fetch('https://charactar.ngrok.io/generation', {
        method: 'POST',
        headers: {
          'X-API-Key': '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          num_outputs: 1,
          num_inference_steps: 64,
        }),
      })
      if (response.ok) {
        const data = await response.json()
        // console.log(data)
        const base64Glb = data[0].uri.split('base64,')[1]
        const entity = await this.createEntityFromBase64Glb(base64Glb)
        const scene = document.querySelector('a-scene')
        scene.appendChild(entity)
        // console.log(base64Glb)
      } else {
        console.error('Fetch request failed with status:', response.status)
      }
    } catch (error) {
      console.error('An error occurred during the fetch request:', error)
    }
  },

  async createEntityFromBase64Glb(base64Glb) {
  // Convert base64 GLB to a Blob
    const glbBuffer = atob(base64Glb)
    const glbArrayBuffer = new ArrayBuffer(glbBuffer.length)
    const glbView = new Uint8Array(glbArrayBuffer)
    console.log('Creating buffer.')
    for (let i = 0; i < glbBuffer.length; i++) {
      glbView[i] = glbBuffer.charCodeAt(i)
    }
    const glbBlob = new Blob([glbArrayBuffer], {type: 'model/gltf-binary'})
    // Create a Blob URL
    const glbUrl = URL.createObjectURL(glbBlob)
    const avatarEl = document.getElementById('avatar')
    const avatarPosition = avatarEl.getAttribute('position')

    // Create a new a-entity and set its gltf-model src attribute
    const entity = document.createElement('a-entity')
    entity.setAttribute('rotation', {x: -90, y: 180, z: 180})
    entity.setAttribute('scale', {x: 3, y: 3, z: 3})
    entity.setAttribute('gltf-model', glbUrl)

    entity.addEventListener('model-loaded', () => {
      const boundingBox = new THREE.Box3().setFromObject(entity.object3D)
      const height = boundingBox.max.y - boundingBox.min.y

      // Set the position of the entity based on the position of the avatar object
      entity.setAttribute('position', {
        x: avatarPosition.x,
        y: height / 2 + 0.2,
        z: avatarPosition.z,
      })
    })

    return entity
  },
  async createChat(prompt) {
    console.log('createChat ran')
    const chatCompletionResponse = await Chat.createChatCompletions({
      model: 'gpt-4',
      messages: [
        {
          'role': 'system',
          'content': 'You are an AI 3D Object Generator that given a conversation chooses an object to generate that represents a single key aspect of that conversation. You cannot select the speaker as the word. Respond in 8 words or less that describe an object to be generated, be vivid, specific, and concise. Pick up on colors, attributes, and adjectives.',
        },
        {
          'role': 'user',
          'content': `${prompt} In the conversation above create an specific object generation prompt for the most important object to generate. ONLY RESPOND WITH THE TEXT TO BE ENTERED INTO THE OBJECT GENERATOR. No additional words or commentary. 
          
          Example: Conversation with Barack Obama - Prompt should be: (White House, Magestic, White, Grand) or (Bald Eagle, Bird, Wings) or American Flag or (Presidental Podium, Brown)
          Conversation with Justin Beiber - Prompt should be: (Microphone, Black) or (Music Notes, Big, Music) or Piano
          Conversation with Elon Musk - (Spaceship, RocketShip, Thrusters, Red) or (Electric Car, Sports Car, Tesla) or (Money, Cash, Green) or (Mars Landscape, Desert, Mars, Red)`,
        }],
    })
    console.log(chatCompletionResponse)
    return chatCompletionResponse.choices[0].message.content
  },
})

export {inworldComponent}
