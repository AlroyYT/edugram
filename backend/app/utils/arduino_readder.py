# import serial
# import threading
# import time

# latest_word = ""

# class ArduinoReader:
#     def __init__(self):
#         self.serial_connection = None
#         self.running = False

#     def connect(self):
#         try:
#             self.serial_connection = serial.Serial(
#                 '/dev/ttyACM0',  # Ubuntu
#                 9600,
#                 timeout=1
#             )

#             print("Arduino Connected")
#             self.running = True

#             thread = threading.Thread(
#                 target=self.read_loop,
#                 daemon=True
#             )

#             thread.start()

#         except Exception as e:
#             print("Arduino Error:", e)

#     def read_loop(self):
#         global latest_word

#         while self.running:
#             try:
#                 if self.serial_connection.in_waiting:

#                     word = (
#                         self.serial_connection
#                         .readline()
#                         .decode("utf-8")
#                         .strip()
#                     )

#                     if word:
#                         latest_word = word
#                         print("Received:", word)

#             except Exception as e:
#                 print(e)

#             time.sleep(0.05)


# arduino_reader = ArduinoReader()


# The below code is for testing purposes. Uncomment it to test the Arduino reader independently.
import threading
import time

latest_word = ""

class ArduinoReader:

    def connect(self):

        thread = threading.Thread(
            target=self.fake_loop,
            daemon=True
        )

        thread.start()

    def fake_loop(self):

        global latest_word

        words = [
            "HELLO",
            "MY",
            "NAME",
            "IS",
            "ANIKET"
        ]

        while True:

            for word in words:

                latest_word = word

                print("FAKE:", word)

                time.sleep(2)


arduino_reader = ArduinoReader()