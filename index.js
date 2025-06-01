import express from 'express'
import bodyParser from 'body-parser'
import axios from 'axios'
import mqtt from 'mqtt'

const app = express()
app.use(bodyParser.json())

const LINE_CHANNEL_ACCESS_TOKEN = 'es6rk7DN6x68kYi9n5xKutkmUOl8pKOAUs7k9i2oq1C0cyKT0JCtBr7AdEjr+ZEl3F4Sg8OCfzLcW2GyEDkQJH6a0czKl2NKyVCtUsGXV2aZCEV1i1TgNzYu2S62HEtM1sjAS9Yf2v8SUoV3LUJfewdB04t89/1O/w1cDnyilFU=' // ใส่ token ของคุณ
//Uab2c05636097d5b84c4d48c54479bab8
app.get('/', (req, res) => {
  res.send('Hello World')
})

app.get('/name', (req, res) => {
  res.send('KanapojPM')
})
// ฟังก์ชันแปลข้อความไทยเป็นอังกฤษด้วย Lingva Translate
async function translateThaiToEnglish(text) {
  const res = await axios.get('https://lingva.ml/api/v1/th/en/' + encodeURIComponent(text))
  return res.data.translation
}

app.post('/linebot', async (req, res) => {
  const events = req.body.events
  if (!events || events.length === 0) {
    return res.status(200).send('No events')
  }

  // ประมวลผลข้อความแต่ละ event
  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const replyToken = event.replyToken
      const userMessage = event.message.text
      console.log(JSON.stringify(event, null, 2))
      // ตัวอย่าง: ตอบกลับข้อความเดิม
      try {
        // แปลข้อความไทยเป็นอังกฤษ
        const translated = await translateThaiToEnglish(userMessage)

        await axios.post(
          'https://api.line.me/v2/bot/message/reply',
          {
            replyToken: replyToken,
            messages: [
              {
                type: 'text',
                text: `คุณพิมพ์ว่า: ${translated}`
              }
            ]
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
            }
          }
        )
      } catch (error) {
        console.error('LINE API error:', error.response?.data || error.message)
      }
    }
  }
  res.status(200).send('OK')
})

// API สำหรับ push message ไปหา user
app.post('/push', async (req, res) => {
  const { userId, message } = req.body
  if (!userId || !message) {
    return res.status(400).json({ error: 'userId and message are required' })
  }

  try {
    console.log(`Sending message to userId: ${userId}, message: ${message}`) // <-- Debug log
    await axios.post(
      'https://api.line.me/v2/bot/message/push',
      {
        to: userId,
        messages: [
          { type: 'text', text: message }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
        }
      }
    )
    res.json({ status: 'ok' })
  } catch (error) {
    console.error('LINE Push API error:', error.response?.data || error.message)
    res.status(500).json({ error: error.response?.data || error.message })
  }
})

// Connect to a broker with username and password
const mqttClient = mqtt.connect('ssl://98f1689fc70b4e9d9ccbb7f304e038f8.s1.eu.hivemq.cloud:8883', {
  username: 'KanapojPM', // <-- ใส่ username ที่นี่
  password: 'Punpun24012'  // <-- ใส่ password ที่นี่
})

// When connected
mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker')

  // Subscribe to all topics
  mqttClient.subscribe('water/test', (err) => {
    if (!err) {
      console.log('Subscribed to all topics')
    }
  })
})

// Replace USER_ID_HERE with your actual LINE userId
const LINE_USER_ID = 'Uab2c05636097d5b84c4d48c54479bab8'

// Receive messages
mqttClient.on('message', async (topic, message) => {
  const msg = message.toString()
  const text = `MQTT Topic: ${topic}\nMessage: ${msg}`

  try {
    await axios.post(
      'https://api.line.me/v2/bot/message/push',
      {
        to: LINE_USER_ID,
        messages: [
          { type: 'text', text }
        ]
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
        }
      }
    )
    console.log('Sent MQTT message to LINE user.')
  } catch (error) {
    console.error('Error sending MQTT message to LINE:', error.response?.data || error.message)
  }
})

app.listen(3000)