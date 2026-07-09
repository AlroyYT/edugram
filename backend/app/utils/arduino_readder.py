import serial
import serial.tools.list_ports
import threading
import time

latest_word = ""


class ArduinoReader:
    def __init__(self):
        self.serial_connection = None
        self.running = False
        self.last_word = ""

    def find_arduino_port(self):
        """
        Automatically detect Arduino on Windows, Linux and macOS.
        """

        ports = serial.tools.list_ports.comports()

        for port in ports:
            description = (port.description or "").lower()
            manufacturer = (port.manufacturer or "").lower()
            device = port.device.lower()

            if (
                "arduino" in description
                or "arduino" in manufacturer
                or "ch340" in description
                or "cp210" in description
                or "usb serial" in description
                or "ttyacm" in device
                or "ttyusb" in device
                or "com" in device
            ):
                return port.device

        return None

    def connect(self):
        """
        Starts a background thread that continuously looks for an Arduino.
        """
        if self.running:
            return

        self.running = True

        thread = threading.Thread(
            target=self.connection_manager,
            daemon=True,
        )

        thread.start()

    def connection_manager(self):
        while self.running:

            # Already connected
            if self.serial_connection and self.serial_connection.is_open:
                time.sleep(2)
                continue

            try:
                port = self.find_arduino_port()

                if port is None:
                    print("Waiting for Arduino...")
                    time.sleep(3)
                    continue

                print(f"Detected Arduino on {port}")

                self.serial_connection = serial.Serial(
                    port,
                    9600,
                    timeout=1,
                )

                print("Arduino Connected")

                read_thread = threading.Thread(
                    target=self.read_loop,
                    daemon=True,
                )

                read_thread.start()

            except Exception as e:
                print(f"Connection Error: {e}")
                time.sleep(3)

    def read_loop(self):
        global latest_word

        while self.running:

            try:
                if (
                    self.serial_connection is None
                    or not self.serial_connection.is_open
                ):
                    break

                if self.serial_connection.in_waiting:

                    raw_data = (
                        self.serial_connection.readline()
                        .decode("utf-8", errors="ignore")
                        .strip()
                    )

                    if not raw_data:
                        continue

                    # Ignore startup banner
                    if "|" not in raw_data:
                        continue

                    parts = [part.strip() for part in raw_data.split("|")]

                    # Expected:
                    # Analog Values | Digital Values | Gesture
                    if len(parts) < 3:
                        continue

                    gesture = parts[-1].strip()

                    # Ignore table header
                    if gesture.upper() == "GESTURE":
                        continue

                    # Ignore separator lines
                    if gesture == "" or set(gesture) == {"-"}:
                        continue

                    # Ignore duplicate consecutive gestures
                    if gesture == self.last_word:
                        continue

                    self.last_word = gesture
                    latest_word = gesture

                    print(f"Gesture: {gesture}")

                time.sleep(0.05)

            except serial.SerialException:
                print("Arduino Disconnected")

                try:
                    self.serial_connection.close()
                except:
                    pass

                self.serial_connection = None
                self.last_word = ""
                break

            except Exception as e:
                print(f"Read Error: {e}")
                time.sleep(1)


arduino_reader = ArduinoReader()

# The below code is for testing purposes. Uncomment it to test the Arduino reader independently.
# import threading
# import time

# latest_word = ""

# class ArduinoReader:

#     def connect(self):

#         thread = threading.Thread(
#             target=self.fake_loop,
#             daemon=True
#         )

#         thread.start()

#     def fake_loop(self):

#         global latest_word

#         words = [
#             "HELLO",
#             "MY",
#             "NAME",
#             "IS",
#             "ANIKET"
#         ]

#         while True:

#             for word in words:

#                 latest_word = word

#                 print("FAKE:", word)

#                 time.sleep(2)


# arduino_reader = ArduinoReader()