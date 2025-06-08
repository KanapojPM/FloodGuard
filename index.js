import express from 'express'
import bodyParser from 'body-parser'
import axios from 'axios'
import mqtt from 'mqtt'

const app = express()
app.use(bodyParser.json())

const LINE_CHANNEL_ACCESS_TOKEN = 'es6rk7DN6x68kYi9n5xKutkmUOl8pKOAUs7k9i2oq1C0cyKT0JCtBr7AdEjr+ZEl3F4Sg8OCfzLcW2GyEDkQJH6a0czKl2NKyVCtUsGXV2aZCEV1i1TgNzYu2S62HEtM1sjAS9Yf2v8SUoV3LUJfewdB04t89/1O/w1cDnyilFU=' // ใส่ token ของคุณ

app.get('/', (req, res) => {
  res.send('Hello World')
})

app.get('/name', (req, res) => {
  res.send('KanapojPM')
})

app.post('/linebot', async (req, res) => {
  const events = req.body.events
  if (!events || events.length === 0) {
    return res.status(200).send('No events')
  }

  for (const event of events) {
    if (event.type === 'message' && event.message.type === 'text') {
      const replyToken = event.replyToken
      const userMessage = event.message.text.trim()

      if (userMessage === 'ปิดไฟ') {
        mqttClient.publish('light/status', 'off')
        await axios.post(
          'https://api.line.me/v2/bot/message/reply',
          {
            replyToken: replyToken,
            messages: [
              { type: 'text', text: 'สั่งปิดไฟเรียบร้อย' }
            ]
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
            }
          }
        )
      } else if (userMessage === 'เปิดไฟ') {
        mqttClient.publish('light/status', 'on')
        await axios.post(
          'https://api.line.me/v2/bot/message/reply',
          {
            replyToken: replyToken,
            messages: [
              { type: 'text', text: 'สั่งเปิดไฟเรียบร้อย' }
            ]
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`
            }
          }
        )
      }
      // ไม่ต้องตอบกลับกรณีอื่น
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
    console.log(`Sending message to userId: ${userId}, message: ${message}`)
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
  username: 'KanapojPM',
  password: 'Punpun24012'
})

mqttClient.on('connect', () => {
  console.log('Connected to MQTT broker')
  // Subscribe to all topics if needed
  // mqttClient.subscribe('#', (err) => {
  //   if (!err) {
  //     console.log('Subscribed to all topics')
  //   }
  // })
  mqttClient.subscribe('water/alarm', (err) => {
    if (!err) {
      console.log('Subscribed to water/alarm topics')
    }
  })
})

// Replace USER_ID_HERE with your actual LINE userId
const LINE_USER_ID = 'Uab2c05636097d5b84c4d48c54479bab8'

// Receive messages from MQTT and send to LINE
mqttClient.on('message', async (topic, message) => {
  const jsonObj = JSON.parse(message.toString());
  let msg;

  if (topic === 'water/alarm') {
    if(jsonObj.status === 'NORMAL') {
      msg = {
        type: 'text',
        text: `✅ สถานะปกติ เมื่อ ${jsonObj.timestamp}`
      }
    }
    if(jsonObj.status === 'WARNING') {
      msg = {
        type: 'text',
        text: `⚠️ แจ้งเตือนน้ำสูงอยู่ในระดับเฝ้าระวัง! เมื่อ ${jsonObj.timestamp}`
      }
    }
    if(jsonObj.status === 'CRITICAL') {
      msg = {
        type: 'template',
        altText: '🚨 แจ้งเตือนน้ำท่วม!',
        template: {
          type: "confirm",
          text: "🚨 แจ้งเตือนน้ำท่วม! คุณต้องการตัดไฟใช่หรือไม่?",
          actions: [
            {
              type: "message",
              label: "ตัดไฟ",
              text: "ปิดไฟ"
            },
            {
              type: "message",
              label: "ยกเลิก",
              text: "เปิดไฟ"
            }
          ]
        }
      } 
    }
    //text = `🚨 แจ้งเตือนน้ำท่วม! ข้อความ: ${jsonObj.status} เมื่อ ${jsonObj.timestamp}`
  } else {
    text = `MQTT Topic: ${topic}\nMessage: ${message.toString()}`
  }

  try {
    await axios.post(
      'https://api.line.me/v2/bot/message/push',
      {
        to: LINE_USER_ID,
        messages: [
          msg || { type: 'text', text: `Received message on topic ${topic}: ${message.toString()}` }  
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