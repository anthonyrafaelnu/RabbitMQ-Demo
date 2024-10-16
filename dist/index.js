"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const amqplib_1 = __importDefault(require("amqplib"));
const cors_1 = __importDefault(require("cors"));
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});
const port = 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
let channel = null;
let connection = null;
let isReceivingEnabled = true;
function connectToRabbitMQ() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            connection = yield amqplib_1.default.connect('amqp://localhost');
            channel = yield connection.createChannel();
            yield channel.assertQueue('demo_queue');
            console.log('Conectado a RabbitMQ');
            // Start consuming messages
            channel.consume('demo_queue', (msg) => {
                if (msg !== null) {
                    const message = msg.content.toString();
                    console.log("Received message:", message);
                    if (isReceivingEnabled) {
                        io.emit('newMessage', message);
                        channel === null || channel === void 0 ? void 0 : channel.ack(msg);
                    }
                    else {
                        // Requeue the message if receiving is disabled
                        channel === null || channel === void 0 ? void 0 : channel.nack(msg, false, true);
                    }
                }
            });
        }
        catch (error) {
            console.error('Error al conectar a RabbitMQ:', error);
        }
    });
}
app.post('/connect', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (!channel) {
        yield connectToRabbitMQ();
    }
    res.json({ message: 'Conectado a RabbitMQ' });
}));
app.post('/send', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { message } = req.body;
    if (!channel) {
        res.status(400).json({ error: 'No se pudo conectar a RabbitMQ' });
        return;
    }
    channel.sendToQueue('demo_queue', Buffer.from(message));
    res.json({ message: 'Mensaje enviado correctamente' });
}));
io.on('connection', (socket) => {
    console.log('Se contectó un usuario');
    socket.on('toggleReceiving', (enabled) => {
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
process.on('SIGINT', () => __awaiter(void 0, void 0, void 0, function* () {
    if (channel)
        yield channel.close();
    if (connection)
        yield connection.close();
    process.exit(0);
}));
//# sourceMappingURL=index.js.map