import json
import asyncio

from channels.generic.websocket import AsyncWebsocketConsumer

from .utils.arduino_readder import latest_word

print("========== CONSUMER LOADED ==========")
class SignTextConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        await self.accept()

        self.task = asyncio.create_task(
            self.send_words()
        )

    async def disconnect(self, close_code):
        self.task.cancel()

    async def send_words(self):

        last_sent = ""

        while True:

            from .utils.arduino_readder import latest_word

            if latest_word and latest_word != last_sent:

                await self.send(
                    text_data=json.dumps({
                        "word": latest_word
                    })
                )

                last_sent = latest_word

            await asyncio.sleep(0.1)