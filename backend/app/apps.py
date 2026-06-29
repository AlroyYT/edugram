from django.apps import AppConfig


class AppConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'app'

    def ready(self):
        try:
            from .utils.arduino_readder import arduino_reader

            arduino_reader.connect()

            print("Arduino reader initialized")

        except Exception as e:
            print(f"Arduino startup error: {e}")