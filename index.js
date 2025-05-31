import express from 'express'

const app = express()

app.get('/', (req, res) => {
  res.send('Hello World')
})
app.get('/name', (req, res) => {
  res.send('KanapojPM')
})
app.listen(3000)