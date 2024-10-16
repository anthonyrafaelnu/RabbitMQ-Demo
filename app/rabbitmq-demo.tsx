'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import io from 'socket.io-client'

const socket = io('http://localhost:3001');

export default function RabbitMQDemo() {
  const [message, setMessage] = useState('')
  const [sentMessage, setSentMessage] = useState('')
  const [receivedMessages, setReceivedMessages] = useState<string[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isReceivingEnabled, setIsReceivingEnabled] = useState(true)

  useEffect(() => {
    const handleNewMessage = (message: string) => {
      if (isReceivingEnabled) {
        setReceivedMessages(prev => [...prev, message])
      }
    }

    socket.on('newMessage', handleNewMessage)

    return () => {
      socket.off('newMessage', handleNewMessage)
    }
  }, [isReceivingEnabled])

  const connectToRabbitMQ = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:3001/connect', {
        method: 'POST',
      })
      if (response.ok) {
        setIsConnected(true)
      } else {
        throw new Error('Failed to connect')
      }
    } catch (error) {
      console.error('Error connecting to RabbitMQ:', error)
      alert('Failed to connect to RabbitMQ')
    } finally {
      setIsLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!isConnected) {
      alert('Please connect to RabbitMQ first')
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('http://localhost:3001/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      })
      if (response.ok) {
        setSentMessage(message)
        setMessage('')
      } else {
        throw new Error('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleReceiving = () => {
    setIsReceivingEnabled(!isReceivingEnabled)

    socket.emit('toggleReceiving', !isReceivingEnabled)
  }

  return (
    <div className="flex h-screen bg-gray-100 p-4 overflow-hidden w-[80%]">
      <div className="flex flex-col w-full max-w-7xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Demo de RabbitMQ :)</h1>
          <div className="flex items-center space-x-2">
            <Switch
              id="receiving-mode"
              checked={isReceivingEnabled}
              onCheckedChange={toggleReceiving}
            />
            <Label htmlFor="receiving-mode">
              {isReceivingEnabled ? 'Recibiendo mensajes' : 'Mensajes pausados'}
            </Label>
          </div>
        </div>
        <div className="flex space-x-4 h-[calc(100vh-100px)]">
          <Card className="w-1/2 flex flex-col">
            <CardHeader>
              <CardTitle>Mandar mensaje</CardTitle>
              <CardDescription>Conectarse a la cola y mandar mensaje</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="space-y-4">
                <Button 
                  onClick={connectToRabbitMQ} 
                  disabled={isConnected || isLoading}
                  className="w-full"
                >
                  {isConnected ? 'Conectado a RabbitMQ' : isLoading ? 'Conectando...' : 'Conectarse a RabbitMQ'}
                </Button>
                <Input
                  type="text"
                  placeholder="Escribir mensaje..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={!isConnected || isLoading}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-start space-y-4">
              <Button onClick={sendMessage} disabled={!isConnected || !message || isLoading}>
                {isLoading ? 'Mandando...' : 'Mandar mensaje'}
              </Button>
              {sentMessage && (
                <div className="text-sm">
                  <strong>Último mensaje enviado:</strong> {sentMessage}
                </div>
              )}
            </CardFooter>
          </Card>
          <Card className="w-1/2 flex flex-col">
            <CardHeader>
              <CardTitle>Mensajes recibidos</CardTitle>
              <CardDescription>Mensajes recibidos desde la cola de RabbitMQ</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow overflow-y-auto">
              <div className="space-y-2">
                {receivedMessages.map((msg, index) => (
                  <div key={index} className="bg-white p-2 rounded shadow">
                    {msg}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}