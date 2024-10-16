import express from 'express';
import amqp from 'amqplib';
import cors from 'cors';
import { Server } from 'socket.io';
import http from 'http';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const port = 3001;

app.use(cors());
app.use(express.json());

let channel: amqp.Channel | null = null;
let connection: amqp.Connection | null = null;
let isReceivingEnabled = true;

async function connectToRabbitMQ(): Promise<void> {
  try {
    connection = await amqp.connect('amqp://localhost');
    channel = await connection.createChannel();
    await channel.assertQueue('demo_queue');
    console.log('Conectado a RabbitMQ');

    channel.consume('demo_queue', (msg) => {
      if (msg !== null) {
        const message = msg.content.toString();
        console.log("Received message:", message);
        if (isReceivingEnabled) {
          io.emit('newMessage', message);
          channel?.ack(msg);
        } else {
          channel?.nack(msg, false, true);
        }
      }
    });
  } catch (error) {
    console.error('Error al conectar a RabbitMQ:', error);
  }
}

app.post('/connect', async (req, res) => {
  if (!channel) {
    await connectToRabbitMQ();
  }
  res.json({ message: 'Conectado a RabbitMQ' });
});

app.post('/send', async (req, res) => {
  const { message } = req.body;
  if (!channel) {
    res.status(400).json({ error: 'No se pudo conectar a RabbitMQ' });
    return;
  }
  channel.sendToQueue('demo_queue', Buffer.from(message));
  res.json({ message: 'Mensaje enviado correctamente' });
});

io.on('connection', (socket) => {
  console.log('Se contectó un usuario');

  socket.on('toggleReceiving', (enabled: boolean) => {
    isReceivingEnabled = enabled;
    console.log(`La recepción de mensajes están ${enabled ? 'activados' : 'desactivados'}`);
  });

  socket.on('disconnect', () => {
    console.log('Usuario desconectado');
  });
});

server.listen(port, () => {
  console.log(`Servidor corriendo en: http://localhost:${port}`);
});

process.on('SIGINT', async () => {
  if (channel) await channel.close();
  if (connection) await connection.close();
  process.exit(0);
});