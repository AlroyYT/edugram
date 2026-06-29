from django.urls import re_path
from .consumers import SignTextConsumer

print("========== ROUTING LOADED ==========")
websocket_urlpatterns = [
    re_path(
        r"ws/sign-text/$",
        SignTextConsumer.as_asgi()
    ),
]