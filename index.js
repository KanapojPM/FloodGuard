import express from 'express'
import bodyParser from 'body-parser'
import axios from 'axios'

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

app.get('/trans', async (req, res) => {
  const text = req.query.text
  if (!text) {
    return res.status(400).json({ error: 'Missing text parameter' })
  }
  try {
    const response = await axios.get('https://lingva.ml/api/v1/th/en/' + encodeURIComponent(text))
    res.json({ translation: response.data.translation })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
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
                type: 'flex',
                altText: 'This is a Flex Message',
                contents: {
                  type: 'bubble',
                  hero: {
                    type: 'image',
                    url: 'https://cdn.pixabay.com/photo/2024/05/31/18/54/meme-8801100_960_720.png', // URL รูปภาพ
                    size: 'full',
                    aspectRatio: '20:13',
                    aspectMode: 'cover'
                  },
                  body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                      {
                        type: 'text',
                        text: 'Flex Message Example',
                        weight: 'bold',
                        size: 'xl'
                      },
                      {
                        type: 'text',
                        text: `คุณพิมพ์ว่า: ${userMessage}`,
                        margin: 'md',
                        wrap: true
                      }
                    ]
                  },
                  footer: {
                    type: 'box',
                    layout: 'vertical',
                    spacing: 'sm',
                    contents: [
                      {
                        type: 'button',
                        style: 'primary',
                        action: {
                          type: 'uri',
                          label: 'Visit Website',
                          uri: 'https://www.roblox.com/home'
                        }
                      }
                    ]
                  }
                }
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

app.listen(3000)